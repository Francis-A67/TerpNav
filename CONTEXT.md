# TerpNav - Project Context

## What it is

A web app that helps students and visitors find campus buildings by name or code,
get directions, save favorites, leave anonymous comments, explore buildings on an
interactive Leaflet map, and find parking (with a live free-parking indicator).
No user accounts - everything is open and anonymous. Live at https://terpnav.com.

It covers two campuses: the University of Maryland (UMD), and Towson University, which
is built and switched off until launch (see "Campuses" below).

---

## Campuses

**One rule everywhere: no prefix means UMD. Every other campus is namespaced by its slug.**
Nothing that existed before Towson moved or was renamed, so old UMD links, the keep-alive
ping and saved buildings keep working.

| Layer | UMD | Towson |
|-------|-----|--------|
| Page URL | `/buildings`, `/building/IRB` (`/umd/...` also works) | `/towson/buildings`, `/towson/building/LA` |
| API | `/api/buildings/` | `/api/buildings/?campus=towson` |
| Data files | `backend/buildings/data/*.json` | `backend/buildings/data/towson/*.json` |
| Saved buildings (localStorage) | `savedBuildings` | `savedBuildings:towson` |

- **Registry:** `backend/buildings/campuses.py` and `src/campuses/index.js` list the campuses.
  Keep the slugs in sync (same pattern as the building types).
- **Per-campus config:** `src/campuses/umd.js` and `src/campuses/towson.js` hold everything
  campus-specific the pages show: names, map center, hero photo and credit, search examples,
  data credits, and the parking rules (`isFreePeriod`, `lotStatus`, labels, legend, banner).
  Pages read it through `useCampus()`; they contain no campus names or numbers themselves.
- **Switch:** Towson is only reachable when `VITE_ENABLE_TOWSON=true` (in `.env` locally, in
  Vercel's Environment Variables for the live site, followed by a redeploy). With it off the
  site is UMD only: no switcher, no `/towson` pages. It is the launch button and the off button.
- **Switcher:** a native `<select>` in the navbar (`CampusSwitcher.jsx`). It keeps you on the
  same kind of page; from a building page it goes to the other campus's home. The last campus
  viewed is remembered, and opening bare terpnav.com sends a returning Towson visitor to `/towson`.
- **Theme:** components use CSS variables (`--accent`, `--on-accent`, `--accent-text`, ...)
  defined in `src/index.css`. Towson overrides them under `[data-campus='towson']` (official
  gold `#FFBB00` and black `#151500`; gold fills carry black text because white on gold is
  unreadable).

**Adding another campus:** add the slug to both registries; create `src/campuses/<slug>.js`
(the shape test in `index.test.js` lists every required field); add a theme block in
`index.css`; put `buildings.json` and `parking.json` in `backend/buildings/data/<slug>/`;
add campus rules to `CAMPUS_RULES` in `sync_buildings.py` only if it needs exclusions.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, CSS Modules, React Router v7 |
| Backend | Django 6, Django REST Framework |
| Database | SQLite (dev) → PostgreSQL on Render (production) |
| HTTP client | Axios |
| Map | react-leaflet + Leaflet.js (OpenStreetMap tiles, free) |
| Deploy | Vercel (frontend) + Render (backend + PostgreSQL) |

---

## Running Locally

**Backend** (from `backend/`):
```bash
pip install -r requirements.txt
python manage.py migrate                    # also needed after pulling a new migration
python buildings/scripts/transform_gis.py   # converts UMD GIS polygons → lat/lon
python manage.py sync_buildings             # loads every campus's JSON into the DB
python manage.py runserver                  # http://localhost:8000
```

**Frontend** (from project root):
```bash
npm install
npm run dev                                 # http://localhost:5173
```

**Tests and checks:**
```bash
python manage.py test        # backend: API, sync, campus separation, aliases, Towson data checks
npm test                     # frontend: search, parking rules, campus links, saved buildings
npm run lint && npm run build
```

**Environment files:**
- Copy `backend/.env.example` → `backend/.env` (dev defaults work out of the box)
- Copy `.env.example` → `.env` (sets `VITE_API_URL=http://localhost:8000` and
  `VITE_ENABLE_TOWSON=true`)

If every building request fails locally with "no such column", the local database is behind:
run `python manage.py migrate` and `python manage.py sync_buildings`.

---

## API Endpoints

Every endpoint takes an optional `?campus=<slug>`. Leaving it out means UMD; an unknown
campus is a 404.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/buildings/` | A campus's buildings - supports `?search=query` (code, name, department, aliases), each record carries `campus`, `type` and `aliases` |
| GET | `/api/buildings/<acronym>/` | Single building detail |
| GET | `/api/buildings/tips/<acronym>/` | Read-only tips for a building |
| GET | `/api/buildings/<acronym>/comments/` | Anonymous comments |
| GET | `/api/parking/` | A campus's parking lots & garages |
| POST | `/api/buildings/<acronym>/comments/` | Post a comment (10/hr per IP) |

---

## Feature Status

| Feature | Status |
|---------|--------|
| Building search | Done - one search for Home, Buildings and Map (`src/utils/search.js`): code, name, nickname, official building code, department, description, and close matches for misspellings. Backend `?search=` also matches aliases |
| Search help when nothing is found | Done - "Missing a place? Tell us" (feedback form), and a link to Parking when the search looks like a parking one |
| Building type filter chips | Done - multi-select on /buildings, composes with search |
| Building detail page (info + directions) | Done - the Hours row is hidden when a building has none |
| Saved buildings (localStorage) | Done - one list per campus |
| Student tips (read-only from JSON) | Done - UMD only; none are invented for Towson |
| Anonymous comments (stored in DB) | Done - rate-limited 10/hr per IP |
| Interactive map (Leaflet) | Done - centered per campus |
| Navbar (Home / Buildings / Map / Parking / Saved) | Done - logo clicks home, no accounts |
| UMD: 200 buildings | Done - 68 curated (full detail) + 132 from state GIS (name + location). 68 of them carry search aliases |
| UMD: 135 parking locations | Done - 127 lots + 8 garages, free-now indicator |
| Towson: 63 buildings | Built - official two-letter codes; 61 on the map (LX and TX have no coordinates yet) |
| Towson: 21 parking locations | Built - 4 garages + 17 lots, 2026-27 rules |
| Campus switcher and Towson theme | Built - behind `VITE_ENABLE_TOWSON` |
| Live search on home hero | Done - grid filters as you type |
| Building images | UMD: 16 Commons photos + aerial fallback (Esri). Towson: aerial fallback only so far |
| Hero background photo | Done - one per campus, credited |
| Parking list page (/parking tab) | Done - searchable, garages vs lots, status banner |
| Mobile responsive | Done - 3→2→1 grids @768/520px; navbar drops to two rows when the switcher shows |
| Security hardening | Done - deps patched, throttle spoof fix, security headers |
| Copyright footer + data attribution | Done - data credits come from the campus config |
| Feedback link (Google Form) | Done - in the footer, so every page except Map |
| 404 page | Done - unknown links used to render a blank screen |
| Tests | Done - 78 backend tests (`manage.py test`), 79 frontend tests (`npm test`) |
| Not-affiliated notice | Done - footer and map legend |
| Comments switch per campus | Done - `COMMENTS_DISABLED_CAMPUSES` |
| Deployment config | Done - Procfile, whitenoise, dj-database-url |

---

## Building & Parking Data

The production DB is rebuilt reproducibly from committed JSON on every deploy -
no hand-edited database. `sync_buildings` loops over the campuses and scopes every
write and delete to one campus, so campuses cannot overwrite each other even when
they share a code.

### UMD (`backend/buildings/data/`)

Pipeline (merged by `transform_gis.py` + `sync_buildings`):

1. **`data/buildings.json`** - 68 hand-curated buildings with real acronyms (IRB, STAMP,
   PCH, Y, SECU, etc.), departments, descriptions, addresses, hours, and photo URLs. These
   take priority; each one names the GIS record it replaces (`gis_id`, which is also the
   official building number).
   - One more record, `B257`, has no acronym of its own. It shares its code with a state
     record, so it corrects that record in place: the state still calls the building
     "Ellicott Area Dining Hall", and it is now Ellicott Community Center, home of North
     Campus Market. Same row, same URL, comments kept. Use this form (state number as the
     acronym, no `gis_id`) to fix a state record without giving it a new code.
   - `aliases` (optional, on 22 records): what people type that is not the name. See
     "Aliases" below.

2. **`data/buildings_gis.json`** - 308 buildings auto-generated from Maryland's official
   GIS API (`mdgeodata.md.gov`): polygon footprints → lat/lon centroids, codes like `B164`.
   `transform_gis.py` regenerates it from `scripts/buildings.json` and merges four
   enrichment files (all keyed by gis_id):
   - `scripts/osm_addresses.json` - 207 street addresses from OpenStreetMap (Overpass),
     matched by centroid proximity + name similarity
   - `scripts/building_info.json` - department/description/hours for all GIS-only
     buildings (hand-written for ~40 notable, category templates for the rest)
   - `scripts/building_images.json` - Wikimedia Commons photo URLs
   - `scripts/building_aliases.json` - aliases for 46 GIS-only buildings (official codes
     such as LPA for La Plata Hall). After editing it, run `transform_gis.py`; a test
     fails if `buildings_gis.json` does not carry exactly these aliases

3. **`data/parking.json`** - 127 surface lots (official DOTS P-codes/coords via umd.io)
   + 8 garages. Free-parking logic (lots free 4pm–7am weekdays + weekends) lives in
   `src/campuses/umd.js`.

Both JSON sources carry a `type` (Academic / Library / Dining / Student Life / Athletics /
Residence / Administrative) that drives the filter chips on /buildings. `sync_buildings`
warns about any type it does not recognize. It loads GIS data first, then curated data
overwrites matches and deletes duplicate GIS entries (via `gis_id`), skips about 117
non-destination structures (sheds, substations, gates), then syncs parking. Buildings
without a real photo get an Esri World Imagery aerial view at render time.

**Aliases** (`Building.aliases`, a list, migration 0008). An alias is something people type
to find a building that is listed under another name. Aliases are searched and never
displayed. Three kinds are in the data:
- Nicknames in common use: "The Y", "gym" (Eppley), "CS building" (Iribe), "The Clarice".
- Former and full official names: "Comcast Center", "Mathematics Building", "Byrd Stadium",
  "Adele H. Stamp Student Union". An office that people search for by name counts too:
  "Registrar" (Mitchell Building), "Financial Aid" (Lee Building).
- The university's official building code, where ours differs: 13 curated buildings (ours /
  official: McKK/MCK, STAMP/SSU, KIM/KEB, CLARICE/PAC, ERC/CRC, LFR/LEF, RCO/RIT, NYM/NCC,
  KGHT/KNI, BSB/BRB, MATH/MTH, COLE/COL, SOUTH/SDH) and 46 GIS-only buildings that show no
  code at all (most residence halls, ANS, ATL, EGL, JUL, ...). Annapolis, Oakland and
  Prince Frederick halls and the apartment communities (Leonardtown, South Campus Commons,
  the Courtyards) have no code in the list. COL is right for Jones-Hill House: the
  university's facilities site lists building 162 as "Cole Student Activities Building".
  Live Fall 2026 class sections confirm six of these codes so far: ANS, ATL, CCC, KNI, LEF
  and MTH.

Where the official codes come from: `scripts/raw/umdio_buildings.json`, an unedited copy of
umd.io's building list (`api.umd.io/v1/map/buildings`, 421 records, fetched 2026-11-17;
`MANIFEST.json` holds the URL and checksum). It is joined to our records by official
building number. A test fails if a served building has an official code there that is
neither its acronym nor one of its aliases, so a refreshed snapshot shows what is missing.
Known limits of that list: its names are stale (Byrd Stadium, Comcast Center, The Diner),
and it still gives the Atlantic Building its old code CSS (ATL is the one on Fall 2026
class sections; both are aliases). One code is left out on purpose: SFSC for B346, where
the state's name and umd.io's name disagree.

**SECU Stadium** was missing because the state data only has its concession stands, ticket
booth and upper deck, which the exclusion rule drops. It is a curated record: official
building number 364, position from the umd.io snapshot (a test checks the two match; it
is about 21 m from the center of the state's stadium structures), address from the UMD
calendar's venue page. No hours are given.

### Towson (`backend/buildings/data/towson/`)

Towson has one tier: every building has an official two-letter code, so there is no
GIS-only tier. The data files are **built, not typed**:

```
scripts/towson/fetch_sources.py  →  scripts/towson/raw/*.json      (unedited source snapshots)
scripts/towson/build_data.py     →  data/towson/buildings.json
  reads buildings_curated.json,       data/towson/parking.json
  parking_curated.json,               data/towson/provenance.json
  official_codes.json and raw/
```

- **Codes and names:** the legend of the official campus map PDF
  (`towson.edu/maps/documents/campus-map.pdf`, "Fall 2025"), copied into
  `official_codes.json` and machine-checked against the PDF text: 62 codes, plus SM
  (Smith Hall, closed for renovation until 2027, code from the Registrar's schedule guide).
- **Coordinates and addresses:** computed by `build_data.py` from the snapshots, never typed.
  OpenStreetMap outlines are the main source; where the older Maryland iMAP layer
  (`MD_CampusFacilities`, layer 4) also has the building, the two must agree within 40 m
  (41 buildings do; the rest are newer than the state layer).
- **Hand-curated facts** (`buildings_curated.json`, `parking_curated.json`): full name,
  type, department, description, parking notes. Each record lists its source URLs and a
  `to_verify` list of anything not yet confirmed.
- **`provenance.json`:** written by the build; says where every record's name, coordinates
  and facts come from.
- **Parking:** 4 garages and 17 lots. Each record carries `after_hours_rule`: `published`
  (an official rule opens it after enforcement hours), `unconfirmed` (no published rule) or
  `never`. Only `published` records may be `free_after_hours`, and the build refuses
  anything else, so an unverified lot can never show "Likely free".

**Accuracy rules for Towson data**
- Only official pages count as proof. Third-party campus maps and Wikipedia were found to
  be stale (wrong arena name, wrong codes, missing buildings).
- When something is unverified, say less: empty department, no hours, no invented tips.
- Coordinates come from raw machine-readable files, never from a model-summarized web page.
- After changing a curated file or re-fetching sources, run
  `python buildings/scripts/towson/build_data.py`; a test fails if the committed data files
  are not exactly what the build produces.

**Towson parking rules in the app (2026-27, `src/campuses/towson.js`)**
- Permits required Mon-Thu 7am-5pm and Fri 7am-3pm; outside that and on weekends permits are
  generally not required. Enforced year-round.
- No label says plain "free". The statuses, in the order `lotStatus` checks them:
  restricted (never open to everyone, or rule not published) → unchecked (rules out of
  date) → permit hours → Friday 3pm-5pm ("permit spaces open, visitor spaces need payment
  until 5pm", because the regulations require visitor permits until 5pm Mon-Fri) → stadium
  overflow lots 4, 5, 7, 8 ("no permit needed now, not on game days or overnight"; there is
  no event feed) → garages 11pm-5am ("entry needs a OneCard with an active permit") →
  weekend ("no permit needed right now") or weeknight ("no permit needed now, no overnight
  parking": overnight is only allowed Fri 3pm to Mon 7am, in Core and Faculty/Staff areas).
- Garages are permit parking that opens up after hours (unlike UMD's paid garages).
- `parking.validUntil` (both campuses, 2027-08-15): after that day nothing shows as free
  and the banner says the rules have not been re-checked. Move the date when re-verifying.
- The parking page shows the date the rules were last checked (`parking.verified`), and
  the status refreshes every minute (`useNow`).

**Known gaps (as of 2026-11-15)**
- No coordinates: Liberal Arts Annex (LX) and Transportation Annex (TX). They are listed
  but not on the map.
- Locations matched by position, not by name: South Campus Pavilion (PA), Soccer Field (SF),
  Tiger Tennis Complex (TN), Field Hockey Complex (FF). Confirm on maps.towson.edu.
- No department yet: LI (the directory lists nothing there), SM (closed), OP.
- University Police: the police page says Public Safety Building, the offices directory
  says General Services 109.
- Lots 15 and 19 are left out (no verified location). Lots 6, 8a, 11, 16 have no published
  permit type; visitor lots 1, 3, 9, 14 and faculty lot 10 have no published after-hours rule.
- "Garages need no permit after hours" is implied by official pages ("enforcement
  campuswide will now end at 5 p.m.") but not stated outright; holidays are not covered by
  any source.
- No Towson building photos yet (aerial fallback is used).
- maps.towson.edu cannot be loaded by tools (certificate error); a person has to check it.

**Re-verify every August** (rules change with the academic year): enforcement hours,
visitor rates and ParkMobile zones, the lot list and which lots are overflow, building
renames and new buildings on the campus map PDF, Smith Hall reopening, and then update
`parking.verified` in `src/campuses/towson.js`.

---

## Architecture Decisions

**No user accounts** - anonymous comments in Django DB. Rate-limited 10 POST/hr per IP.
No personal data collected.

**Campus is a slug, not a table** - `Building.campus` and `ParkingLot.campus` are plain
strings with `UniqueConstraint(campus, code)`. The frontend needs each campus's config
before the first API call returns (the free-tier backend can take a minute to wake), so
the config lives in code and a database table would only duplicate it.

**Campus in the URL, not only in a toggle** - a shared link has to open the right campus
for whoever clicks it.

**API default is UMD** - `?campus=` is optional so old links, the keep-alive ping and a
frontend deployed before the backend all keep working.

**Parking rules are code per campus** - the two campuses differ in kind (UMD garages are
always paid; Towson garages turn free), so each campus module has its own `lotStatus`
with unit tests, instead of one rule with flags.

**Backend search** - `?search=` param uses Django Q objects (`icontains`) on code, name,
department and aliases. The pages do not use it: they load a campus's whole list once and
search it in the browser.

**One search in the browser** - `findPlaces(items, query, fields)` in `src/utils/search.js`
is the only search the pages use (Home, Buildings, Map). It is plain JavaScript with no
library, so it has unit tests and works on any list: `fields(item)` says what to read
(`buildingFields(campus)` for buildings). How it ranks, best first: exact code, start of a
code, a whole name or alias, words that start a word of a name or alias, text inside a name
(4+ letters), department or type, description. Every word typed has to match. If nothing
matches, filler words are dropped ("iribe building"; the campus's own slug and name count
as filler on that campus only, so "umd library" and "towson stadium" work), and only then are misspellings
forgiven: none in words under 4 letters, about one per four letters, at most 3. Results
found that way come back with `approximate: true` and the pages say "No exact match", so a
guess is never passed off as an answer. Among equal matches, buildings with their own code
come before state-numbered ones. State numbers (B164) are not searchable.

**ModelSerializer with `source=`** - DB fields are `code`/`name`; API outputs `acronym`/`full_name`
so the frontend doesn't need to change when the ORM schema changes.

**GIS building display (UMD)** - `umd.hasAcronym()` detects `B\d+` codes and the pages show
the full building name instead of the code.

**Whitenoise** - serves Django static files without needing a separate CDN or nginx.

**Copy style** - plain and factual. No em dashes, no marketing phrases.

---

## Deployment (Render + Vercel)

### Backend → Render Web Service

1. Connect GitHub repo on [render.com](https://render.com)
2. Set **Root Directory** to `backend`
3. **Build command:** `pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate && python buildings/scripts/transform_gis.py && python manage.py sync_buildings`
4. **Start command:** `gunicorn terp_nav.wsgi --log-file -`
5. Set environment variables in Render dashboard:
   ```
   SECRET_KEY=<generate a long random string>
   DEBUG=False
   ALLOWED_HOSTS=<your-app>.onrender.com
   CORS_ALLOWED_ORIGINS=https://<your-app>.vercel.app
   SECURE_SSL_REDIRECT=True
   ```
6. Add a **PostgreSQL** database - Render sets `DATABASE_URL` automatically

The build command did not change for Towson: `sync_buildings` picks up every campus folder.

### Frontend → Vercel

1. Import GitHub repo on [vercel.com](https://vercel.com)
2. Framework preset: **Vite**
3. Environment variables: `VITE_API_URL=https://<your-backend>.onrender.com`, and
   `VITE_ENABLE_TOWSON=true` once Towson should be visible (redeploy after changing it)
4. `vercel.json` in repo root handles SPA routing (already committed)

### Releasing the Towson update

The code before this update lists every row whatever its campus. So Towson rows must not
reach the database while that old code can still be serving (during the build, after a
failed swap, or after a rollback). That is why the backend goes out in two deploys.

1. Back up comments: `python buildings/scripts/backup_comments.py` (reads the public API).
   Comments are the only data that cannot be rebuilt from this repo, and Render's free
   PostgreSQL has no automatic backups. For a restorable copy also run
   `pg_dump "<External Database URL from Render>" -t buildings_comment -t buildings_building > pre_0007.sql`.
2. In Render, add the environment variable `SYNC_CAMPUSES=umd`. In Vercel, leave
   `VITE_ENABLE_TOWSON` unset.
3. Merge to main. In the Render build log look for `Applying buildings.0007_campus... OK`
   and `[towson] skipped`. Check `/api/buildings/IRB/` (unchanged) and
   `/api/buildings/?campus=towson` (an empty list). Visitors see UMD as before, with one
   difference: the building list is now ordered by id, so "Popular buildings" may show a
   different six than the old, unordered query did.
4. Once that version is live, remove `SYNC_CAMPUSES` in Render and run a manual deploy.
   Look for the `[towson]` sync lines, then check `/api/buildings/?campus=towson` (63 records).
5. Set `VITE_ENABLE_TOWSON=true` in Vercel and redeploy. Update the description in
   `index.html` to name Towson. To turn Towson off again, unset the variable and redeploy.

**Rolling back.** After step 4, never go back to code older than this update without first
deleting the other campus's rows (`Building.objects.exclude(campus='umd').delete()` and the
same for `ParkingLot`), or UMD pages will list Towson buildings. Do not reverse migration
0007: it would drop the campus column and turn every Towson row into a UMD row.

Migration 0007 adds the campus column (existing rows become `umd`, and the database keeps
that default), creates the (campus, code) uniqueness, then drops the old code-only
uniqueness, all in one transaction. Primary keys do not change, so comments stay attached.
`sync_buildings` runs each campus in its own transaction, so a failure leaves that campus
as it was.

Migration 0008 (aliases) is on the same branch and goes out in the same first deploy. It
only adds one column with a database default, so the code that is live during the build
should keep working (a test inserts a row without the column). Look for
`Applying buildings.0008_building_aliases... OK` in the build log too. It has only been run
on SQLite; the PostgreSQL statement has not been checked (psycopg2 is not installed here).

**Switches (Render env):** `COMMENTS_ENABLED=false` turns posting off everywhere;
`COMMENTS_DISABLED_CAMPUSES=towson` turns it off for one campus; `SYNC_CAMPUSES=umd` limits
which campuses the sync loads.

---

## Current Deployment

| Service | URL |
|---------|-----|
| Frontend (Vercel) | https://terpnav.com (custom domain) + https://terp-nav.vercel.app |
| Backend (Render) | https://terpnav.onrender.com |

Both are live. The backend is Python 3 on Render with Root Directory set to `backend`.
The frontend auto-deploys from the `main` branch on Vercel.

**Key env vars on Render:**
- `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS=terpnav.onrender.com`, `SECURE_SSL_REDIRECT=True`
- `CORS_ALLOWED_ORIGINS=https://terp-nav.vercel.app,https://terpnav.com,https://www.terpnav.com`
  (frontend origins: https://, no trailing slash, exact host - a mismatch blanks the whole site)
- `DATABASE_URL` is set automatically by Render when you attach a PostgreSQL database

Vercel preview builds cannot load data (CORS allows only the production origins), so test
locally.

---

## Recent Changes (newest first)

- **Feedback batch 1: missing places and search (built on Dev 2026-11-17, not yet released).**
  First of eight batches planned from the feedback form (see "Feedback updates" under
  Planned work).
  - Search: one shared search replaces the three copies of the exact-text filter on Home,
    Buildings and Map. From the feedback: "yanhentamisti" now finds Yahentamitsi Dining
    Hall (shown as a close match), "the y", "kirwan", "stadium" and official codes such as
    "keb" or "lpa" find their building, and "cs" no longer matches Physics.
  - Aliases: `Building.aliases` (migration 0008), served by the API and searched by it.
    22 curated buildings and 46 GIS-only buildings carry them.
  - Places: SECU Stadium added (it was the only real destination the exclusion rule had
    removed; all 103 excluded names were reviewed). The stale "Ellicott Area Dining Hall"
    record is now Ellicott Community Center, with its unverified dining hall hours removed.
  - Empty results say where to go next: the feedback form, or the Parking page.
  - `scripts/raw/umdio_buildings.json`: raw copy of the official building list, used as
    proof for the codes and the stadium's position.
  - Towson: the same search runs on Towson pages. The campus name in a search is treated
    as filler on its own campus ("towson stadium", "university of maryland library").
  - Tests: 78 backend (18 new, `test_aliases.py`) and 79 frontend (30 new,
    `search.test.js`). Typed searches checked in the running app: UMD at 360, 390 and
    1280 px, Towson at 390 and 1280 px.
  - Not done here, waiting on a decision: showing the official code on the building page
    where it differs from ours, and adding Graduate Hills and Graduate Gardens as one
    entry each.

- **Multi-campus and Towson University (built on Dev 2026-11-15, not yet released).**
  - Campus dimension: `campus` on Building and ParkingLot (migration 0007), every API
    endpoint takes `?campus=` (default UMD), `sync_buildings` is scoped per campus.
  - Frontend: campus registry and per-campus config in `src/campuses/`, `CampusLayout`,
    campus-prefixed routes, `/umd/...` alias, 404 page, saved buildings per campus,
    theme through CSS variables. The three copies of the B-number regex and every
    hardcoded UMD string in the pages moved into `src/campuses/umd.js`.
  - Towson: 63 buildings and 21 parking locations built from official codes plus raw
    source snapshots, with provenance; 2026-27 parking rules; gold and black theme;
    Stephens Hall hero photo (CC0, Baltimore Heritage); campus switcher; all behind
    `VITE_ENABLE_TOWSON`.
  - Tests: the project had none. Now 60 backend and 49 frontend tests, including a run of
    migration 0007 over old-schema rows, checks that the Towson data files match their
    sources, and that an unverified lot can never be shown as free.
  - `scripts/backup_comments.py` saves all comments through the public API before a
    schema change.
  - Independent review (2026-11-16, four reviewers). Migration 0007 came back clean. Fixed
    from the findings: the two-deploy rollout (`SYNC_CAMPUSES`), sync in a transaction,
    parking labels that no longer say "free" (game days, overnight, Friday 3-5pm, garage
    night entry), an expiry date on the parking rules, the Psychology Building's occupants
    (the Psychology department is in Liberal Arts), eight empty departments filled from
    the offices directory, the not-affiliated notice, keyboard focus rings, a larger
    switcher on phones, link-preview tags, empty rows hidden on building pages, and
    `COMMENTS_DISABLED_CAMPUSES`.
  - Still to do before release: the checks only a person can do (see Known gaps).

- Feedback link in the footer pointing at the Google Form
  (https://forms.gle/1bnDxDRXm9dTZzRf9), so it shows on Home, Buildings, Saved,
  Building detail and Parking. Opens in a new tab with rel="noopener noreferrer".
  Map is the one page with no footer, so the link does not appear there
- eslint now ignores `backend/staticfiles` alongside `backend/venv`: collectstatic
  writes Django admin's bundled JS there, which added 2614 errors to `eslint .`

- Building type filter on /buildings: a row of multi-select chips (All + Academic,
  Library, Dining, Student Life, Athletics, Residence, Administrative) under the search
  box. Selecting several ORs them together; none selected means All. Each chip shows its
  match count, scoped to the current search text, and the chips compose with search rather
  than replacing it. New `type` field on Building (migration 0006), serialized on every
  buildings endpoint, populated for all 199 buildings from department + name heuristics in
  both JSON sources. Chip list is the canonical set plus any unrecognized type actually
  present in the data, so a building can never be unreachable by every chip. Category
  order lives in `src/utils/buildingTypes.js` and must stay in sync with the Python list
  in `backend/buildings/building_types.py` (shared by the model and transform_gis)
- `buildings_gis.json` regenerated: it had drifted from `building_info.json` since the
  em-dash cleanup, so 239 descriptions still carried the old "Name - text" form that the
  deploy would have rewritten anyway. transform_gis.py now also emits `type`, so the
  deploy-time regeneration cannot blank it
- Feature Status counts refreshed against the live DB after the non-destination purge
  (199 buildings: 67 curated + 132 GIS, 135 parking locations)

- Parking tab now opens a dedicated list page (/parking): searchable, garages and
  surface lots sectioned, per-lot free-now badges, status banner ("is parking free
  right now"), Directions per lot. Map keeps its own parking layer + toggles
- Navbar: Parking tab added, links bumped 13px → 15px, TerpNav logo clicks home
- Parking: ParkingLot model (migration 0005), data/parking.json (lots from
  umd.io + garages), /api/parking/ endpoint, map layer with toggle + legend.
  Free-now indicator: green P = likely free (DOTS rule: lots unrestricted 4pm–7am
  weekdays + weekends), gray P = permit hours, blue P = paid garage. Popups carry
  the "check posted signs / event restrictions" disclaimer

- Security audit + hardening: npm audit fix (8 vulns -> 0), Django 6.0.4 -> 6.0.6,
  DRF NUM_PROXIES=1 (X-Forwarded-For spoofing could bypass rate limits),
  SECURE_PROXY_SSL_HEADER + nosniff/referrer policy, security headers in
  vercel.json (nosniff, XFO DENY, referrer, permissions policy). check --deploy
  clean. Future: CSP header once it can be visually verified against the map/images

- Moved to custom domain https://terpnav.com (Vercel). Outage post-mortem: editing
  CORS_ALLOWED_ORIGINS on Render to the new domain initially removed the working
  origin - symptom was "database not loading" but the DB was fine; the browser was
  blocked by CORS. Backend verified serving access-control-allow-origin for
  terpnav.com. TODO: in Vercel Domains, redirect terp-nav.vercel.app and
  www.terpnav.com -> terpnav.com (old links currently show "can't reach server")

- Every building detail page now shows an image: 16 verified Wikimedia Commons
  photos (13 via Wikidata P18 + 3 via coordinate geosearch with strict name-token
  matching) and a keyless Esri World Imagery aerial view as the fallback for the
  rest, with attribution. GIS-building photos live in scripts/building_images.json.

- Added 36 buildings missing from the state GIS data, cross-checked against umd.io's
  official building list (421 entries): Pyon-Chen (PCH), Johnson-Whittle (JWH),
  Yahentamitsi (Y), Thurgood Marshall Hall (TMH), IDEA Factory (IDEA), Holzapfel (HZF),
  Shriver (SHR), Harrison (HAR) + 28 utility buildings as B-codes. DB now 344 buildings.

- Every building now has info: `scripts/building_info.json` (gis_id → department/
  description/hours) merged by `transform_gis.py` - hand-written entries for ~40
  notable buildings (Wind Tunnel, Observatory, IPST, USM/Elkins, NBRF, etc.),
  category templates for dorms/apartments/Greek/garages/athletics/farm/facilities,
  standard UMD hours (Mon–Fri 7am–10pm) as fallback
- Building descriptions now render on the detail page (they never did before)
- Mobile responsive pass: grids collapse 3→2→1 columns (768px/520px breakpoints),
  hero search stacks, navbar compresses, detail rows stack on phones

- Live filtering on the home hero: typing filters the grid below in real time
  (query state lifted to Home; grid searches acronym/name/department across all 308)
- Street addresses for 209 buildings, matched from OpenStreetMap (Overpass API) by
  centroid proximity + name similarity; curated fills reviewed by hand
- Verified hours from umd.edu for Health Center, both dining halls, Memorial Chapel,
  and Turner Hall Visitor Center; other new buildings' hours remain best-effort
- Building photos: new `image_url` field (migration 0004) serving 13 landmark photos
  from Wikimedia Commons on detail pages, with credit links
- Hero background photo (McKeldin Library, CC BY-SA 2.5, credited)
- 25 new curated buildings added earlier this session (34 → 59)
- utf-8 encoding fixes in sync_buildings, views (tips), and transform_gis

---

## Planned / Future Work

**Before the Towson release**
- [x] Independent review of migration 0007, the rollout, and every Towson building and
      parking record (2026-11-16)
- [ ] Human checks: compare markers with maps.towson.edu; find LX, TX, Lot 15, Lot 19;
      email upark@towson.edu about lots 6, 8a, 11, 16, the visitor lots' after-hours rule
      and whether garages are open to all after hours; confirm SM in the Registrar's guide;
      look at the Towson theme on a phone
- [ ] Add a "which campus?" question to the feedback Google Form
- [ ] At launch: name Towson in the `index.html` description
- [x] User feedback items: 15 form responses received 2026-11-16 (see "Feedback updates")

**Feedback updates (plan approved 2026-11-16)**

Fifteen people answered the feedback form. Every request was checked against the code and
a real data source, then grouped into eight batches, built in this order. Each batch can be
merged alone. Towson stays behind its switch.

- [x] 1. Missing places and search (built 2026-11-17, not yet released)
- [ ] 2. Phone fixes, navigation, Home as a hub: 16px inputs (stops the iOS zoom), bottom
      tab bar on phones, Home with tiles and "near me" instead of a copy of the buildings
      grid, map code loaded only on the map page
- [ ] 3. Map: buildings as small dots with fewer shown when zoomed out, parking off by
      default, satellite view, links that open the map at a building
- [ ] 4. Parking and building page: nearest buildings on each lot, "free until", game days,
      links to the official parking pages, a pin on the aerial photo, Street View and Apple
      Maps links, more photos
- [ ] 5. Food: a food page and "food in this building" from the UMD Dining venue list
- [ ] 6. Events: events per building from TerpLink and the UMD calendar. Francis emails the
      TerpLink admins at Stamp before it goes live; `EVENTS_ENABLED` switches it off
- [ ] 7. Saved routes and My classes, kept in the browser
- [ ] 8. Off-campus housing near UMD as its own type

Decisions made: keep Leaflet (no Mapbox or Google Maps), keep the colors and style (no
redesign), no paid features. Not possible with any data that exists: live parking
availability, how busy a building is, indoor navigation.

Open questions for Francis:
- Show the official building code on a building page when it differs from ours
  ("Official code: KEB"), or switch our acronyms to the official ones? Switching changes
  building URLs and saved buildings, so the plan is to keep ours and only add the label.
- Add Graduate Hills and Graduate Gardens as one entry each? The state lists every
  apartment block separately, so they are filtered out today.

Francis, in Google Forms: remove "What features would you pay to see"; add which campus,
phone or computer and which browser, and "What were you trying to find that you could not?"

**After launch**
- [ ] Comment moderation tools: a way to delete a comment without a database shell, and a
      "report" link per comment
- [ ] Photo credits should name the author and license (UMD Commons photos show only
      "Photo: Wikimedia Commons")
- [ ] Home game dates for Towson stadium lots, so they can show "game day" on the day
- [ ] Navbar items are buttons; real links would allow "open in new tab"

**General**
- [ ] Prune DB rows that are absent from the JSON sources. `update_or_create` never
      touches a row that left the JSON, so production carries 3 old buildings (B092,
      B100, B215, blank `type`) and old parking rows; the local DB shows the same
      (203 buildings, 137 parking against 200 and 135 in the files). Needs guards:
      skip buildings that have comments, refuse to remove a large share of a campus
- [ ] The keep-alive GitHub workflow pauses after 60 days without a push; re-enable it
      in the Actions tab when the backend starts answering 503 on first load
- [ ] Vercel domain redirects: terp-nav.vercel.app + www.terpnav.com → terpnav.com
- [ ] Map marker clustering for dense areas
- [ ] Per-lot parking restrictions for UMD (DOTS print map has partial data)
- [ ] The 4 UMD tips in `tips.json` carry made-up "helpful" counts; replace or remove
- [ ] Remove dead code: `src/pages/Profile.jsx`, `src/components/SearchBar.jsx`, the
      unused `recharts` dependency
- [ ] Building search by room number
- [ ] CSP header (needs visual verification against map tiles + external images)
- [ ] Verify best-effort hours for UMD academic halls against umd.edu
- [ ] Outreach: r/UMD post, The Diamondback (newsumdbk@gmail.com), Orientation
      (askorientation@umd.edu), Visitor Center; for Towson: The Towerlight, r/Towson
