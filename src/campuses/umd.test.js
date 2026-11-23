import { test } from 'node:test'
import assert from 'node:assert/strict'
import umd from './umd.js'

const { isFreePeriod, lotStatus, statuses, legend } = umd.parking

// Times are written as UTC instants so the tests give the same answer on any
// computer. College Park is UTC-5 in January and UTC-4 in July, so both halves
// of daylight saving time are covered.
const at = (iso) => new Date(iso)

test('weekday permit hours run 7am to 4pm Eastern (winter)', () => {
  // Monday 12 January 2026
  assert.equal(isFreePeriod(at('2026-01-12T11:59:00Z')), true, '6:59am')
  assert.equal(isFreePeriod(at('2026-01-12T12:00:00Z')), false, '7:00am')
  assert.equal(isFreePeriod(at('2026-01-12T20:59:00Z')), false, '3:59pm')
  assert.equal(isFreePeriod(at('2026-01-12T21:00:00Z')), true, '4:00pm')
})

test('weekday permit hours run 7am to 4pm Eastern (summer)', () => {
  // Wednesday 15 July 2026
  assert.equal(isFreePeriod(at('2026-07-15T10:59:00Z')), true, '6:59am')
  assert.equal(isFreePeriod(at('2026-07-15T11:00:00Z')), false, '7:00am')
  assert.equal(isFreePeriod(at('2026-07-15T19:59:00Z')), false, '3:59pm')
  assert.equal(isFreePeriod(at('2026-07-15T20:00:00Z')), true, '4:00pm')
})

test('midnight counts as before 7am', () => {
  // Tuesday 13 January 2026, 12:00am Eastern
  assert.equal(isFreePeriod(at('2026-01-13T05:00:00Z')), true)
})

test('weekends are free all day', () => {
  assert.equal(isFreePeriod(at('2026-01-17T17:00:00Z')), true, 'Saturday noon')
  assert.equal(isFreePeriod(at('2026-01-18T15:00:00Z')), true, 'Sunday 10am')
})

test('the weekday is the one on campus, not the one in UTC', () => {
  // Friday 11:30pm Eastern is already Saturday in UTC, and Sunday 8pm
  // Eastern is already Monday in UTC. Both are free either way, so use the
  // case that differs: Monday 1am UTC is still Sunday evening on campus.
  assert.equal(isFreePeriod(at('2026-01-19T01:00:00Z')), true, 'Sunday 8pm Eastern')
  // Monday 10am Eastern is permit time even though it is 3pm in UTC.
  assert.equal(isFreePeriod(at('2026-01-19T15:00:00Z')), false, 'Monday 10am Eastern')
})

const mondayTen = at('2026-01-12T15:00:00Z')    // Monday 10am Eastern
const saturdayNoon = at('2026-01-17T17:00:00Z') // Saturday noon Eastern
const lot = { kind: 'lot', free_after_hours: true }

test('a normal lot follows the clock', () => {
  assert.equal(lotStatus(lot, mondayTen), 'permit')
  assert.equal(lotStatus(lot, saturdayNoon), 'free')
})

test('a garage is always a paid garage', () => {
  assert.equal(lotStatus({ kind: 'garage', free_after_hours: false }, saturdayNoon), 'garage')
  assert.equal(lotStatus({ kind: 'garage', free_after_hours: true }, saturdayNoon), 'garage')
})

test('a restricted lot is never shown as free', () => {
  const restricted = { kind: 'lot', free_after_hours: false }
  assert.equal(lotStatus(restricted, mondayTen), 'restricted')
  assert.equal(lotStatus(restricted, saturdayNoon), 'restricted')
})

test('once the rules are out of date no lot is shown as free', () => {
  const nextYear = at('2027-09-04T17:00:00Z') // a Saturday after the rules expire
  assert.equal(umd.parking.isExpired(saturdayNoon), false)
  assert.equal(umd.parking.isExpired(nextYear), true)
  assert.equal(lotStatus(lot, nextYear), 'unchecked')
  assert.ok(umd.parking.statuses.unchecked && umd.parking.banner.expired)
})

test('every status and legend row uses a color the pages know', () => {
  const tones = ['free', 'permit', 'garage']
  for (const name of ['garage', 'restricted', 'free', 'permit']) {
    const status = statuses[name]
    assert.ok(tones.includes(status.tone), `${name} tone`)
    assert.ok(tones.includes(status.marker), `${name} marker`)
    assert.ok(status.mapLabel && status.cardLabel, `${name} labels`)
  }
  for (const row of legend) {
    assert.ok(tones.includes(row.tone), row.text)
  }
})

test('state building numbers are not treated as acronyms', () => {
  assert.equal(umd.hasAcronym({ acronym: 'IRB' }), true)
  assert.equal(umd.hasAcronym({ acronym: 'BPS' }), true)
  assert.equal(umd.hasAcronym({ acronym: '251' }), true)
  assert.equal(umd.hasAcronym({ acronym: 'B164' }), false)
})
