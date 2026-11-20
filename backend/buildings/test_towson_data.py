"""Checks on the Towson data files. No network is used.

The files in data/towson/ are built by scripts/towson/build_data.py from
hand-curated facts plus raw source snapshots. These tests make sure the
committed files still match their sources and follow the accuracy rules:
every building is an official one, every coordinate is traceable, and nothing
unverified is ever presented as free parking.
"""
import importlib.util
import io
import json
from pathlib import Path

from django.core.management import call_command
from django.test import SimpleTestCase

from .building_types import BUILDING_TYPE_VALUES
from .campuses import campus_data_dir
from .models import Building, ParkingLot
from .tests import ApiTestCase

DATA = campus_data_dir('towson')
SCRIPTS = Path(__file__).resolve().parent / 'scripts' / 'towson'

# Buildings the university lists that sit outside the main campus boundary.
OFF_CAMPUS = {'AR', 'WA', 'OP', 'Y2'}
# Official pages a "free after hours" claim has to rest on.
RULE_SOURCES = (
    'https://www.towson.edu/parking/forms/parking-guidelines.pdf',
    'https://www.towson.edu/parking/enforcement/',
)


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def load_builder():
    spec = importlib.util.spec_from_file_location('towson_build_data', SCRIPTS / 'build_data.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def campus_box(margin=0.001):
    """Bounding box of the official campus boundary, with about 100 m of slack."""
    lons, lats = [], []
    for feature in load(SCRIPTS / 'raw' / 'imap_tu_boundary.json')['features']:
        for ring in feature['geometry'].get('rings') or feature['geometry'].get('paths') or []:
            for point in ring:
                lons.append(point[0])
                lats.append(point[1])
    return min(lats) - margin, max(lats) + margin, min(lons) - margin, max(lons) + margin


class TowsonDataFileTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.buildings = load(DATA / 'buildings.json')
        cls.parking = load(DATA / 'parking.json')
        cls.provenance = load(DATA / 'provenance.json')
        cls.official = load(SCRIPTS / 'official_codes.json')

    def test_files_are_exactly_what_the_sources_produce(self):
        # Fails if a data file was edited by hand, or if the curated facts or
        # the snapshots changed without re-running build_data.py.
        buildings, parking, provenance, problems = load_builder().build()
        self.assertEqual(problems, [])
        self.assertEqual(self.buildings, buildings)
        self.assertEqual(self.parking, parking)
        self.assertEqual(self.provenance, provenance)

    def test_buildings_are_exactly_the_official_ones(self):
        official = set(self.official['codes']) | set(self.official['not_in_legend'])
        codes = [b['acronym'] for b in self.buildings]
        self.assertEqual(set(codes), official)
        self.assertEqual(len(codes), len({c.lower() for c in codes}), 'a code is repeated')

    def test_building_fields_fit_the_database(self):
        limits = {'acronym': 20, 'full_name': 200, 'department': 200, 'address': 300, 'hours': 200, 'image_url': 500}
        for b in self.buildings:
            self.assertIn(b['type'], BUILDING_TYPE_VALUES, b['acronym'])
            self.assertTrue(b['full_name'], b['acronym'])
            for field, limit in limits.items():
                self.assertLessEqual(len(b[field]), limit, f"{b['acronym']} {field}")

    def test_building_coordinates_are_on_campus(self):
        south, north, west, east = campus_box()
        for b in self.buildings:
            if b['latitude'] is None or b['acronym'] in OFF_CAMPUS:
                continue
            self.assertTrue(south <= b['latitude'] <= north, b['acronym'])
            self.assertTrue(west <= b['longitude'] <= east, b['acronym'])

    def test_every_building_coordinate_names_its_source(self):
        for b in self.buildings:
            source = self.provenance['buildings'][b['acronym']]
            self.assertTrue(source['name_and_code'].startswith('https://www.towson.edu/'), b['acronym'])
            if b['latitude'] is None:
                self.assertEqual(source['coordinates'], 'none yet', b['acronym'])
                self.assertTrue(source['to_verify'], f"{b['acronym']} has no coordinates and no note saying why")
            else:
                self.assertRegex(source['coordinates'], r'^(OpenStreetMap|Maryland iMAP)', b['acronym'])

    def test_copy_follows_the_house_style(self):
        for record in self.buildings + self.parking:
            for field in ('full_name', 'name', 'department', 'description', 'hours', 'note'):
                self.assertNotIn('—', record.get(field, ''), f'em dash in {record}')
        for b in self.buildings:
            if b['image_url']:
                self.assertTrue(b['image_url'].startswith('https://commons.wikimedia.org/'), b['acronym'])

    def test_parking_records_are_well_formed(self):
        south, north, west, east = campus_box()
        codes = [p['code'] for p in self.parking]
        self.assertEqual(len(codes), len(set(codes)))
        for p in self.parking:
            self.assertIn(p['kind'], ('lot', 'garage'), p['code'])
            self.assertLessEqual(len(p['note']), 300, p['code'])
            self.assertTrue(p['note'], p['code'])
            self.assertTrue(south <= p['latitude'] <= north, p['code'])
            self.assertTrue(west <= p['longitude'] <= east, p['code'])
            self.assertRegex(self.provenance['parking'][p['code']]['coordinates'], r'^OpenStreetMap', p['code'])

    def test_free_parking_is_only_claimed_with_an_official_rule_behind_it(self):
        for p in self.parking:
            source = self.provenance['parking'][p['code']]
            official = [url for url in source['facts'] if url.startswith('https://www.towson.edu/')]
            self.assertTrue(official, f"{p['code']} cites no towson.edu page")
            if p['free_after_hours']:
                self.assertTrue(
                    any(url in RULE_SOURCES for url in source['facts']),
                    f"{p['code']} is marked free after hours without citing the regulations",
                )

    def test_lots_with_an_unpublished_rule_are_never_marked_free(self):
        # 'published' means an official rule opens the facility after hours.
        # 'unconfirmed' (no published rule) and 'never' must not be shown free.
        for p in self.parking:
            rule = self.provenance['parking'][p['code']]['after_hours_rule']
            self.assertIn(rule, ('published', 'unconfirmed', 'never'), p['code'])
            if rule != 'published':
                self.assertFalse(p['free_after_hours'], p['code'])


class TowsonSyncTests(ApiTestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('sync_buildings', stdout=io.StringIO())

    def test_sync_loads_every_towson_record(self):
        self.assertEqual(Building.objects.filter(campus='towson').count(), len(load(DATA / 'buildings.json')))
        self.assertEqual(ParkingLot.objects.filter(campus='towson').count(), len(load(DATA / 'parking.json')))

    def test_api_serves_towson_in_file_order(self):
        # The home page shows the first six as "Popular buildings".
        expected = [b['acronym'] for b in load(DATA / 'buildings.json')]
        res = self.client.get('/api/buildings/', {'campus': 'towson'})
        self.assertEqual([b['acronym'] for b in res.json()], expected)

    def test_towson_and_umd_stay_separate(self):
        towson = {b['acronym'] for b in self.client.get('/api/buildings/', {'campus': 'towson'}).json()}
        umd = {b['acronym'] for b in self.client.get('/api/buildings/').json()}
        self.assertIn('CK', towson)
        self.assertNotIn('CK', umd)
        self.assertIn('IRB', umd)
        self.assertNotIn('IRB', towson)
