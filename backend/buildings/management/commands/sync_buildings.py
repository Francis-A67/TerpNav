import json
import re
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from buildings.campuses import CAMPUSES, campus_data_dir
from buildings.models import Building, BUILDING_TYPES, ParkingLot

# UMD structures that aren't destinations anyone navigates to: utility/ops
# facilities, unnamed entries, stadium concessions, campus gates, and
# housing entries with no distinguishing name. Applied at load AND as a
# DB cleanup so previously-synced junk disappears on redeploy.
EXCLUDE_NAME_RE = re.compile(
    r'shed|trailer|storage|substation|pump ?house|temporary building'
    r'|maintenance|repair shop|welding shop|shop facility|ticket booth'
    r'|gate house|^(north|south|west|paint branch) gate$'
    r'|drill tower|heavy equipment|hvac|motorcycle|shuttle bus'
    r'|research greenhouse|parking garage|/marriott garage|comfort station'
    r'|^building \d+|grounds (material|operations|office)|animal care'
    r'|concessions|stadium building upper deck|tyser tower|toilet'
    r'|driving range control|^energy plant$|^service building$'
    r'|environmental service|fleet services|mosquito control'
    r'|sample preparation|leased facility|^house \d+$'
    r'|graduate (gardens|hills) +apartment'
    r'|mfri (structural|fire extinguisher|shop)'
    r'|impound|pest control|special education trailer|golub property'
    r'|herbicide|police substation|recycling center'
    r'|satellite central utilities|plant operations and maintenance',
    re.IGNORECASE,
)
EXCLUDE_CODES = {'B348'}  # duplicate College Park Marriott entry (B345 kept)

NAME_FIXES = {
    'B346': 'UMGC Administration Building',  # UMUC renamed to UMGC in 2019
}

# What sync does differently per campus. The files are read from the campus's
# data folder (data/ for UMD, data/<slug>/ for the others). These rules were
# written for UMD's state GIS data, so they must never touch another campus.
CAMPUS_RULES = {
    'umd': {
        # Hand-curated data takes priority; GIS data fills in the rest
        'sources': [
            'buildings_gis.json',  # loaded first so curated data can override
            'buildings.json',      # authoritative; wins on conflict
        ],
        'exclude_name_re': EXCLUDE_NAME_RE,
        'exclude_codes': EXCLUDE_CODES,
        'name_fixes': NAME_FIXES,
    },
}

# A campus with no entry above is one hand-curated file with nothing excluded.
DEFAULT_RULES = {
    'sources': ['buildings.json'],
    'exclude_name_re': None,
    'exclude_codes': set(),
    'name_fixes': {},
}


class Command(BaseCommand):
    help = 'Sync buildings and parking from each campus\'s JSON files into the database'

    def handle(self, *args, **options):
        only = settings.SYNC_CAMPUSES
        for campus in CAMPUSES:
            if only and campus not in only:
                self.stdout.write(f'[{campus}] skipped (not in SYNC_CAMPUSES)')
                continue
            # All or nothing per campus: a failure half-way leaves the
            # campus exactly as it was before this run.
            with transaction.atomic():
                self.sync_campus(campus)

    def sync_campus(self, campus):
        rules = CAMPUS_RULES.get(campus, DEFAULT_RULES)
        data_dir = campus_data_dir(campus)
        exclude_name_re = rules['exclude_name_re']
        exclude_codes = rules['exclude_codes']
        name_fixes = rules['name_fixes']

        def is_excluded(code, name):
            return code in exclude_codes or bool(exclude_name_re and exclude_name_re.search(name))

        self.stdout.write(f'[{campus}]')

        created = updated = skipped = 0
        valid_types = {value for value, _label in BUILDING_TYPES}
        bad_types = set()

        gis_ids_to_remove = []

        for filename in rules['sources']:
            source = data_dir / filename
            if not source.exists():
                self.stdout.write(f'Skipping {source.name} (not found)')
                continue

            with open(source, encoding='utf-8') as f:
                buildings = json.load(f)

            self.stdout.write(f'Loading {len(buildings)} buildings from {source.name}...')

            for b in buildings:
                name = name_fixes.get(b['acronym'], b['full_name'])
                if is_excluded(b['acronym'], name):
                    skipped += 1
                    continue
                # Looked up by campus AND code, so one campus can never
                # overwrite another campus's building that shares a code.
                _, was_created = Building.objects.update_or_create(
                    campus=campus,
                    code=b['acronym'],
                    defaults={
                        'name': name,
                        'type': b.get('type', ''),
                        'department': b.get('department', ''),
                        'description': b.get('description', ''),
                        'address': b.get('address', ''),
                        'latitude': b.get('latitude'),
                        'longitude': b.get('longitude'),
                        'hours': b.get('hours', ''),
                        'image_url': b.get('image_url', ''),
                    },
                )
                if was_created:
                    created += 1
                else:
                    updated += 1

                if b.get('type') and b['type'] not in valid_types:
                    bad_types.add((b['acronym'], b['type']))

                if b.get('gis_id'):
                    gis_ids_to_remove.append(b['gis_id'])

        # Every delete below is limited to this campus's rows.
        campus_buildings = Building.objects.filter(campus=campus)

        if gis_ids_to_remove:
            deleted, _ = campus_buildings.filter(code__in=gis_ids_to_remove).delete()
            self.stdout.write(f'Removed {deleted} duplicate GIS entries replaced by curated data.')

        # Clean previously-synced junk out of the DB (self-healing on redeploy)
        stale = [b.pk for b in campus_buildings if is_excluded(b.code, b.name)]
        if stale:
            purged, _ = campus_buildings.filter(pk__in=stale).delete()
            self.stdout.write(f'Purged {purged} non-destination structures from the DB.')
        if skipped:
            self.stdout.write(f'Skipped {skipped} non-destination structures at load.')

        for code, bad in sorted(bad_types):
            self.stdout.write(self.style.WARNING(
                f'{code}: unrecognized type {bad!r}, it will not match any filter chip.'
            ))

        parking_file = data_dir / 'parking.json'
        if parking_file.exists():
            with open(parking_file, encoding='utf-8') as f:
                lots = json.load(f)
            for p in lots:
                ParkingLot.objects.update_or_create(
                    campus=campus,
                    code=p['code'],
                    defaults={
                        'name': p['name'],
                        'kind': p.get('kind', 'lot'),
                        'latitude': p['latitude'],
                        'longitude': p['longitude'],
                        'note': p.get('note', ''),
                        'free_after_hours': p.get('free_after_hours', True),
                    },
                )
            self.stdout.write(f'Synced {len(lots)} parking locations.')

        self.stdout.write(
            self.style.SUCCESS(
                f'Done: {created} created, {updated} updated ({created + updated} total)'
            )
        )
