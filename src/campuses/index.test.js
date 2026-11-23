import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ALL_CAMPUSES,
  CAMPUSES,
  DEFAULT_CAMPUS,
  apiPath,
  bootRedirectPath,
  campusPath,
  getCampus,
  rememberCampus,
  rememberedCampus,
  switchPath,
} from './index.js'

const umd = CAMPUSES.umd
// Stands in for a second campus so the prefix rules are tested before one exists.
const other = { slug: 'towson' }

function fakeStorage() {
  const data = new Map()
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  }
}

test('the default campus is registered', () => {
  assert.equal(DEFAULT_CAMPUS, 'umd')
  assert.equal(getCampus('umd'), umd)
})

test('unknown slugs are not campuses', () => {
  assert.equal(getCampus('nope'), null)
  assert.equal(getCampus(null), null)
  // Built-in object properties must not pass for a campus.
  assert.equal(getCampus('constructor'), null)
  assert.equal(getCampus('toString'), null)
})

test('the default campus keeps its un-prefixed page URLs', () => {
  assert.equal(campusPath(umd), '/')
  assert.equal(campusPath(umd, '/map'), '/map')
  assert.equal(campusPath(umd, '/building/IRB'), '/building/IRB')
})

test('other campuses live under their slug', () => {
  assert.equal(campusPath(other), '/towson')
  assert.equal(campusPath(other, '/map'), '/towson/map')
  assert.equal(campusPath(other, '/buildings?search=lib'), '/towson/buildings?search=lib')
})

test('API links carry the campus as a query parameter', () => {
  assert.equal(apiPath(umd, '/api/buildings/'), '/api/buildings/?campus=umd')
  assert.equal(apiPath(other, '/api/buildings/LA/'), '/api/buildings/LA/?campus=towson')
})

test('switching campus stays on the same kind of page', () => {
  assert.equal(switchPath(umd, other, '/'), '/towson')
  assert.equal(switchPath(umd, other, '/map'), '/towson/map')
  assert.equal(switchPath(other, umd, '/towson'), '/')
  assert.equal(switchPath(other, umd, '/towson/parking'), '/parking')
})

test('switching from a building page goes to the other campus home', () => {
  assert.equal(switchPath(umd, other, '/building/IRB'), '/towson')
  assert.equal(switchPath(other, umd, '/towson/building/LA'), '/')
  assert.equal(switchPath(umd, other, '/no-such-page'), '/towson')
})

test('the root only redirects a returning visitor of another campus', () => {
  assert.equal(bootRedirectPath('/', null), null, 'first visit')
  assert.equal(bootRedirectPath('/', umd), null, 'default campus')
  assert.equal(bootRedirectPath('/', other), '/towson')
  assert.equal(bootRedirectPath('/map', other), null, 'deep links are never redirected')
})

test('the last campus is remembered', () => {
  const storage = fakeStorage()
  assert.equal(rememberedCampus(storage), null)
  rememberCampus('umd', storage)
  assert.equal(rememberedCampus(storage), umd)
})

test('a stored slug that is no longer a campus is ignored', () => {
  const storage = fakeStorage()
  rememberCampus('closed-campus', storage)
  assert.equal(rememberedCampus(storage), null)
})

test('missing or blocked storage never throws', () => {
  const blocked = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
  }
  assert.doesNotThrow(() => rememberCampus('umd', blocked))
  assert.equal(rememberedCampus(blocked), null)
  assert.doesNotThrow(() => rememberCampus('umd', undefined))
  assert.equal(rememberedCampus(undefined), null)
})

test('Towson stays hidden until it is switched on', () => {
  // The switch is an environment setting that only exists in a Vite build,
  // so in these tests it is off: UMD is the only reachable campus.
  assert.deepEqual(Object.keys(CAMPUSES), ['umd'])
  assert.deepEqual(Object.keys(ALL_CAMPUSES), ['umd', 'towson'])
  assert.equal(getCampus('towson'), null)
})

// Runs for every campus written into the app, switched on or not, so a new
// campus cannot ship with a missing field that would only break when its
// page is opened.
for (const [slug, campus] of Object.entries(ALL_CAMPUSES)) {
  test(`${slug}: config has everything the pages read`, () => {
    assert.equal(campus.slug, slug)
    for (const key of ['name', 'nameInSentence', 'shortName', 'title', 'navSub', 'cityFallback', 'addressFallback', 'dataCredit']) {
      assert.equal(typeof campus[key], 'string', key)
      assert.ok(campus[key], key)
    }
    assert.equal(campus.map.center.length, 2)
    assert.ok(Number.isFinite(campus.map.center[0]) && Number.isFinite(campus.map.center[1]))
    assert.ok(Number.isInteger(campus.map.zoom))
    for (const key of ['title', 'placeholder', 'image', 'imagePosition']) {
      assert.ok(campus.hero[key], `hero.${key}`)
    }
    assert.ok(campus.hero.credit.text && campus.hero.credit.href.startsWith('https://'))
    assert.equal(typeof campus.hasAcronym, 'function')

    const rules = campus.parking
    assert.equal(typeof rules.isFreePeriod(), 'boolean')
    assert.ok(rules.banner.free && rules.banner.permit && rules.banner.expired)
    assert.match(rules.validUntil, /^\d{4}-\d{2}-\d{2}$/)
    assert.equal(typeof rules.isExpired(), 'boolean')
    for (const key of ['searchPlaceholder', 'garagesTitle', 'lotsTitle']) {
      assert.ok(rules[key], `parking.${key}`)
    }
    assert.equal(typeof rules.showLotCode, 'boolean')
  })

  test(`${slug}: every parking status can be drawn`, () => {
    const rules = campus.parking
    const lots = [
      { kind: 'lot', free_after_hours: true },
      { kind: 'lot', free_after_hours: false },
      { kind: 'garage', free_after_hours: true },
      { kind: 'garage', free_after_hours: false },
    ]
    // One instant for every hour of a full week.
    const start = Date.UTC(2026, 0, 11)
    for (let hour = 0; hour < 7 * 24; hour++) {
      const when = new Date(start + hour * 3600 * 1000)
      for (const lot of lots) {
        const name = rules.lotStatus(lot, when)
        assert.ok(rules.statuses[name], `${name} at ${when.toISOString()}`)
      }
    }
  })
}
