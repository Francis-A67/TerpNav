"""Tests for building aliases. No network is used.

An alias is something people type to find a building that TerpNav lists
under another name: a nickname ("The Y"), a former name ("Comcast Center"),
or the university's official building code when it differs from ours ("KEB").
Aliases are only searched, never displayed.
"""
import hashlib
import io
import json
import re
from pathlib import Path

from django.core.management import call_command
from django.db import connection
from django.test import SimpleTestCase, TestCase

from .campuses import CAMPUSES, campus_data_dir
from .management.commands.sync_buildings import CAMPUS_RULES, DEFAULT_RULES
from .models import Building
from .tests import ApiTestCase

SCRIPTS = Path(__file__).resolve().parent / 'scripts'
RAW = SCRIPTS / 'raw'

# State-only buildings whose umd.io code is left out on purpose.
# B346: the state calls it an administration building and umd.io a student
# and faculty services center. The names disagree, so the code is not trusted.
OFFICIAL_CODE_EXCEPTIONS = {'B346'}


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def building_number(code):
    """'B035' and '35' are the same official building number."""
    digits = code.lstrip('B')
    return str(int(digits)) if digits.isdigit() else code


def source_records(campus):
    """Every record in the campus's building files, as sync reads them."""
    rules = CAMPUS_RULES.get(campus, DEFAULT_RULES)
    for filename in rules['sources']:
        yield from load(campus_data_dir(campus) / filename)


class AliasModelTests(TestCase):
    def test_a_new_building_starts_with_no_aliases(self):
        building = Building.objects.create(code='IRB', name='Brendan Iribe Center')
        self.assertEqual(building.aliases, [])

    def test_the_database_itself_defaults_the_aliases(self):
        # The previous release's code knows nothing about aliases and inserts
        # without the column. The database default has to cover that.
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO buildings_building "
                "(code, name, type, department, description, address, hours, image_url) "
                "VALUES ('RAW', 'Inserted without aliases', '', '', '', '', '', '')"
            )
        self.assertEqual(Building.objects.get(code='RAW').aliases, [])


class AliasApiTests(ApiTestCase):
    @classmethod
    def setUpTestData(cls):
        Building.objects.create(
            code='Y', name='Yahentamitsi Dining Hall', aliases=['The Y'],
        )
        Building.objects.create(
            code='SECU', name='SECU Stadium',
            aliases=['football stadium', 'Byrd Stadium'],
        )
        Building.objects.create(code='HBK', name='Hornbake Library')
        Building.objects.create(
            campus='towson', code='UU', name='University Union', aliases=['The Y'],
        )

    def search(self, term, **params):
        res = self.client.get('/api/buildings/', {'search': term, **params})
        self.assertEqual(res.status_code, 200)
        return [b['acronym'] for b in res.json()]

    def test_every_building_row_carries_its_aliases(self):
        rows = {b['acronym']: b for b in self.client.get('/api/buildings/').json()}
        self.assertEqual(rows['Y']['aliases'], ['The Y'])
        self.assertEqual(rows['HBK']['aliases'], [])

    def test_search_matches_an_alias_in_any_letter_case(self):
        self.assertEqual(self.search('the y'), ['Y'])
        self.assertEqual(self.search('BYRD'), ['SECU'])

    def test_search_matches_part_of_an_alias(self):
        self.assertEqual(self.search('football'), ['SECU'])

    def test_json_punctuation_is_not_an_alias(self):
        # Aliases are stored as a JSON list. Its brackets, quotes and commas
        # must not count as a match.
        for term in ('[', ']', '"', ',', '", "'):
            self.assertEqual(self.search(term), [], term)

    def test_alias_search_stays_inside_the_campus(self):
        self.assertEqual(self.search('the y'), ['Y'])
        self.assertEqual(self.search('the y', campus='towson'), ['UU'])


class AliasSyncTests(ApiTestCase):
    """Runs the real sync command against the JSON files committed in data/."""

    @classmethod
    def setUpTestData(cls):
        call_command('sync_buildings', stdout=io.StringIO())

    def umd(self, code):
        return Building.objects.get(campus='umd', code=code)

    def test_curated_aliases_are_loaded(self):
        self.assertEqual(self.umd('Y').aliases, ['The Y'])

    def test_state_only_buildings_get_their_aliases(self):
        self.assertEqual(self.umd('B259').aliases, ['LPA'])  # La Plata Hall

    def test_a_building_without_aliases_has_an_empty_list(self):
        self.assertEqual(self.umd('ESJ').aliases, [])

    def test_the_stadium_is_served_and_found_by_its_former_name(self):
        res = self.client.get('/api/buildings/', {'search': 'byrd stadium'})
        self.assertEqual([b['acronym'] for b in res.json()], ['SECU'])
        # Its concession stands and ticket booth stay out of the list.
        names = Building.objects.filter(campus='umd', name__icontains='stadium concessions')
        self.assertFalse(names.exists())

    def test_a_curated_record_can_correct_a_state_record_in_place(self):
        # B257 is the old Ellicott dining hall. The curated record shares its
        # code, so the same row (and its comments) gets the current name.
        before = self.umd('B257')
        self.assertEqual(before.name, 'Ellicott Community Center')
        self.assertEqual(before.hours, '')
        call_command('sync_buildings', stdout=io.StringIO())
        self.assertEqual(self.umd('B257').pk, before.pk)

    def test_no_alias_is_another_buildings_code(self):
        # Typing a code must lead to the building that owns it.
        for campus in CAMPUSES:
            buildings = list(Building.objects.filter(campus=campus))
            owner = {b.code.lower(): b.code for b in buildings}
            for b in buildings:
                for alias in b.aliases:
                    other = owner.get(alias.lower())
                    self.assertIn(other, (None, b.code), f'{campus} {b.code}: alias {alias!r}')

    def test_every_official_code_finds_its_building(self):
        # umd.io publishes the university's building list with its official
        # codes. Where TerpNav shows a different code, or none, the official
        # one has to be an alias.
        official = {
            building_number(rec['id']): rec['code']
            for rec in load(RAW / 'umdio_buildings.json') if rec['code']
        }
        number_of = {
            b['acronym']: building_number(b.get('gis_id') or b['acronym'])
            for b in source_records('umd')
        }
        missing = []
        for b in Building.objects.filter(campus='umd'):
            code = official.get(number_of[b.code])
            if not code or b.code in OFFICIAL_CODE_EXCEPTIONS:
                continue
            known = {b.code.lower(), *(alias.lower() for alias in b.aliases)}
            if code.lower() not in known:
                missing.append((b.code, code))
        self.assertEqual(missing, [])


class AliasDataFileTests(SimpleTestCase):
    def test_aliases_are_clean_lists_of_names(self):
        for campus in CAMPUSES:
            for record in source_records(campus):
                aliases = record.get('aliases', [])
                where = f"{campus} {record['acronym']}"
                self.assertIsInstance(aliases, list, where)
                own = {record['acronym'].lower(), record['full_name'].lower()}
                seen = set()
                for alias in aliases:
                    self.assertIsInstance(alias, str, where)
                    self.assertEqual(alias, alias.strip(), where)
                    self.assertTrue(alias, where)
                    self.assertNotIn(alias.lower(), own, f'{where}: {alias!r} is already its name')
                    self.assertNotIn(alias.lower(), seen, f'{where}: {alias!r} is listed twice')
                    seen.add(alias.lower())

    def test_state_file_carries_exactly_the_aliases_in_building_aliases_json(self):
        # buildings_gis.json is generated. This fails if building_aliases.json
        # was edited without re-running scripts/transform_gis.py.
        wanted = load(SCRIPTS / 'building_aliases.json')
        gis = {b['acronym']: b for b in load(campus_data_dir('umd') / 'buildings_gis.json')}
        self.assertEqual(sorted(set(wanted) - set(gis)), [], 'aliases for buildings the state file lacks')
        for code, building in gis.items():
            self.assertEqual(building.get('aliases', []), wanted.get(code, []), code)

    def test_snapshot_is_the_one_the_manifest_describes(self):
        manifest = load(RAW / 'MANIFEST.json')
        for entry in manifest['files']:
            content = (RAW / entry['file']).read_bytes()
            self.assertEqual(hashlib.sha256(content).hexdigest(), entry['sha256'], entry['file'])
            self.assertEqual(len(json.loads(content)), entry['records'], entry['file'])

    def test_stadium_position_comes_from_the_snapshot(self):
        # Official building number 364. The coordinates are not typed by hand.
        record = next(r for r in load(RAW / 'umdio_buildings.json') if r['id'] == '364')
        stadium = next(b for b in source_records('umd') if b['acronym'] == 'SECU')
        self.assertEqual(stadium['gis_id'], 'B364')
        self.assertEqual(stadium['latitude'], round(record['lat'], 6))
        self.assertEqual(stadium['longitude'], round(record['long'], 6))
        self.assertIn(record['code'], stadium['aliases'])
        self.assertTrue(re.fullmatch(r'[A-Z]+', record['code']))
