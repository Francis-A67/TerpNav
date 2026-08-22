# TerpNav - Project Context

## What it is

A web app that helps UMD students and visitors find campus buildings by name or acronym,
get directions, save favorites, leave anonymous comments, explore buildings on an
interactive Leaflet map, and find parking (with a live free-parking indicator).
No user accounts - everything is open and anonymous. Live at https://terpnav.com.

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
python -m venv venv
venv\Scripts\activate          # Windows  /  source venv/bin/activate  (Mac/Linux)
pip install -r requirements.txt
python manage.py migrate
python buildings/scripts/transform_gis.py   # converts GIS polygons → lat/lon
python manage.py sync_buildings             # loads all building data into DB
python manage.py runserver                  # http://localhost:8000
```

**Frontend** (from project root):
```bash
npm install
npm run dev                                 # http://localhost:5173
```

**Environment files:**
- Copy `backend/.env.example` → `backend/.env` (dev defaults work out of the box)
- Copy `.env.example` → `.env` (just sets `VITE_API_URL=http://localhost:8000`)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/buildings/` | All buildings - supports `?search=query`, each record carries `type` |
| GET | `/api/buildings/<acronym>/` | Single building detail |
| GET | `/api/buildings/tips/<acronym>/` | Read-only tips for a building |
| GET | `/api/buildings/<acronym>/comments/` | Anonymous comments |
| GET | `/api/parking/` | All 135 parking lots & garages |
| POST | `/api/buildings/<acronym>/comments/` | Post a comment (10/hr per IP) |

---

## Feature Status

| Feature | Status |
|---------|--------|
| Building search (name / acronym / dept) | Done - backend `?search=` with Q objects |
| Building type filter chips | Done - multi-select on /buildings, composes with search |
| Building detail page (info + directions) | Done |
| Saved buildings (localStorage) | Done |
| Student tips (read-only from JSON) | Done |
| Anonymous comments (stored in DB) | Done - rate-limited 10/hr per IP |
| Interactive map (Leaflet, all 199 buildings) | Done - markers across full campus |
| Navbar (Home / Buildings / Map / Parking / Saved) | Done - logo clicks home, no accounts |
| 67 curated buildings (full detail) | Done - acronyms, descriptions, hours |
| 132 GIS buildings (name + location) | Done - show full name where no acronym |
| Street addresses (175 of 199) | Done - matched from OpenStreetMap + umd.io |
| Live search on home hero | Done - grid filters as you type |
| Building images (all 199) | Done - 16 Commons photos + aerial fallback (Esri) |
| Hero background photo | Done - `public/hero-campus.jpg`, CC BY-SA credit |
| Parking layer (135 lots/garages) | Done - map toggle, free-now indicator, legend |
| Parking list page (/parking tab) | Done - searchable, garages vs lots, status banner |
| Mobile responsive | Done - 3→2→1 grids @768/520px, stacked hero/detail |
| Security hardening | Done - deps patched, throttle spoof fix, security headers |
| Copyright footer | Done - © Francis Ametewee + data attribution |
| Feedback link (Google Form) | Done - in the footer, so every page except Map |
| Deployment config | Done - Procfile, whitenoise, dj-database-url |

---

## Building & Parking Data

The production DB is rebuilt reproducibly from committed JSON on every deploy -
no hand-edited database. Pipeline (all merged by `transform_gis.py` + `sync_buildings`):

1. **`data/buildings.json`** - 95 hand-curated buildings with real acronyms (IRB, STAMP,
   PCH, Y, etc.), departments, descriptions, addresses, hours, and photo URLs. These take
   priority. Includes 36 buildings missing from state GIS (cross-checked against umd.io's
   official building-number list).

2. **`data/buildings_gis.json`** - 308 buildings auto-generated from Maryland's official
   GIS API (`mdgeodata.md.gov`): polygon footprints → lat/lon centroids, codes like `B164`.
   `transform_gis.py` regenerates it from `scripts/buildings.json` and merges three
   enrichment files (all keyed by gis_id):
   - `scripts/osm_addresses.json` - 207 street addresses from OpenStreetMap (Overpass),
     matched by centroid proximity + name similarity
   - `scripts/building_info.json` - department/description/hours for all GIS-only
     buildings (hand-written for ~40 notable, category templates for the rest)
   - `scripts/building_images.json` - Wikimedia Commons photo URLs

3. **`data/parking.json`** - 131 surface lots (official DOTS P-codes/coords via umd.io)
   + 6 visitor garages. Free-parking logic (lots free 4pm–7am weekdays + weekends) is
   computed client-side in `src/utils/parking.js`.

Both JSON sources carry a `type` (Academic / Library / Dining / Student Life / Athletics /
Residence / Administrative) that drives the filter chips on /buildings. It was derived from
each building's department and name, so `department` stays the fine-grained label the card
badge shows while `type` is the coarse browse bucket. `sync_buildings` warns about any type
it does not recognize, since such a building would not match any chip.

`sync_buildings` loads GIS data first, then curated data overwrites matches and deletes
duplicate GIS entries (via `gis_id`), then syncs parking. Buildings without a real photo
get an Esri World Imagery aerial view at render time (frontend fallback, keyless).

---

## Architecture Decisions

**No user accounts** - anonymous comments in Django DB. Rate-limited 10 POST/hr per IP.
No personal data collected.

**Backend search** - `?search=` param uses Django Q objects (`icontains`). No client-side
filtering - scales as building count grows.

**ModelSerializer with `source=`** - DB fields are `code`/`name`; API outputs `acronym`/`full_name`
so the frontend doesn't need to change when the ORM schema changes.

**GIS building display** - cards and detail pages detect `B\d+` codes and show the full
building name instead of the code, so all 344 buildings look correct in the UI.

**Whitenoise** - serves Django static files without needing a separate CDN or nginx.
Added to MIDDLEWARE right after SecurityMiddleware.

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

### Frontend → Vercel

1. Import GitHub repo on [vercel.com](https://vercel.com)
2. Framework preset: **Vite**
3. Set environment variable: `VITE_API_URL=https://<your-backend>.onrender.com`
4. `vercel.json` in repo root handles SPA routing (already committed)

### After first deploy

Run a one-off shell command on Render to seed the database:
```bash
python buildings/scripts/transform_gis.py && python manage.py sync_buildings
```

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

---

## Recent Changes (newest first)

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
- Parking: ParkingLot model (migration 0005), data/parking.json (131 lots from
  umd.io + 6 garages), /api/parking/ endpoint, map layer with toggle + legend.
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

- [ ] Prune DB rows that are absent from both JSON sources. Production currently
      carries 3 left over from an older sync (B092 Potomac Building, B100 Special
      Services Office Building, B215 Building Services Operations Building, all
      Facilities Management). `update_or_create` never touches a row that is no
      longer in the JSON, and `EXCLUDE_NAME_RE` does not match these names, so they
      survive every sync with a blank `type`: they appear under All but match no
      filter chip. Local SQLite does not show this because it was rebuilt from
      scratch (199 buildings); production Postgres is long lived (202)
- [ ] Vercel domain redirects: terp-nav.vercel.app + www.terpnav.com → terpnav.com
- [ ] Map marker clustering for dense areas
- [ ] Per-lot parking restrictions (DOTS print map has partial data; model already
      has a `free_after_hours` flag per lot)
- [ ] Building search by room number
- [ ] CSP header (needs visual verification against map tiles + external images)
- [ ] Verify best-effort hours for academic halls against umd.edu
- [ ] Outreach: r/UMD post, The Diamondback (newsumdbk@gmail.com), Orientation
      (askorientation@umd.edu), Visitor Center - draft email in session notes
