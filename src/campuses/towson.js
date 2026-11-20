import { campusClock, isPast } from './clock.js'

const TIME_ZONE = 'America/New_York'

// The rules below were checked against towson.edu/parking for the 2026-27
// academic year. After this day they count as unchecked (see isPast).
const VALID_UNTIL = '2027-08-15'

// Stadium overflow lots. They open up after hours like the garages, but game
// days and events restrict them and there is no feed of event dates, so they
// are never labeled plainly "free".
const STADIUM_OVERFLOW = new Set(['lot-4', 'lot-5', 'lot-7', 'lot-8'])

// Towson Parking Services, 2026-27 regulations: "A valid parking permit is
// required to park anywhere on campus from 7 a.m. to 5 p.m. Monday through
// Thursday and 7 a.m. to 3 p.m. on Fridays." Outside those hours, and on
// weekends, permits are generally not required. Enforced year-round.
// Source: https://www.towson.edu/parking/forms/parking-guidelines.pdf
function isFreePeriod(date = new Date()) {
  const { weekday, hour } = campusClock(date, TIME_ZONE)
  if (weekday === 'Sat' || weekday === 'Sun') return true
  const enforcementEnds = weekday === 'Fri' ? 15 : 17
  return hour < 7 || hour >= enforcementEnds
}

// The same regulations say visitor spaces need a visitor permit "from 7 a.m.
// to 5 p.m. Monday through Friday", so on Friday from 3pm to 5pm permit
// spaces are open while visitor spaces still need payment.
function isFridayVisitorWindow(date = new Date()) {
  const { weekday, hour } = campusClock(date, TIME_ZONE)
  return weekday === 'Fri' && hour >= 15 && hour < 17
}

// "From 11 p.m. to 5 a.m., only individuals with a valid TU OneCard may enter
// the campus parking garages." The parking home page adds that an active
// parking permit is required too, and that upper levels are closed.
// Source: https://www.towson.edu/parking/enforcement/
function isGarageCurfew(date = new Date()) {
  const { hour } = campusClock(date, TIME_ZONE)
  return hour >= 23 || hour < 5
}

// "Overnight parking is permitted in Core and Faculty/Staff areas from
// 3:00 p.m. Friday until 7:00 a.m. on Monday." Any other night it is
// prohibited outside resident lots.
function isWeekend(date = new Date()) {
  const { weekday, hour } = campusClock(date, TIME_ZONE)
  if (weekday === 'Sat' || weekday === 'Sun') return true
  if (weekday === 'Fri') return hour >= 15
  return weekday === 'Mon' && hour < 7
}

function isExpired(date = new Date()) {
  return isPast(VALID_UNTIL, date)
}

// What a lot or garage is right now. Unlike UMD, Towson garages are permit
// parking that opens up after hours. free_after_hours is false for anything
// that is never open to everyone (resident, reserved, visitor-pay) and for
// lots whose rule is not published, so an unverified lot is never shown as free.
function lotStatus(lot, date = new Date()) {
  if (!lot.free_after_hours) return 'restricted'
  if (isExpired(date)) return 'unchecked'
  if (!isFreePeriod(date)) return 'permit'
  if (isFridayVisitorWindow(date)) return 'friday'
  if (STADIUM_OVERFLOW.has(lot.code)) return 'overflow'
  if (lot.kind === 'garage' && isGarageCurfew(date)) return 'onecard'
  return isWeekend(date) ? 'free' : 'evening'
}

const towson = {
  slug: 'towson',
  name: 'Towson University',
  nameInSentence: 'Towson University',
  shortName: 'Towson',
  title: 'TerpNav | Towson',
  navSub: 'Towson Building Navigator',

  // Used when a building has no address or coordinates of its own.
  cityFallback: 'Towson MD',
  addressFallback: 'Towson, MD 21204',
  officialMap: 'https://www.towson.edu/maps/',

  map: { center: [39.3912, -76.6118], zoom: 16 },

  hero: {
    title: 'Find any Towson building',
    placeholder: 'Search "LA", "Cook Library", or "Psychology"...',
    image: '/hero-towson.jpg',
    imagePosition: 'center 45%',
    credit: {
      text: 'Photo: Stephens Hall by Baltimore Heritage, Wikimedia Commons (CC0)',
      href: 'https://commons.wikimedia.org/wiki/File:Stephens_Hall_(1912;_Douglas_H._Thomas_Jr.,_architect),_Towson_University,_8000_York_Road,_Towson,_MD_21252_(53148575990).jpg',
    },
  },

  dataCredit:
    'Building codes: Towson University campus map · Locations and addresses © OpenStreetMap contributors, Maryland iMAP · Parking rules: towson.edu/parking',

  // Every Towson building has an official two-letter code.
  hasAcronym: () => true,

  parking: {
    isFreePeriod,
    isFridayVisitorWindow,
    isGarageCurfew,
    isWeekend,
    isExpired,
    lotStatus,
    // tone picks the color (free = green, permit = gray, garage = blue) and
    // marker picks the map pin.
    statuses: {
      restricted: {
        tone: 'garage',
        marker: 'garage',
        mapLabel: 'Visitor or restricted: see note',
        cardLabel: 'Visitor or restricted: see note',
      },
      permit: {
        tone: 'permit',
        marker: 'permit',
        mapLabel: 'Permit required now. Opens up after 5pm (3pm Fri) & weekends',
        cardLabel: 'Permit hours: opens up after 5pm (3pm Fri) & weekends',
      },
      friday: {
        tone: 'free',
        marker: 'free',
        mapLabel: 'Permit spaces open now. Visitor spaces need payment until 5pm',
        cardLabel: 'Permit spaces open now. Visitor spaces need payment until 5pm',
      },
      onecard: {
        tone: 'permit',
        marker: 'permit',
        mapLabel: 'Until 5am: entry needs a OneCard with an active permit',
        cardLabel: 'Until 5am: entry needs a OneCard with an active permit',
      },
      overflow: {
        tone: 'free',
        marker: 'free',
        mapLabel: 'No permit needed now. Not on game days or overnight',
        cardLabel: 'No permit needed now. Not on game days or overnight',
      },
      evening: {
        tone: 'free',
        marker: 'free',
        mapLabel: 'No permit needed now. No overnight parking',
        cardLabel: 'No permit needed now. No overnight parking',
      },
      free: {
        tone: 'free',
        marker: 'free',
        mapLabel: 'No permit needed right now (likely)',
        cardLabel: 'No permit needed right now (likely)',
      },
      unchecked: {
        tone: 'permit',
        marker: 'permit',
        mapLabel: 'Rules not re-checked this year: see towson.edu/parking',
        cardLabel: 'Rules not re-checked this year: see towson.edu/parking',
      },
    },
    legend: [
      { tone: 'free', text: 'No permit needed now (after 5pm, 3pm Fri & weekends)' },
      { tone: 'permit', text: 'Permit hours (Mon–Thu 7am–5pm, Fri 7am–3pm)' },
      { tone: 'garage', text: 'Visitor or restricted: see note' },
    ],
    banner: {
      free: 'Right now permits are not required in most garages and stadium overflow lots. Game days and events change this, and overnight parking is restricted (see each note). Resident, reserved and accessible spaces are always enforced.',
      permit:
        'Right now it’s permit hours (Mon–Thu 7am–5pm, Fri 7am–3pm). Visitors pay with the ParkMobile app ($15 a day). Most garages and stadium overflow lots open up after 5pm (3pm on Fridays for permit spaces) and on weekends.',
      expired:
        'These parking rules were checked for the 2026–27 academic year and have not been re-checked since. See towson.edu/parking for the current rules.',
    },
    verified:
      'Rules checked against towson.edu/parking on Nov 16, 2026, for the 2026–27 academic year. Posted signs always win.',
    validUntil: VALID_UNTIL,
    searchPlaceholder: 'Find a lot or garage... e.g. "Lot 4" or "Union Garage"',
    garagesTitle: 'Garages',
    lotsTitle: 'Surface lots',
    // Towson lots are known by name ("Lot 4"); the codes are internal keys.
    showLotCode: false,
  },
}

export default towson
