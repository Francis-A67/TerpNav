import json
import re
from pathlib import Path
from django.core.management.base import BaseCommand
from buildings.models import Building, BUILDING_TYPES, ParkingLot

DATA_DIR = Path(__file__).resolve().parent.parent.parent / 'data'

# Hand-curated data takes priority; GIS data fills in the rest
SOURCES = [
    DATA_DIR / 'buildings_gis.json',  # loaded first so curated data can override
    DATA_DIR / 'buildings.json',       # authoritative; wins on conflict
]

# Structures that aren't destinations anyone navigates to: utility/ops
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


class Command(BaseCommand):
    help = 'Sync buildings from JSON sources into the database'

    def handle(self, *args, **options):
        created = updated = skipped = 0
        valid_types = {value for value, _label in BUILDING_TYPES}
        bad_types = set()

        gis_ids_to_remove = []

        for source in SOURCES:
            if not source.exists():
                self.stdout.write(f'Skipping {source.name} (not found)')
                continue

            with open(source, encoding='utf-8') as f:
                buildings = json.load(f)

            self.stdout.write(f'Loading {len(buildings)} buildings from {source.name}...')

            for b in buildings:
                name = NAME_FIXES.get(b['acronym'], b['full_name'])
                if b['acronym'] in EXCLUDE_CODES or EXCLUDE_NAME_RE.search(name):
                    skipped += 1
                    continue
                _, was_created = Building.objects.update_or_create(
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

        if gis_ids_to_remove:
            deleted, _ = Building.objects.filter(code__in=gis_ids_to_remove).delete()
            self.stdout.write(f'Removed {deleted} duplicate GIS entries replaced by curated data.')

        # Clean previously-synced junk out of the DB (self-healing on redeploy)
        stale = [b.pk for b in Building.objects.all()
                 if b.code in EXCLUDE_CODES or EXCLUDE_NAME_RE.search(b.name)]
        if stale:
            purged, _ = Building.objects.filter(pk__in=stale).delete()
            self.stdout.write(f'Purged {purged} non-destination structures from the DB.')
        if skipped:
            self.stdout.write(f'Skipped {skipped} non-destination structures at load.')

        for code, bad in sorted(bad_types):
            self.stdout.write(self.style.WARNING(
                f'{code}: unrecognized type {bad!r}, it will not match any filter chip.'
            ))

        parking_file = DATA_DIR / 'parking.json'
        if parking_file.exists():
            with open(parking_file, encoding='utf-8') as f:
                lots = json.load(f)
            for p in lots:
                ParkingLot.objects.update_or_create(
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
