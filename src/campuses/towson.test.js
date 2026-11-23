import { test } from 'node:test'
import assert from 'node:assert/strict'
import towson from './towson.js'

const { isFreePeriod, isGarageCurfew, lotStatus } = towson.parking

// Times are UTC instants so the answer is the same on any computer. Towson is
// UTC-5 in January and UTC-4 in July.
const at = (iso) => new Date(iso)

// The rule being tested, from Towson's 2026-27 parking regulations: permits
// are required 7 a.m. to 5 p.m. Monday through Thursday and 7 a.m. to 3 p.m.
// on Fridays.

test('Monday to Thursday permit hours run 7am to 5pm', () => {
  // Monday 12 January 2026
  assert.equal(isFreePeriod(at('2026-01-12T11:59:00Z')), true, 'Mon 6:59am')
  assert.equal(isFreePeriod(at('2026-01-12T12:00:00Z')), false, 'Mon 7:00am')
  assert.equal(isFreePeriod(at('2026-01-12T21:59:00Z')), false, 'Mon 4:59pm')
  assert.equal(isFreePeriod(at('2026-01-12T22:00:00Z')), true, 'Mon 5:00pm')
  // Thursday 15 January 2026
  assert.equal(isFreePeriod(at('2026-01-15T21:59:00Z')), false, 'Thu 4:59pm')
  assert.equal(isFreePeriod(at('2026-01-15T22:00:00Z')), true, 'Thu 5:00pm')
})

test('Friday permit hours end at 3pm', () => {
  // Friday 16 January 2026
  assert.equal(isFreePeriod(at('2026-01-16T12:00:00Z')), false, 'Fri 7:00am')
  assert.equal(isFreePeriod(at('2026-01-16T19:59:00Z')), false, 'Fri 2:59pm')
  assert.equal(isFreePeriod(at('2026-01-16T20:00:00Z')), true, 'Fri 3:00pm')
})

test('the same hours apply in summer time', () => {
  // Wednesday 15 July 2026 and Friday 17 July 2026
  assert.equal(isFreePeriod(at('2026-07-15T11:00:00Z')), false, 'Wed 7:00am')
  assert.equal(isFreePeriod(at('2026-07-15T20:59:00Z')), false, 'Wed 4:59pm')
  assert.equal(isFreePeriod(at('2026-07-15T21:00:00Z')), true, 'Wed 5:00pm')
  assert.equal(isFreePeriod(at('2026-07-17T18:59:00Z')), false, 'Fri 2:59pm')
  assert.equal(isFreePeriod(at('2026-07-17T19:00:00Z')), true, 'Fri 3:00pm')
})

test('weekends are free from Friday 3pm to Monday 7am', () => {
  assert.equal(isFreePeriod(at('2026-01-17T17:00:00Z')), true, 'Sat noon')
  assert.equal(isFreePeriod(at('2026-01-18T15:00:00Z')), true, 'Sun 10am')
  assert.equal(isFreePeriod(at('2026-01-19T11:59:00Z')), true, 'Mon 6:59am')
  assert.equal(isFreePeriod(at('2026-01-19T12:00:00Z')), false, 'Mon 7:00am')
})

test('garages are closed to non-OneCard holders from 11pm to 5am', () => {
  // Tuesday 13 January 2026
  assert.equal(isGarageCurfew(at('2026-01-14T03:59:00Z')), false, 'Tue 10:59pm')
  assert.equal(isGarageCurfew(at('2026-01-14T04:00:00Z')), true, 'Tue 11:00pm')
  assert.equal(isGarageCurfew(at('2026-01-14T09:59:00Z')), true, 'Wed 4:59am')
  assert.equal(isGarageCurfew(at('2026-01-14T10:00:00Z')), false, 'Wed 5:00am')
})

const garage = { code: 'union-garage', kind: 'garage', free_after_hours: true }
const stadiumLot = { code: 'lot-7', kind: 'lot', free_after_hours: true }
const residentLot = { code: 'lot-2', kind: 'lot', free_after_hours: false }

const mondayTen = at('2026-01-12T15:00:00Z')      // Mon 10am
const mondaySix = at('2026-01-12T23:00:00Z')      // Mon 6pm
const mondayMidnight = at('2026-01-13T05:00:00Z') // Tue 12am
const fridayFour = at('2026-01-16T21:00:00Z')     // Fri 4pm
const fridaySix = at('2026-01-16T23:00:00Z')      // Fri 6pm
const saturdayNoon = at('2026-01-17T17:00:00Z')
const saturdayLate = at('2026-01-18T04:30:00Z')   // Sat 11:30pm
const mondayEarly = at('2026-01-19T11:00:00Z')    // Mon 6am
const nextYear = at('2027-09-01T17:00:00Z')       // after the rules expire

test('a garage needs a permit during enforcement hours', () => {
  assert.equal(lotStatus(garage, mondayTen), 'permit')
})

test('on a weeknight a garage is open but not for overnight parking', () => {
  // Overnight parking is only allowed from Friday 3pm to Monday 7am.
  assert.equal(lotStatus(garage, mondaySix), 'evening')
})

test('on the weekend a garage is simply open', () => {
  assert.equal(lotStatus(garage, fridaySix), 'free')
  assert.equal(lotStatus(garage, saturdayNoon), 'free')
})

test('a garage is never shown as open during the 11pm to 5am OneCard hours', () => {
  assert.equal(lotStatus(garage, mondayMidnight), 'onecard')
  assert.equal(lotStatus(garage, saturdayLate), 'onecard')
})

test('Friday 3pm to 5pm: permit spaces are open, visitor spaces are not', () => {
  // The regulations require visitor permits until 5pm Monday to Friday.
  assert.equal(lotStatus(garage, fridayFour), 'friday')
  assert.equal(lotStatus(stadiumLot, fridayFour), 'friday')
})

test('a stadium lot is never called plainly free', () => {
  // Game days and events restrict these lots and there is no event feed.
  assert.equal(lotStatus(stadiumLot, mondayTen), 'permit')
  for (const when of [mondaySix, mondayMidnight, fridaySix, saturdayNoon, saturdayLate, mondayEarly]) {
    assert.equal(lotStatus(stadiumLot, when), 'overflow')
  }
})

test('a restricted or unverified lot is never shown as free', () => {
  for (const when of [mondayTen, mondaySix, mondayMidnight, fridayFour, saturdayNoon, saturdayLate]) {
    assert.equal(lotStatus(residentLot, when), 'restricted')
  }
  assert.equal(lotStatus({ kind: 'garage', free_after_hours: false }, saturdayNoon), 'restricted')
})

test('once the rules are out of date nothing is shown as free', () => {
  assert.equal(towson.parking.isExpired(saturdayNoon), false)
  assert.equal(towson.parking.isExpired(nextYear), true)
  assert.equal(lotStatus(garage, nextYear), 'unchecked')
  assert.equal(lotStatus(stadiumLot, nextYear), 'unchecked')
  assert.equal(lotStatus(residentLot, nextYear), 'restricted')
  assert.ok(towson.parking.banner.expired)
})

test('no label promises free parking outright', () => {
  for (const [name, status] of Object.entries(towson.parking.statuses)) {
    assert.doesNotMatch(status.mapLabel, /\bFREE\b/, name)
    assert.doesNotMatch(status.cardLabel, /\bFREE\b/, name)
  }
})

test('every Towson building has a real code', () => {
  assert.equal(towson.hasAcronym({ acronym: 'LA' }), true)
  assert.equal(towson.hasAcronym({ acronym: 'Y2' }), true)
})

test('the parking page says when the rules were checked', () => {
  assert.match(towson.parking.verified, /2026/)
  assert.equal(towson.parking.showLotCode, false)
})
