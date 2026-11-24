import umd from './umd.js'
import towson from './towson.js'

// Every campus written into the app, keyed by the slug used in URLs and by
// the API. Keep the slugs in sync with CAMPUSES in backend/buildings/campuses.py.
export const ALL_CAMPUSES = { umd, towson }

// Towson ships switched off. It is only shown when VITE_ENABLE_TOWSON is
// "true" (set in .env locally, and in Vercel's settings for the live site).
// That lets the code and data reach production and be checked before any
// visitor sees Towson, and turns it off again without a code change.
// (import.meta.env only exists under Vite, so the unit tests see UMD alone.)
const env = import.meta.env ?? {}

// The campuses visitors can actually reach.
export const CAMPUSES = env.VITE_ENABLE_TOWSON === 'true' ? ALL_CAMPUSES : { umd }

// One rule everywhere: no prefix means the default campus. UMD keeps the
// URLs, API calls and saved-buildings key it always had; every other campus
// is namespaced by its slug.
export const DEFAULT_CAMPUS = 'umd'

const STORAGE_KEY = 'terpnav.campus'

// Shown in the footer and on the map. The site uses university names, colors
// and photos and gives parking guidance, so it has to say it is unofficial.
export const DISCLAIMER =
  'TerpNav is an independent student project, not affiliated with or endorsed by ' +
  Object.values(CAMPUSES).map((campus) => campus.nameInSentence).join(' or ') +
  '. Parking info is a guide: posted signs and the university parking office are the authority.'

export function getCampus(slug) {
  return Object.prototype.hasOwnProperty.call(CAMPUSES, slug) ? CAMPUSES[slug] : null
}

// Campuses that live under their own URL prefix (all but the default).
export const prefixedCampuses = Object.values(CAMPUSES).filter(
  (campus) => campus.slug !== DEFAULT_CAMPUS
)

// Page link for a campus: /map for UMD, /towson/map for Towson.
export function campusPath(campus, path = '/') {
  if (campus.slug === DEFAULT_CAMPUS) return path
  return path === '/' ? `/${campus.slug}` : `/${campus.slug}${path}`
}

// Pages that exist on every campus, so switching campus can stay on them.
const SHARED_PAGES = ['/', '/buildings', '/map', '/parking', '/saved']

// Where the campus switcher goes: the same page on the other campus when
// there is one. A building page has no twin (IRB is not a Towson building),
// so that, and anything else, goes to the other campus's home page.
export function switchPath(from, to, pathname) {
  const prefix = campusPath(from)
  let page = pathname
  if (prefix !== '/' && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    page = pathname.slice(prefix.length) || '/'
  }
  return campusPath(to, SHARED_PAGES.includes(page) ? page : '/')
}

// API link for a campus. The campus rides along as a query parameter on the
// URLs the API always had; a backend that predates campuses ignores it.
export function apiPath(campus, path) {
  return `${path}?campus=${campus.slug}`
}

// Remember the campus last viewed. Storage can be missing or blocked (private
// windows), and then there is simply nothing to remember.
export function rememberCampus(slug, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, slug)
  } catch {
    // nothing to do
  }
}

export function rememberedCampus(storage = globalThis.localStorage) {
  try {
    return getCampus(storage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

// On a fresh visit to the bare site root, a returning visitor goes to the
// campus they used last. Returns the path to switch to, or null to stay put.
export function bootRedirectPath(pathname, remembered) {
  if (pathname !== '/') return null
  if (!remembered || remembered.slug === DEFAULT_CAMPUS) return null
  return campusPath(remembered)
}
