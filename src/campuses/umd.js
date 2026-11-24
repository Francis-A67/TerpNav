import { campusClock, isPast } from './clock.js'

const TIME_ZONE = 'America/New_York'

// The parking rules below were last audited against the DOTS website in
// July 2026. After this day they count as unchecked (see isPast).
const VALID_UNTIL = '2027-08-15'

function isExpired(date = new Date()) {
  return isPast(VALID_UNTIL, date)
}

// DOTS rule of thumb: most surface lots are permit-only Mon–Fri 7am–4pm and
// unrestricted evenings + weekends (posted signs and event days override).
function isFreePeriod(date = new Date()) {
  const { weekday, hour } = campusClock(date, TIME_ZONE)
  if (weekday === 'Sat' || weekday === 'Sun') return true
  return hour >= 16 || hour < 7
}

// What a lot or garage is right now: 'garage', 'restricted', 'free' or 'permit'.
// Visitor garages charge at all enforced hours, so they never count as free.
function lotStatus(lot, date = new Date()) {
  if (lot.kind === 'garage') return 'garage'
  if (!lot.free_after_hours) return 'restricted'
  if (isExpired(date)) return 'unchecked'
  return isFreePeriod(date) ? 'free' : 'permit'
}

const umd = {
  slug: 'umd',
  name: 'University of Maryland',
  nameInSentence: 'the University of Maryland',
  shortName: 'UMD',
  title: 'TerpNav',
  navSub: 'UMD Building Navigator',

  // Used when a building has no address or coordinates of its own.
  cityFallback: 'College Park MD',
  addressFallback: 'College Park, MD 20742',

  map: { center: [38.9869, -76.9426], zoom: 15 },

  hero: {
    title: 'Find any UMD building',
    placeholder: 'Search "IRB", "Iribe Center", or "Computer Science"...',
    image: '/hero-campus.jpg',
    imagePosition: 'center 35%',
    credit: {
      text: 'Photo: McKeldin Library by Tomf688, Wikimedia Commons (CC BY-SA 2.5)',
      href: 'https://commons.wikimedia.org/wiki/File:McKeldin_Library,_front_view,_mid-afternoon_light,_August_21,_2006.jpg',
    },
  },

  dataCredit:
    'Building data: Maryland iMAP · Addresses © OpenStreetMap contributors · Photos via Wikimedia Commons',

  // Buildings that only exist in the state GIS data carry a building number
  // (B164) instead of an acronym, so the pages show their name instead.
  hasAcronym: (building) => !/^B\d+$/.test(building.acronym),

  parking: {
    isFreePeriod,
    isExpired,
    lotStatus,
    // How each status is drawn. tone picks the color (free = green,
    // permit = gray, garage = blue) and marker picks the map pin.
    statuses: {
      garage: {
        tone: 'garage',
        marker: 'garage',
        mapLabel: 'Garage: paid parking',
        cardLabel: 'Garage: paid parking',
      },
      restricted: {
        tone: 'garage',
        marker: 'permit',
        mapLabel: 'Restricted: see note',
        cardLabel: 'Restricted: see note',
      },
      free: {
        tone: 'free',
        marker: 'free',
        mapLabel: 'Likely FREE right now',
        cardLabel: 'Likely FREE right now',
      },
      permit: {
        tone: 'permit',
        marker: 'permit',
        mapLabel: 'Permit required now. Free after 4pm & weekends',
        cardLabel: 'Permit hours: free after 4pm & weekends',
      },
      unchecked: {
        tone: 'permit',
        marker: 'permit',
        mapLabel: 'Rules not re-checked this year: see the DOTS website',
        cardLabel: 'Rules not re-checked this year: see the DOTS website',
      },
    },
    legend: [
      { tone: 'free', text: 'Free now (after 4pm & weekends)' },
      { tone: 'permit', text: 'Permit hours (Mon–Fri 7am–4pm)' },
      { tone: 'garage', text: 'Garage / restricted: see marker' },
    ],
    banner: {
      free: 'Right now most surface lots are FREE (evenings after 4pm & weekends). Check posted signs; event restrictions apply.',
      permit:
        'Right now it’s permit hours (Mon–Fri 7am–4pm). Most surface lots are free after 4pm and on weekends. Visitor garages charge $4/hr, 7am–midnight daily.',
      expired:
        'These parking rules were last checked in July 2026 and have not been re-checked since. See the UMD DOTS website for the current rules.',
    },
    validUntil: VALID_UNTIL,
    searchPlaceholder: 'Find a lot or garage... e.g. "Lot 1b" or "Union Lane"',
    garagesTitle: 'Garages (paid parking)',
    lotsTitle: 'Surface lots',
    showLotCode: true,
  },
}

export default umd
