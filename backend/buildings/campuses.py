"""The campuses TerpNav knows about.

One rule everywhere: no prefix means the default campus. UMD keeps the URLs,
API calls and data files it always had; every other campus is namespaced by
its slug (?campus=towson, data/towson/...).

Keep the slugs in sync with src/campuses/index.js on the frontend.
"""
from pathlib import Path

CAMPUSES = {
    'umd': 'University of Maryland',
    'towson': 'Towson University',
}

DEFAULT_CAMPUS = 'umd'

DATA_DIR = Path(__file__).resolve().parent / 'data'


def campus_data_dir(campus):
    """Folder holding a campus's JSON files: data/ for UMD, data/<slug>/ otherwise."""
    return DATA_DIR if campus == DEFAULT_CAMPUS else DATA_DIR / campus
