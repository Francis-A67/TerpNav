"""Regression tests for the API and the sync command.

They pin the behavior the live site depends on, so the internals can change
(for example, adding a second campus) without changing what UMD users get.

Run from the backend/ directory:
    python manage.py test
"""
import io
import json
from datetime import timedelta
from pathlib import Path

from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .building_types import BUILDING_TYPE_VALUES
from .models import Building, Comment, ParkingLot

DATA_DIR = Path(__file__).resolve().parent / 'data'

# The keys the React pages read. The API may add keys, but must keep these.
BUILDING_FIELDS = {
    'acronym', 'full_name', 'type', 'department', 'description',
    'address', 'latitude', 'longitude', 'hours', 'image_url',
}
PARKING_FIELDS = {
    'code', 'name', 'kind', 'latitude', 'longitude', 'note', 'free_after_hours',
}


def load_json(name):
    return json.loads((DATA_DIR / name).read_text(encoding='utf-8'))


# Production redirects http to https; the test client speaks plain http.
@override_settings(SECURE_SSL_REDIRECT=False)
class ApiTestCase(TestCase):
    def setUp(self):
        # DRF keeps its rate-limit counters in the cache, so start each test at zero.
        cache.clear()
        self.client = APIClient()


class BuildingApiTests(ApiTestCase):
    @classmethod
    def setUpTestData(cls):
        Building.objects.create(
            code='IRB', name='Brendan Iribe Center', type='Academic',
            department='Computer Science', address='8125 Paint Branch Dr',
            latitude=38.989413, longitude=-76.936166, hours='Mon-Fri 7am-10pm',
        )
        Building.objects.create(
            code='HBK', name='Hornbake Library', type='Library',
            department='University Libraries',
        )
        Building.objects.create(
            code='B164', name='Cole Field House', type='Athletics',
            department='Athletics',
        )

    def test_list_returns_every_building(self):
        res = self.client.get('/api/buildings/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual({b['acronym'] for b in res.json()}, {'IRB', 'HBK', 'B164'})

    def test_building_has_the_fields_the_frontend_reads(self):
        first = self.client.get('/api/buildings/').json()[0]
        self.assertLessEqual(BUILDING_FIELDS, set(first))

    def test_search_matches_code_name_or_department(self):
        cases = [('irb', 'IRB'), ('hornbake', 'HBK'), ('athletics', 'B164')]
        for term, expected in cases:
            res = self.client.get('/api/buildings/', {'search': term})
            self.assertEqual([b['acronym'] for b in res.json()], [expected], term)

    def test_search_with_no_match_returns_an_empty_list(self):
        res = self.client.get('/api/buildings/', {'search': 'zzzz'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_detail_lookup_ignores_case(self):
        res = self.client.get('/api/buildings/irb/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['acronym'], 'IRB')
        self.assertEqual(res.json()['full_name'], 'Brendan Iribe Center')

    def test_unknown_building_is_404(self):
        res = self.client.get('/api/buildings/NOPE/')
        self.assertEqual(res.status_code, 404)

    def test_tips_are_served_from_tips_json(self):
        tips_file = load_json('tips.json')
        if not tips_file:
            self.skipTest('tips.json is empty')
        code = tips_file[0]['building']
        expected = [t for t in tips_file if t['building'] == code]
        res = self.client.get(f'/api/buildings/tips/{code.lower()}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), expected)

    def test_building_without_tips_gets_an_empty_list(self):
        res = self.client.get('/api/buildings/tips/B164/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])


class ParkingApiTests(ApiTestCase):
    @classmethod
    def setUpTestData(cls):
        ParkingLot.objects.create(
            code='P200', name='Parking Lot 4b', kind='lot',
            latitude=38.99, longitude=-76.94,
        )
        ParkingLot.objects.create(
            code='G100', name='Union Lane Parking Garage', kind='garage',
            latitude=38.98, longitude=-76.94, note='Visitor parking.',
            free_after_hours=False,
        )
        ParkingLot.objects.create(
            code='P100', name='Parking Lot 11b', kind='lot',
            latitude=38.99, longitude=-76.93,
        )

    def test_parking_is_sorted_by_code(self):
        res = self.client.get('/api/parking/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([p['code'] for p in res.json()], ['G100', 'P100', 'P200'])

    def test_lot_has_the_fields_the_frontend_reads(self):
        garage = self.client.get('/api/parking/').json()[0]
        self.assertLessEqual(PARKING_FIELDS, set(garage))
        self.assertEqual(garage['kind'], 'garage')
        self.assertIs(garage['free_after_hours'], False)


class CommentApiTests(ApiTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.irb = Building.objects.create(code='IRB', name='Brendan Iribe Center')

    def post(self, text, code='IRB', **extra):
        return self.client.post(
            f'/api/buildings/{code}/comments/', {'text': text, **extra}, format='json',
        )

    def test_building_starts_with_no_comments(self):
        res = self.client.get('/api/buildings/IRB/comments/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_posted_comment_is_saved_and_returned(self):
        res = self.post('Use the side entrance.')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(set(res.json()), {'id', 'text', 'helpful', 'created_at'})
        self.assertEqual(Comment.objects.get().building, self.irb)

    def test_comments_are_listed_newest_first(self):
        old = Comment.objects.create(building=self.irb, text='old')
        Comment.objects.filter(pk=old.pk).update(
            created_at=timezone.now() - timedelta(days=1),
        )
        self.post('new')
        res = self.client.get('/api/buildings/irb/comments/')
        self.assertEqual([c['text'] for c in res.json()], ['new', 'old'])

    def test_unknown_building_is_404_for_reading_and_posting(self):
        self.assertEqual(self.client.get('/api/buildings/NOPE/comments/').status_code, 404)
        self.assertEqual(self.post('hello', code='NOPE').status_code, 404)

    def test_blank_and_overlong_comments_are_rejected(self):
        self.assertEqual(self.post('   ').status_code, 400)
        self.assertEqual(self.post('x' * 501).status_code, 400)
        self.assertEqual(self.post('x' * 500).status_code, 201)

    def test_mild_swearing_is_allowed_but_harassment_is_blocked(self):
        self.assertEqual(self.post('This damn building is a maze.').status_code, 201)
        blocked = self.post('kys')
        self.assertEqual(blocked.status_code, 400)
        self.assertIn('respectful', blocked.json()['error'])
        self.assertEqual(Comment.objects.count(), 1)

    def test_client_cannot_set_the_helpful_count(self):
        self.post('Elevator is by the main doors.', helpful=99)
        self.assertEqual(Comment.objects.get().helpful, 0)

    def test_kill_switch_blocks_posting_but_not_reading(self):
        with self.settings(COMMENTS_ENABLED=False):
            self.assertEqual(self.post('hello').status_code, 403)
            self.assertEqual(self.client.get('/api/buildings/IRB/comments/').status_code, 200)
        self.assertEqual(Comment.objects.count(), 0)

    def test_posting_is_limited_to_ten_an_hour(self):
        for n in range(10):
            self.assertEqual(self.post(f'comment {n}').status_code, 201, n)
        self.assertEqual(self.post('one too many').status_code, 429)


class SyncBuildingsTests(ApiTestCase):
    """Runs the real sync command against the JSON files committed in data/."""

    @classmethod
    def setUpTestData(cls):
        call_command('sync_buildings', stdout=io.StringIO())

    def resync(self):
        call_command('sync_buildings', stdout=io.StringIO())

    def test_loads_buildings_and_every_parking_record(self):
        parking_codes = {p['code'] for p in load_json('parking.json')}
        loaded = ParkingLot.objects.filter(code__in=parking_codes)
        self.assertEqual(loaded.count(), len(parking_codes))
        self.assertGreater(Building.objects.count(), 150)

    def test_curated_record_replaces_its_gis_row(self):
        # IRB is the curated record; B432 is the same building in the GIS data.
        self.assertTrue(Building.objects.filter(code='IRB').exists())
        self.assertFalse(Building.objects.filter(code='B432').exists())

    def test_duplicates_and_non_destinations_are_left_out(self):
        self.assertFalse(Building.objects.filter(code='B348').exists())
        self.assertTrue(Building.objects.filter(code='B345').exists())
        for word in ('trailer', 'substation'):
            self.assertFalse(Building.objects.filter(name__icontains=word).exists(), word)

    def test_name_fix_is_applied(self):
        self.assertEqual(
            Building.objects.get(code='B346').name, 'UMGC Administration Building',
        )

    def test_every_building_has_a_recognized_type(self):
        unrecognized = Building.objects.exclude(type__in=BUILDING_TYPE_VALUES)
        self.assertEqual(list(unrecognized.values_list('code', 'type')), [])

    def test_running_sync_again_changes_nothing(self):
        buildings_before = dict(Building.objects.values_list('code', 'pk'))
        lots_before = dict(ParkingLot.objects.values_list('code', 'pk'))
        self.resync()
        self.assertEqual(dict(Building.objects.values_list('code', 'pk')), buildings_before)
        self.assertEqual(dict(ParkingLot.objects.values_list('code', 'pk')), lots_before)

    def test_comments_survive_a_resync(self):
        irb = Building.objects.get(code='IRB')
        Comment.objects.create(building=irb, text='Side entrance is faster.')
        self.resync()
        self.assertEqual(Comment.objects.filter(building__code='IRB').count(), 1)

    def test_synced_building_is_served_by_the_api(self):
        # Same URL the keep-alive workflow pings every 10 minutes.
        res = self.client.get('/api/buildings/IRB/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('Iribe', res.json()['full_name'])
