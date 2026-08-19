"""
Converts the raw Maryland GIS building footprints (buildings.json, produced by
Network.js) into the flat JSON format that sync_buildings expects.

Input:  scripts/buildings.json (GeoJSON-like, polygons in Web Mercator EPSG:3857)
Output: data/buildings_gis.json (one object per building with lat/lon centroid)

Run from the backend/ directory:
    python buildings/scripts/transform_gis.py
"""

import json
import math
import sys
from pathlib import Path

# backend/ on the path so this standalone script can share the classifier
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from buildings.building_types import classify  # noqa: E402

INPUT = Path(__file__).parent / 'buildings.json'
ADDRESSES = Path(__file__).parent / 'osm_addresses.json'  # gis_id -> street address, from OpenStreetMap
INFO = Path(__file__).parent / 'building_info.json'       # gis_id -> department/description/hours
IMAGES = Path(__file__).parent / 'building_images.json'   # gis_id -> Wikimedia Commons photo URL
OUTPUT = Path(__file__).parent.parent / 'data' / 'buildings_gis.json'

# Earth radius used by the Web Mercator projection
R = 6378137.0


def to_latlng(x, y):
    """Convert Web Mercator metres to (latitude, longitude) in degrees."""
    lon = x * 180 / (math.pi * R)
    lat = math.degrees(math.atan(math.sinh(y / R)))
    return round(lat, 6), round(lon, 6)


def ring_centroid(ring):
    """Simple centroid: average of all polygon vertices."""
    n = len(ring)
    return sum(p[0] for p in ring) / n, sum(p[1] for p in ring) / n


def main():
    with open(INPUT, encoding='utf-8') as f:
        data = json.load(f)

    addresses = {}
    if ADDRESSES.exists():
        with open(ADDRESSES, encoding='utf-8') as f:
            addresses = json.load(f)

    info = {}
    if INFO.exists():
        with open(INFO, encoding='utf-8') as f:
            info = json.load(f)

    images = {}
    if IMAGES.exists():
        with open(IMAGES, encoding='utf-8') as f:
            images = json.load(f)

    features = data.get('features', [])
    buildings = []

    for feat in features:
        attrs = feat.get('attributes', {})
        name = (attrs.get('NAME') or '').strip()
        building_id = str(attrs.get('BUILDINGID', '')).strip()

        if not name or not building_id:
            continue

        geom = feat.get('geometry')
        if not geom or not geom.get('rings'):
            continue

        cx, cy = ring_centroid(geom['rings'][0])
        lat, lon = to_latlng(cx, cy)

        code = f'B{building_id}'
        extra = info.get(code, {})
        buildings.append({
            'acronym': code,   # e.g. B164; GIS data has no acronyms
            'full_name': name,
            'type': classify(name, extra.get('department', '')),
            'department': extra.get('department', ''),
            'description': extra.get('description', ''),
            'address': addresses.get(code, ''),
            'latitude': lat,
            'longitude': lon,
            'hours': extra.get('hours', ''),
            'image_url': images.get(code, ''),
        })

    buildings.sort(key=lambda b: b['full_name'])

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(buildings, f, indent=2)

    print(f'Wrote {len(buildings)} buildings to {OUTPUT}')


if __name__ == '__main__':
    main()
