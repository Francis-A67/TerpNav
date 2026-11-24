"""Small geometry helpers for building and parking coordinates."""
import math


def ring_area_and_centroid(points):
    """Signed area and area-weighted center of a closed ring of (lon, lat) points.

    Works in plain degrees, which is accurate enough at the size of a building.
    A ring with no area (a line or a single point) falls back to the average.
    """
    area = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(points, points[1:] + points[:1]):
        cross = x1 * y2 - x2 * y1
        area += cross
        cx += (x1 + x2) * cross
        cy += (y1 + y2) * cross
    if abs(area) < 1e-14:
        n = len(points)
        return 0.0, (sum(p[0] for p in points) / n, sum(p[1] for p in points) / n)
    return area / 2, (cx / (3 * area), cy / (3 * area))


def combined_centroid(rings):
    """Center of several rings together, each weighted by its area."""
    parts = [ring_area_and_centroid(ring) for ring in rings if ring]
    if not parts:
        return None
    total = sum(abs(area) for area, _ in parts)
    if total == 0:
        n = len(parts)
        return sum(c[0] for _, c in parts) / n, sum(c[1] for _, c in parts) / n
    lon = sum(abs(area) * c[0] for area, c in parts) / total
    lat = sum(abs(area) * c[1] for area, c in parts) / total
    return lon, lat


def distance_m(lat1, lon1, lat2, lon2):
    """Great-circle distance in metres (haversine)."""
    radius = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))
