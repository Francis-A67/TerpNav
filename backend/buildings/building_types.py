"""Canonical building categories and the heuristic that assigns them.

Imported by models.py (field choices) and by scripts/transform_gis.py, which
regenerates buildings_gis.json on every deploy and so must re-derive the type.
Keep the category list in sync with src/utils/buildingTypes.js on the frontend.
"""

import re

BUILDING_TYPE_VALUES = [
    'Academic',
    'Library',
    'Dining',
    'Student Life',
    'Athletics',
    'Residence',
    'Administrative',
]

BUILDING_TYPES = [(value, value) for value in BUILDING_TYPE_VALUES]


def classify(name, department=''):
    """Best-effort category from a building's name and department.
    Order matters: the most specific signal wins."""
    n = (name or '').lower()
    d = (department or '').lower()

    if 'librar' in n or 'librar' in d:
        return 'Library'
    if 'dining' in d or 'dining hall' in n or re.search(r'\bdiner\b', n):
        return 'Dining'
    if re.search(r'resident life|residential', d) or re.search(
            r'\bapartments?\b|graduate (hills|gardens)|courtyards', n):
        return 'Residence'
    if 'athletic' in d or 'recreation' in d or re.search(
            r'stadium|arena|\bfield\b|\bcourts?\b|gymnasium|natatorium|golf|tennis'
            r'|track|xfinity|ludwig|shipley|comcast|boat house', n):
        return 'Athletics'
    if re.search(r'student affairs|student life|greek life|health services', d) or re.search(
            r'student union|stamp\b|health center|counseling|career center|chapel|cultural center', n):
        return 'Student Life'
    # Research facilities read as Academic even when run by an admin unit.
    if 'research' in n or 'research' in d:
        return 'Academic'
    if re.search(r'administration|facilities|public safety|human resources|extension'
                 r'|business services|university system of maryland|umgc', d) or re.search(
            r'administration building|police|fire station|central utility|power plant', n):
        return 'Administrative'
    return 'Academic'
