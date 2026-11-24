"""
Download the raw sources the Towson data is built from and checked against.

The files written to raw/ are unedited copies of what the public services
returned (only re-indented), so every coordinate in data/towson/*.json can be
traced back to them. Nothing in raw/ is ever edited by hand.

Run from the backend/ directory:
    python buildings/scripts/towson/fetch_sources.py

Sources
- Maryland iMAP, MD_CampusFacilities: the same state service the UMD data
  came from. Layers: TU building footprints, TU parking lots, TU campus
  boundary. The building layer is several years old and is used as a second
  opinion, not as the building list.
- OpenStreetMap through the Overpass API: named buildings and every parking
  area around campus, with full outlines. (c) OpenStreetMap contributors, ODbL.
"""
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RAW_DIR = Path(__file__).resolve().parent / 'raw'
USER_AGENT = 'terpnav-data-fetch (https://terpnav.com)'

IMAP = 'https://mdgeodata.md.gov/imap/rest/services/Structure/MD_CampusFacilities/MapServer'
IMAP_LAYERS = {
    'imap_tu_buildings.json': 4,   # TU Building Footprints
    'imap_tu_parking.json': 5,     # TU Parking Lots
    'imap_tu_boundary.json': 8,    # TU Campus Boundary
}

OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
]
# Boxes are south,west,north,east. The uptown box covers the Towson buildings
# north of the main campus (Armory, 401 Washington Ave, One Olympic Place).
CAMPUS_BOX = '39.382,-76.627,39.398,-76.602'
UPTOWN_BOX = '39.398,-76.610,39.406,-76.596'
OVERPASS_QUERIES = {
    'osm_buildings.json': f'[out:json][timeout:90];nwr[building][name]({CAMPUS_BOX});out tags geom;',
    'osm_buildings_uptown.json': f'[out:json][timeout:90];nwr[building][name]({UPTOWN_BOX});out tags geom;',
    'osm_parking.json': f'[out:json][timeout:90];nwr[amenity=parking]({CAMPUS_BOX});out tags geom;',
    # Stadiums, fields and courts are mapped as leisure areas, not buildings.
    'osm_leisure.json': f'[out:json][timeout:90];nwr[leisure]({CAMPUS_BOX});out tags geom;',
}


def fetch_json(url, data=None, tries=4):
    request = urllib.request.Request(url, data=data, headers={'User-Agent': USER_AGENT})
    for attempt in range(1, tries + 1):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
            if attempt == tries:
                raise
            wait = 15 * attempt
            print(f'    {err}; trying again in {wait}s')
            time.sleep(wait)


def fetch_imap_layer(layer):
    """All features of one layer, as longitude/latitude (EPSG:4326)."""
    features = []
    while True:
        query = urllib.parse.urlencode({
            'where': '1=1',
            'outFields': '*',
            'returnGeometry': 'true',
            'outSR': '4326',
            'f': 'json',
            'resultOffset': len(features),
        })
        url = f'{IMAP}/{layer}/query?{query}'
        page = fetch_json(url)
        if 'error' in page:
            raise SystemExit(f'iMAP layer {layer} returned an error: {page["error"]}')
        features.extend(page.get('features', []))
        if not page.get('exceededTransferLimit') or not page.get('features'):
            page['features'] = features
            return page, f'{IMAP}/{layer}'


def fetch_overpass(query):
    body = urllib.parse.urlencode({'data': query}).encode()
    last_error = None
    for server in OVERPASS_SERVERS:
        try:
            return fetch_json(server, data=body), server
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
            print(f'    {server} failed ({err}); trying the next server')
            last_error = err
    raise SystemExit(f'Every Overpass server failed: {last_error}')


def save(name, payload):
    text = json.dumps(payload, indent=1, ensure_ascii=False) + '\n'
    (RAW_DIR / name).write_text(text, encoding='utf-8')
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        'fetched_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'files': [],
    }

    for name, layer in IMAP_LAYERS.items():
        print(f'iMAP layer {layer} -> {name}')
        payload, source = fetch_imap_layer(layer)
        count = len(payload['features'])
        manifest['files'].append({
            'file': name, 'source': source, 'records': count, 'sha256': save(name, payload),
        })
        print(f'    {count} features')

    for name, query in OVERPASS_QUERIES.items():
        print(f'Overpass -> {name}')
        payload, server = fetch_overpass(query)
        count = len(payload.get('elements', []))
        manifest['files'].append({
            'file': name, 'source': server, 'query': query, 'records': count,
            'sha256': save(name, payload),
        })
        print(f'    {count} elements')
        time.sleep(5)   # be polite to the shared Overpass servers

    (RAW_DIR / 'MANIFEST.json').write_text(
        json.dumps(manifest, indent=2) + '\n', encoding='utf-8',
    )
    print(f'Done. Files are in {RAW_DIR}')


if __name__ == '__main__':
    main()
