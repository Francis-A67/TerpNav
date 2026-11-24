"""
Build the Towson data files that sync_buildings loads:

    data/towson/buildings.json
    data/towson/parking.json
    data/towson/provenance.json

Hand-written facts (names, types, departments, notes) live next to this script
in buildings_curated.json and parking_curated.json. Coordinates and street
addresses are NOT typed by hand: they are computed here from the snapshots in
raw/ (see fetch_sources.py), so each one can be traced to its source, and
provenance.json records that source for every record.

Run from the backend/ directory:
    python buildings/scripts/towson/build_data.py

The build stops with an error if a record points at a source that is missing
or named differently than expected, so a wrong ID cannot slip through.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BACKEND = HERE.parent.parent.parent
sys.path.insert(0, str(BACKEND))
from buildings.building_types import BUILDING_TYPE_VALUES  # noqa: E402
from buildings.geo import combined_centroid, distance_m  # noqa: E402

RAW = HERE / 'raw'
OUT = BACKEND / 'buildings' / 'data' / 'towson'

LEGEND_URL = 'https://www.towson.edu/maps/documents/campus-map.pdf'
OSM_FILES = ['osm_buildings.json', 'osm_buildings_uptown.json', 'osm_leisure.json', 'osm_parking.json']
# Two sources for the same building should agree to within this many metres.
AGREE_WITHIN_M = 40

problems = []


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def osm_index():
    """Every OpenStreetMap element in the snapshots, keyed like 'way/45778622'."""
    index = {}
    for name in OSM_FILES:
        path = RAW / name
        if not path.exists():
            continue
        for element in load(path)['elements']:
            index[f"{element['type']}/{element['id']}"] = element
    return index


def osm_rings(element):
    if element['type'] == 'node':
        return [[(element['lon'], element['lat'])]]
    if 'geometry' in element:
        return [[(p['lon'], p['lat']) for p in element['geometry']]]
    rings = [
        [(p['lon'], p['lat']) for p in member['geometry']]
        for member in element.get('members', []) if member.get('geometry')
    ]
    if rings:
        return rings
    # A relation saved without its outline still carries its bounding box.
    b = element['bounds']
    return [[(b['minlon'], b['minlat']), (b['maxlon'], b['minlat']),
             (b['maxlon'], b['maxlat']), (b['minlon'], b['maxlat'])]]


def imap_index():
    """State GIS building outlines grouped by name."""
    index = {}
    for feature in load(RAW / 'imap_tu_buildings.json')['features']:
        name = feature['attributes']['BuildingName']
        ring = [(p[0], p[1]) for p in feature['geometry']['rings'][0]]
        index.setdefault(name, []).append(ring)
    return index


def as_list(value):
    if not value:
        return []
    return value if isinstance(value, list) else [value]


def locate(record, osm, imap, label):
    """Coordinates for one curated record, plus where they came from."""
    osm_point = imap_point = None
    refs = as_list(record.get('osm'))
    elements = []
    for ref in refs:
        element = osm.get(ref)
        if element is None:
            problems.append(f'{label}: {ref} is not in the OpenStreetMap snapshot')
            continue
        expected = record.get('osm_name')
        actual = element['tags'].get('name', '')
        if expected and actual != expected:
            problems.append(f'{label}: {ref} is named {actual!r}, expected {expected!r}')
            continue
        elements.append(element)
    if elements:
        lon, lat = combined_centroid([ring for e in elements for ring in osm_rings(e)])
        osm_point = (round(lat, 6), round(lon, 6))

    imap_name = record.get('imap')
    if imap_name:
        if imap_name not in imap:
            problems.append(f'{label}: {imap_name!r} is not in the state GIS snapshot')
        else:
            lon, lat = combined_centroid(imap[imap_name])
            imap_point = (round(lat, 6), round(lon, 6))

    source = {}
    point = osm_point or imap_point
    if osm_point:
        source['coordinates'] = 'OpenStreetMap ' + ', '.join(refs)
        if record.get('osm_name'):
            source['openstreetmap_name'] = record['osm_name']
    elif imap_point:
        source['coordinates'] = f'Maryland iMAP TU Building Footprints: {imap_name}'
    else:
        source['coordinates'] = 'none yet'
    if osm_point and imap_point:
        gap = round(distance_m(*osm_point, *imap_point))
        source['second_opinion'] = f'Maryland iMAP TU Building Footprints: {imap_name} ({gap} m away)'
        if gap > AGREE_WITHIN_M and not record.get('sources_disagree_ok'):
            problems.append(f'{label}: OpenStreetMap and state GIS are {gap} m apart')
    return point, elements, source


def osm_address(elements):
    for element in elements:
        tags = element['tags']
        if tags.get('addr:housenumber') and tags.get('addr:street'):
            street = f"{tags['addr:housenumber']} {tags['addr:street']}"
            city = tags.get('addr:city', 'Towson')
            zip_code = tags.get('addr:postcode', '')
            return f'{street}, {city}, MD {zip_code}'.strip()
    return ''


def build_buildings(osm, imap, official):
    known = set(official['codes']) | set(official['not_in_legend'])
    curated = load(HERE / 'buildings_curated.json')
    buildings, provenance, seen = [], {}, set()

    for record in curated:
        code = record['acronym']
        label = f'building {code}'
        if code not in known:
            problems.append(f'{label}: not an official Towson building code')
        if code in seen:
            problems.append(f'{label}: listed twice')
        seen.add(code)
        if record['type'] not in BUILDING_TYPE_VALUES:
            problems.append(f"{label}: unknown type {record['type']!r}")

        point, elements, source = locate(record, osm, imap, label)
        address = record.get('address') or osm_address(elements)
        if address:
            source['address'] = 'curated' if record.get('address') else 'OpenStreetMap address tags'

        buildings.append({
            'acronym': code,
            'full_name': record['full_name'],
            'type': record['type'],
            'department': record.get('department', ''),
            'description': record.get('description', ''),
            'address': address,
            'latitude': point[0] if point else None,
            'longitude': point[1] if point else None,
            'hours': record.get('hours', ''),
            'image_url': record.get('image_url', ''),
        })
        provenance[code] = {
            'name_and_code': LEGEND_URL,
            **source,
            'facts': record.get('sources', []),
            'to_verify': record.get('to_verify', []),
        }

    for code in sorted(known - seen):
        problems.append(f'building {code}: official code with no curated record')
    return buildings, provenance


def build_parking(osm):
    curated = load(HERE / 'parking_curated.json')
    lots, provenance, seen = [], {}, set()
    for record in curated:
        code = record['code']
        label = f'parking {code}'
        if code in seen:
            problems.append(f'{label}: listed twice')
        seen.add(code)
        point, _elements, source = locate(record, osm, {}, label)
        if point is None:
            problems.append(f'{label}: no coordinates')
            continue
        if len(record.get('note', '')) > 300:
            problems.append(f'{label}: note is longer than 300 characters')
        # A facility may only be called free after hours when an official rule
        # says so: 'published'. 'unconfirmed' (no published rule) and 'never'
        # (restricted at all times) must stay marked as not free.
        rule = record.get('after_hours_rule')
        if rule not in ('published', 'unconfirmed', 'never'):
            problems.append(f'{label}: after_hours_rule must be published, unconfirmed or never')
        elif record['free_after_hours'] and rule != 'published':
            problems.append(f'{label}: marked free after hours, but its rule is {rule}')
        lots.append({
            'code': code,
            'name': record['name'],
            'kind': record['kind'],
            'latitude': point[0],
            'longitude': point[1],
            'note': record.get('note', ''),
            'free_after_hours': record['free_after_hours'],
        })
        provenance[code] = {
            **source,
            'after_hours_rule': rule,
            'facts': record.get('sources', []),
            'to_verify': record.get('to_verify', []),
        }
    return lots, provenance


def write(path, payload):
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def build():
    """Everything main() writes, built in memory. The data tests call this to
    check that the committed files are exactly what the sources produce."""
    problems.clear()
    osm, imap = osm_index(), imap_index()
    official = load(HERE / 'official_codes.json')
    manifest = load(RAW / 'MANIFEST.json')

    buildings, building_sources = build_buildings(osm, imap, official)
    lots, parking_sources = build_parking(osm)
    provenance = {
        'about': 'Where every Towson record comes from. Written by scripts/towson/build_data.py; do not edit by hand.',
        'snapshots_fetched_at': manifest['fetched_at'],
        'official_codes': official['source'],
        'buildings': building_sources,
        'parking': parking_sources,
    }
    return buildings, lots, provenance, list(problems)


def main():
    buildings, lots, provenance, found = build()

    if found:
        print('Not written. Fix these first:')
        for problem in found:
            print('  -', problem)
        raise SystemExit(1)

    OUT.mkdir(parents=True, exist_ok=True)
    write(OUT / 'buildings.json', buildings)
    write(OUT / 'parking.json', lots)
    write(OUT / 'provenance.json', provenance)

    without_point = [b['acronym'] for b in buildings if b['latitude'] is None]
    print(f'Wrote {len(buildings)} buildings and {len(lots)} parking locations to {OUT}')
    if without_point:
        print(f'  No coordinates yet (listed, but not on the map): {", ".join(without_point)}')


if __name__ == '__main__':
    main()
