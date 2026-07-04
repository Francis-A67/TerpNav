"""
Converts the raw Maryland GIS building footprints (buildings.json, produced by
Network.js) into the flat JSON format that sync_buildings expects.

Input:  scripts/buildings.json  — GeoJSON-like, polygons in Web Mercator (EPSG:3857)
Output: data/buildings_gis.json — one object per building with lat/lon centroid

Run from the backend/ directory:
    python buildings/scripts/transform_gis.py
"""

import json
import math
from pathlib import Path

INPUT = Path(__file__).parent / 'buildings.json'
ADDRESSES = Path(__file__).parent / 'osm_addresses.json'  # gis_id -> street address, from OpenStreetMap
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
        buildings.append({
            'acronym': code,   # e.g. B164 — no acronyms in GIS data
            'full_name': name,
            'department': '',
            'description': '',
            'address': addresses.get(code, ''),
            'latitude': lat,
            'longitude': lon,
            'hours': '',
        })

    buildings.sort(key=lambda b: b['full_name'])

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(buildings, f, indent=2)

    print(f'Wrote {len(buildings)} buildings to {OUTPUT}')


if __name__ == '__main__':
    main()
