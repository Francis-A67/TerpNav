import json
from pathlib import Path
from django.core.management.base import BaseCommand
from buildings.models import Building

DATA_DIR = Path(__file__).resolve().parent.parent.parent / 'data'

# Hand-curated data takes priority; GIS data fills in the rest
SOURCES = [
    DATA_DIR / 'buildings_gis.json',  # loaded first so curated data can override
    DATA_DIR / 'buildings.json',       # authoritative — wins on conflict
]


class Command(BaseCommand):
    help = 'Sync buildings from JSON sources into the database'

    def handle(self, *args, **options):
        created = updated = skipped = 0

        gis_ids_to_remove = []

        for source in SOURCES:
            if not source.exists():
                self.stdout.write(f'Skipping {source.name} (not found)')
                continue

            with open(source, encoding='utf-8') as f:
                buildings = json.load(f)

            self.stdout.write(f'Loading {len(buildings)} buildings from {source.name}...')

            for b in buildings:
                _, was_created = Building.objects.update_or_create(
                    code=b['acronym'],
                    defaults={
                        'name': b['full_name'],
                        'department': b.get('department', ''),
                        'description': b.get('description', ''),
                        'address': b.get('address', ''),
                        'latitude': b.get('latitude'),
                        'longitude': b.get('longitude'),
                        'hours': b.get('hours', ''),
                    },
                )
                if was_created:
                    created += 1
                else:
                    updated += 1

                if b.get('gis_id'):
                    gis_ids_to_remove.append(b['gis_id'])

        if gis_ids_to_remove:
            deleted, _ = Building.objects.filter(code__in=gis_ids_to_remove).delete()
            self.stdout.write(f'Removed {deleted} duplicate GIS entries replaced by curated data.')

        self.stdout.write(
            self.style.SUCCESS(
                f'Done: {created} created, {updated} updated ({created + updated} total)'
            )
        )
