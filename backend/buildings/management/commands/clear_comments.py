import os
from django.core.management.base import BaseCommand
from buildings.models import Comment


class Command(BaseCommand):
    help = (
        'Delete ALL comments. Safe to leave in the deploy pipeline: it only '
        'acts when the CLEAR_COMMENTS env var is truthy (or --force is passed).'
    )

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Delete without the env var gate')

    def handle(self, *args, **options):
        gate = os.environ.get('CLEAR_COMMENTS', '').lower() in ('true', '1', 'yes')
        if not (gate or options['force']):
            self.stdout.write('CLEAR_COMMENTS not set; skipping (no comments deleted).')
            return
        count, _ = Comment.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {count} comments.'))
