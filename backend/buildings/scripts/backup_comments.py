"""
Back up every comment through the public API. No database password needed.

Comments are the only production data that cannot be rebuilt from the JSON
files in this repo, so take a backup before any deploy that changes the
database schema.

Run from the backend/ directory:
    python buildings/scripts/backup_comments.py              # UMD
    python buildings/scripts/backup_comments.py umd towson   # once Towson is live

Writes backend/comments_backup_<date>.json (git-ignored). The script only
sends GET requests, about one a second, so a full run takes a few minutes.
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

API = 'https://terpnav.onrender.com'
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
PAUSE_SECONDS = 1.2        # the API allows 60 requests a minute per IP
RETRIES = 12               # the free-tier server can take a minute to wake up
RETRY_PAUSE_SECONDS = 10


def get_json(path, campus):
    query = urllib.parse.urlencode({'campus': campus})
    url = f'{API}{path}?{query}'
    request = urllib.request.Request(url, headers={'User-Agent': 'terpnav-comment-backup'})
    for attempt in range(1, RETRIES + 1):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as err:
            # A 4xx means the server is awake and said no, so retrying will not
            # help. 429 is the exception: we went too fast, so wait and retry.
            if err.code < 500 and err.code != 429:
                raise
            problem = f'HTTP {err.code}'
        except (urllib.error.URLError, TimeoutError) as err:
            problem = str(err)
        print(f'  {problem}; retry {attempt}/{RETRIES} in {RETRY_PAUSE_SECONDS}s')
        time.sleep(RETRY_PAUSE_SECONDS)
    raise SystemExit(f'Gave up on {url}')


def backup_campus(campus):
    buildings = get_json('/api/buildings/', campus)
    print(f'{campus}: checking {len(buildings)} buildings')
    comments = []
    for count, building in enumerate(buildings, start=1):
        code = building['acronym']
        time.sleep(PAUSE_SECONDS)
        try:
            found = get_json(f'/api/buildings/{urllib.parse.quote(code, safe="")}/comments/', campus)
        except urllib.error.HTTPError as err:
            print(f'  {code}: skipped (HTTP {err.code})')
            continue
        comments.extend({'building': code, **comment} for comment in found)
        if found:
            print(f'  {code}: {len(found)} comment(s)')
        if count % 25 == 0:
            print(f'  checked {count}/{len(buildings)}')
    return {'buildings_checked': len(buildings), 'comments': comments}


def main():
    campuses = sys.argv[1:] or ['umd']
    backup = {
        'api': API,
        'fetched_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'campuses': {campus: backup_campus(campus) for campus in campuses},
    }
    out = BACKEND_DIR / f'comments_backup_{date.today().isoformat()}.json'
    out.write_text(json.dumps(backup, indent=2, ensure_ascii=False), encoding='utf-8')
    total = sum(len(c['comments']) for c in backup['campuses'].values())
    print(f'Saved {total} comment(s) to {out}')


if __name__ == '__main__':
    main()
