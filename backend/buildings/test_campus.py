"""Tests for the campus dimension.

Two campuses share one database and one API. These tests check that neither
can see, overwrite or delete the other's rows, and that leaving the campus
out of a request still means UMD.
"""
import io

from django.core.management import call_command
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase, override_settings

from .campuses import CAMPUSES, DATA_DIR, DEFAULT_CAMPUS, campus_data_dir
from .models import Building, Comment, ParkingLot
from .tests import ApiTestCase


class CampusRegistryTests(TestCase):
    def test_umd_is_the_default_campus(self):
        self.assertEqual(DEFAULT_CAMPUS, 'umd')
        self.assertIn(DEFAULT_CAMPUS, CAMPUSES)

    def test_only_the_default_campus_uses_the_top_level_data_folder(self):
        self.assertEqual(campus_data_dir('umd'), DATA_DIR)
        self.assertEqual(campus_data_dir('towson'), DATA_DIR / 'towson')


class CampusModelTests(TestCase):
    def test_new_rows_land_on_the_default_campus(self):
        building = Building.objects.create(code='IRB', name='Brendan Iribe Center')
        lot = ParkingLot.objects.create(code='P1', name='Lot 1', latitude=38.99, longitude=-76.94)
        self.assertEqual(building.campus, 'umd')
        self.assertEqual(lot.campus, 'umd')

    def test_the_database_itself_defaults_the_campus(self):
        # The previous release's code knows nothing about campuses and would
        # insert without the column. The database default has to cover that.
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO buildings_building "
                "(code, name, type, department, description, address, hours, image_url) "
                "VALUES ('RAW', 'Inserted without a campus', '', '', '', '', '', '')"
            )
        self.assertEqual(Building.objects.get(code='RAW').campus, 'umd')

    def test_two_campuses_can_use_the_same_code(self):
        Building.objects.create(campus='umd', code='LA', name='A UMD building')
        Building.objects.create(campus='towson', code='LA', name='Liberal Arts Building')
        self.assertEqual(Building.objects.filter(code='LA').count(), 2)

    def test_a_code_stays_unique_within_one_campus(self):
        Building.objects.create(campus='towson', code='LA', name='Liberal Arts Building')
        with self.assertRaises(IntegrityError), transaction.atomic():
            Building.objects.create(campus='towson', code='LA', name='Second LA')

        ParkingLot.objects.create(campus='towson', code='lot-1', name='Lot 1', latitude=39.39, longitude=-76.61)
        with self.assertRaises(IntegrityError), transaction.atomic():
            ParkingLot.objects.create(campus='towson', code='lot-1', name='Lot 1 again', latitude=39.39, longitude=-76.61)


class CampusMigrationTests(TransactionTestCase):
    """Runs migration 0007 over rows created under the old schema."""

    def test_existing_rows_become_umd_and_keep_their_comments(self):
        before, after = ('buildings', '0006_building_type'), ('buildings', '0007_campus')

        executor = MigrationExecutor(connection)
        executor.migrate([before])
        old = executor.loader.project_state([before]).apps
        building = old.get_model('buildings', 'Building').objects.create(code='IRB', name='Iribe')
        lot = old.get_model('buildings', 'ParkingLot').objects.create(
            code='P1', name='Lot 1', latitude=38.99, longitude=-76.94,
        )
        comment = old.get_model('buildings', 'Comment').objects.create(building=building, text='hi')

        executor = MigrationExecutor(connection)
        executor.migrate([after])
        new = executor.loader.project_state([after]).apps
        NewBuilding = new.get_model('buildings', 'Building')
        migrated = NewBuilding.objects.get(code='IRB')

        self.assertEqual(migrated.campus, 'umd')
        self.assertEqual(migrated.pk, building.pk)
        self.assertEqual(new.get_model('buildings', 'ParkingLot').objects.get(pk=lot.pk).campus, 'umd')
        self.assertEqual(
            new.get_model('buildings', 'Comment').objects.get(pk=comment.pk).building_id, building.pk,
        )
        # The old rule (one IRB in the whole table) is gone, the new one holds.
        NewBuilding.objects.create(campus='towson', code='IRB', name='Same code, other campus')
        with self.assertRaises(IntegrityError), transaction.atomic():
            NewBuilding.objects.create(campus='umd', code='IRB', name='Duplicate')


class CampusApiTests(ApiTestCase):
    @classmethod
    def setUpTestData(cls):
        Building.objects.create(campus='umd', code='IRB', name='Brendan Iribe Center', type='Academic')
        cls.umd_la = Building.objects.create(campus='umd', code='LA', name='A UMD building coded LA', type='Academic')
        cls.towson_la = Building.objects.create(campus='towson', code='LA', name='Liberal Arts Building', type='Academic')
        Building.objects.create(campus='towson', code='CK', name='Cook Library', type='Library')
        ParkingLot.objects.create(campus='umd', code='P100', name='Parking Lot 11b', latitude=38.99, longitude=-76.94)
        ParkingLot.objects.create(campus='towson', code='union-garage', name='Union Garage', kind='garage', latitude=39.39, longitude=-76.61)

    def codes(self, url, **params):
        res = self.client.get(url, params)
        self.assertEqual(res.status_code, 200, res.content)
        return [row.get('acronym') or row.get('code') for row in res.json()]

    def test_leaving_the_campus_out_means_umd(self):
        self.assertEqual(self.codes('/api/buildings/'), ['IRB', 'LA'])
        self.assertEqual(self.codes('/api/buildings/', campus='umd'), ['IRB', 'LA'])
        self.assertEqual(self.codes('/api/buildings/', campus=''), ['IRB', 'LA'])

    def test_each_campus_lists_only_its_own_buildings(self):
        self.assertEqual(self.codes('/api/buildings/', campus='towson'), ['LA', 'CK'])
        self.assertEqual(self.codes('/api/buildings/', campus='TOWSON'), ['LA', 'CK'])

    def test_rows_say_which_campus_they_belong_to(self):
        towson = self.client.get('/api/buildings/', {'campus': 'towson'}).json()
        self.assertEqual({b['campus'] for b in towson}, {'towson'})
        lots = self.client.get('/api/parking/', {'campus': 'towson'}).json()
        self.assertEqual({p['campus'] for p in lots}, {'towson'})

    def test_search_stays_inside_the_campus(self):
        self.assertEqual(self.codes('/api/buildings/', campus='towson', search='library'), ['CK'])
        self.assertEqual(self.codes('/api/buildings/', search='library'), [])

    def test_the_same_code_resolves_per_campus(self):
        umd = self.client.get('/api/buildings/LA/').json()
        towson = self.client.get('/api/buildings/la/', {'campus': 'towson'}).json()
        self.assertEqual(umd['full_name'], 'A UMD building coded LA')
        self.assertEqual(towson['full_name'], 'Liberal Arts Building')

    def test_a_building_of_the_other_campus_is_404(self):
        self.assertEqual(self.client.get('/api/buildings/CK/').status_code, 404)
        self.assertEqual(self.client.get('/api/buildings/IRB/', {'campus': 'towson'}).status_code, 404)

    def test_parking_is_listed_per_campus(self):
        self.assertEqual(self.codes('/api/parking/'), ['P100'])
        self.assertEqual(self.codes('/api/parking/', campus='towson'), ['union-garage'])

    def test_comments_belong_to_one_campus_building(self):
        res = self.client.post(
            '/api/buildings/LA/comments/?campus=towson', {'text': 'Third floor is quiet.'}, format='json',
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Comment.objects.get().building, self.towson_la)
        towson = self.client.get('/api/buildings/LA/comments/', {'campus': 'towson'}).json()
        umd = self.client.get('/api/buildings/LA/comments/').json()
        self.assertEqual([c['text'] for c in towson], ['Third floor is quiet.'])
        self.assertEqual(umd, [])

    @override_settings(COMMENTS_DISABLED_CAMPUSES=['towson'])
    def test_comments_can_be_switched_off_for_one_campus(self):
        towson = self.client.post(
            '/api/buildings/LA/comments/?campus=towson', {'text': 'hello'}, format='json',
        )
        umd = self.client.post('/api/buildings/LA/comments/', {'text': 'hello'}, format='json')
        self.assertEqual(towson.status_code, 403)
        self.assertEqual(umd.status_code, 201)
        # Reading stays on.
        self.assertEqual(
            self.client.get('/api/buildings/LA/comments/', {'campus': 'towson'}).status_code, 200,
        )

    def test_a_building_without_tips_gets_an_empty_list_on_any_campus(self):
        res = self.client.get('/api/buildings/tips/NOPE/', {'campus': 'towson'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_an_unknown_campus_is_404_everywhere(self):
        urls = [
            '/api/buildings/',
            '/api/buildings/LA/',
            '/api/buildings/tips/LA/',
            '/api/buildings/LA/comments/',
            '/api/parking/',
        ]
        for url in urls:
            self.assertEqual(self.client.get(url, {'campus': 'nope'}).status_code, 404, url)
        res = self.client.post('/api/buildings/LA/comments/?campus=nope', {'text': 'hello'}, format='json')
        self.assertEqual(res.status_code, 404)
        self.assertEqual(Comment.objects.count(), 0)


class SyncCampusScopeTests(ApiTestCase):
    def test_syncing_never_touches_rows_of_another_campus(self):
        # Rows on a campus the sync does not manage. Each one is something the
        # UMD rules would rewrite, replace or purge if the sync were not scoped.
        shares_code = Building.objects.create(
            campus='elsewhere', code='IRB', name='Shares the code of a curated UMD building',
        )
        shares_gis_code = Building.objects.create(
            campus='elsewhere', code='B432', name='Shares the code of a UMD GIS duplicate',
        )
        excluded_code = Building.objects.create(
            campus='elsewhere', code='B348', name='Shares a code UMD excludes',
        )
        excluded_name = Building.objects.create(
            campus='elsewhere', code='SHED', name='Storage Shed',
        )
        lot = ParkingLot.objects.create(
            campus='elsewhere', code='G179', name='Shares the code of a UMD garage',
            latitude=39.39, longitude=-76.61,
        )
        comment = Comment.objects.create(building=shares_code, text='Still here?')

        call_command('sync_buildings', stdout=io.StringIO())

        for row in (shares_code, shares_gis_code, excluded_code, excluded_name, lot):
            before = row.name
            row.refresh_from_db()   # raises DoesNotExist if the sync deleted it
            self.assertEqual(row.name, before)
        self.assertTrue(Comment.objects.filter(pk=comment.pk).exists())

        # And UMD itself synced normally next to them.
        self.assertIn('Iribe', Building.objects.get(campus='umd', code='IRB').name)
        self.assertFalse(Building.objects.filter(campus='umd', code='B432').exists())
        self.assertFalse(Building.objects.filter(campus='umd', code='B348').exists())
        self.assertTrue(ParkingLot.objects.filter(campus='umd', code='G179').exists())

    @override_settings(SYNC_CAMPUSES=['umd'])
    def test_sync_can_be_limited_to_some_campuses(self):
        # Used for the first deploy, while code that ignores campuses may still serve.
        out = io.StringIO()
        call_command('sync_buildings', stdout=out)
        self.assertTrue(Building.objects.filter(campus='umd').exists())
        self.assertFalse(Building.objects.exclude(campus='umd').exists())
        self.assertFalse(ParkingLot.objects.exclude(campus='umd').exists())
        self.assertIn('[towson] skipped', out.getvalue())

    def test_every_synced_row_belongs_to_a_known_campus(self):
        call_command('sync_buildings', stdout=io.StringIO())
        self.assertLessEqual(set(Building.objects.values_list('campus', flat=True)), set(CAMPUSES))
        self.assertLessEqual(set(ParkingLot.objects.values_list('campus', flat=True)), set(CAMPUSES))
        self.assertTrue(Building.objects.filter(campus='umd').exists())
