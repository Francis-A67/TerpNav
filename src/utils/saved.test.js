import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { CAMPUSES } from '../campuses/index.js'
import { getSaved, saveBuilding, unsaveBuilding } from './saved.js'

const umd = CAMPUSES.umd
// Stands in for a second campus so the key rules are tested before one exists.
const other = { slug: 'towson' }

let stored

// saved.js talks to the browser's localStorage, which Node does not have,
// so each test gets a fresh in-memory stand-in.
beforeEach(() => {
  stored = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (key) => (stored.has(key) ? stored.get(key) : null),
      setItem: (key, value) => stored.set(key, String(value)),
    },
  })
})

test('nothing saved yet is an empty list', () => {
  assert.deepEqual(getSaved(umd), [])
})

test('UMD still reads the key used before other campuses existed', () => {
  stored.set('savedBuildings', '["IRB","B164"]')
  assert.deepEqual(getSaved(umd), ['IRB', 'B164'])
})

test('saving and unsaving', () => {
  saveBuilding(umd, 'IRB')
  saveBuilding(umd, 'HBK')
  assert.deepEqual(getSaved(umd), ['IRB', 'HBK'])
  unsaveBuilding(umd, 'IRB')
  assert.deepEqual(getSaved(umd), ['HBK'])
})

test('saving the same building twice keeps one copy', () => {
  saveBuilding(umd, 'IRB')
  saveBuilding(umd, 'IRB')
  assert.deepEqual(getSaved(umd), ['IRB'])
})

test('each campus has its own list', () => {
  saveBuilding(umd, 'IRB')
  saveBuilding(other, 'LA')
  assert.deepEqual(getSaved(umd), ['IRB'])
  assert.deepEqual(getSaved(other), ['LA'])
  assert.deepEqual([...stored.keys()].sort(), ['savedBuildings', 'savedBuildings:towson'])
})

test('damaged storage is treated as nothing saved', () => {
  stored.set('savedBuildings', 'not json')
  assert.deepEqual(getSaved(umd), [])
  stored.set('savedBuildings', '{"IRB":true}')
  assert.deepEqual(getSaved(umd), [])
})
