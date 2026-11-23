import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import umd from '../campuses/umd.js'
import towson from '../campuses/towson.js'
import { normalize, editDistance, findPlaces, searchPlaces, buildingFields } from './search.js'

const fields = buildingFields(umd)

function readData(name) {
  const file = new URL(`../../backend/buildings/data/${name}`, import.meta.url)
  return JSON.parse(readFileSync(file, 'utf-8'))
}

// The real curated UMD buildings, so the cases people reported in the
// feedback form are tested against the names the site actually serves.
const real = readData('buildings.json')

// The state's building list: the buildings that have no acronym of ours.
const state = readData('buildings_gis.json')

// Towson's buildings, as the sync loads them.
const towsonData = readData('towson/buildings.json')

// A small made-up list, so the ranking rules are tested apart from the real
// data and keep passing when a building is renamed.
const sample = [
  { acronym: 'IRB', full_name: 'Brendan Iribe Center for Computer Science & Engineering', aliases: ['Iribe', 'CS building'], department: 'Computer Science', type: 'Academic', description: '' },
  { acronym: 'CSI', full_name: 'Computer Science Instructional Center', department: 'Computer Science', type: 'Academic', description: '' },
  { acronym: 'PHY', full_name: 'John S. Toll Physics Building', department: 'Physics', type: 'Academic', description: '' },
  { acronym: 'STAMP', full_name: 'Stamp Student Union', aliases: ['The Stamp'], department: 'Student Affairs', type: 'Student Life', description: 'Houses dining and the university bookstore.' },
  { acronym: 'SECU', full_name: 'SECU Stadium', aliases: ['football stadium', 'Maryland Stadium', 'Byrd Stadium'], department: 'Athletics', type: 'Athletics', description: '' },
  { acronym: 'Y', full_name: 'Yahentamitsi Dining Hall', aliases: ['The Y'], department: 'Dining Services', type: 'Dining', description: '' },
  { acronym: 'AVW', full_name: 'A.V. Williams Building', department: 'Electrical & Computer Engineering', type: 'Academic', description: '' },
  { acronym: 'B399', full_name: 'Aquatic Center', department: 'Recreation', type: 'Athletics', description: '' },
  { acronym: 'B164', full_name: 'Boat House', department: 'Recreation', type: 'Athletics', description: '' },
]

const codes = (list) => list.map((building) => building.acronym)
const find = (list, query) => codes(searchPlaces(list, query, fields))

test('normalize strips case, accents and punctuation', () => {
  assert.equal(normalize('A.V. Williams Building'), 'a v williams building')
  assert.equal(normalize('  Café & Co.  '), 'cafe co')
  assert.equal(normalize("Women's Studies"), 'womens studies')
  assert.equal(normalize(null), '')
})

test('editDistance counts single edits, with a swap of neighbors as one', () => {
  assert.equal(editDistance('stamp', 'stamp'), 0)
  assert.equal(editDistance('stmap', 'stamp'), 1)
  assert.equal(editDistance('libary', 'library'), 1)
  assert.equal(editDistance('kitten', 'sitting'), 3)
  assert.equal(editDistance('yanhentamisti', 'yahentamitsi'), 2)
})

test('an empty search returns everything in its original order', () => {
  assert.deepEqual(findPlaces(sample, '', fields), { results: sample, approximate: false })
  assert.deepEqual(find(sample, '   '), codes(sample))
})

test('feedback: the misspelled dining hall is found', () => {
  const { results, approximate } = findPlaces(real, 'yanhentamisti', fields)
  assert.equal(results[0].acronym, 'Y')
  assert.equal(approximate, true, 'flagged as a close match, not an exact one')
})

test('a long name matches while it is still being typed with a mistake in it', () => {
  assert.equal(find(real, 'yanhenta')[0], 'Y')
  assert.equal(find(real, 'yahentam')[0], 'Y')
})

test('feedback: Kirwan finds the math building', () => {
  assert.equal(find(real, 'kirwan')[0], 'MATH')
  assert.equal(find(real, 'Kirwan Hall')[0], 'MATH')
})

test('an exact code comes first, in any letter case', () => {
  assert.equal(find(real, 'esj')[0], 'ESJ')
  assert.equal(find(real, 'ESJ')[0], 'ESJ')
  assert.equal(find(real, 'mckk')[0], 'McKK')
  assert.equal(find(real, '251')[0], '251')
})

test('nicknames and former names find the building', () => {
  assert.equal(find(sample, 'the y')[0], 'Y')
  assert.deepEqual(find(sample, 'stadium'), ['SECU'])
  assert.deepEqual(find(sample, 'football'), ['SECU'])
  assert.deepEqual(find(sample, 'byrd stadium'), ['SECU'])
})

test('two letters match codes and word starts only, never text inside a word', () => {
  // The old search matched "cs" inside "Physics".
  assert.deepEqual(find(sample, 'cs'), ['CSI', 'IRB'])
})

test('text inside a word only counts from four letters', () => {
  // "art" sits inside "Martin" (Glenn L. Martin Hall), which nobody means.
  assert.ok(!find(real, 'art').includes('EGR'))
  assert.ok(find(real, 'art').includes('ASY'))
  assert.equal(find(real, 'keld')[0], 'McKK')
})

test('plurals find the singular name', () => {
  const { results, approximate } = findPlaces(real, 'libraries', fields)
  assert.ok(codes(results).includes('McKK'))
  assert.ok(codes(results).includes('HBK'))
  assert.equal(approximate, false)
  assert.deepEqual(find(sample, 'stadiums'), ['SECU'])
})

test('short searches are never typo-matched', () => {
  assert.deepEqual(find(sample, 'xq'), [])
  assert.deepEqual(find(sample, 'ph'), ['PHY'])
})

test('a short word is compared whole, so food does not find football', () => {
  assert.deepEqual(find(sample, 'food'), [])
})

test('close matches are only shown when nothing matched as typed', () => {
  // "stad" starts "stadium", so Stamp (one letter away) must not appear.
  const { results, approximate } = findPlaces(sample, 'stad', fields)
  assert.deepEqual(codes(results), ['SECU'])
  assert.equal(approximate, false)
})

test('common misspellings', () => {
  assert.equal(find(sample, 'stmap')[0], 'STAMP')
  assert.equal(find(real, 'mckeldon')[0], 'McKK')
  assert.ok(find(real, 'libary').includes('McKK'))
  assert.ok(find(real, 'dinning').includes('SOUTH'))
})

test('a filler word that is not in the name does not hide the building', () => {
  assert.deepEqual(find(sample, 'iribe building'), ['IRB'])
  assert.equal(find(real, 'the iribe center')[0], 'IRB')
})

test('every word typed has to match', () => {
  const halls = find(real, 'dining hall')
  for (const code of ['Y', 'SOUTH', '251']) assert.ok(halls.includes(code), code)
  // Rossborough Inn is a Dining type but not a dining hall.
  assert.ok(!halls.includes('ROSS'))
})

test('initials can be typed together', () => {
  assert.equal(find(sample, 'av williams')[0], 'AVW')
  assert.equal(find(real, 'hj patterson')[0], 'HJP')
})

test('department and type are searched', () => {
  assert.equal(find(real, 'mathematics')[0], 'MATH')
  assert.deepEqual(find(sample, 'computer science'), ['IRB', 'CSI'])
  assert.ok(find(real, 'library').includes('HBK'))
})

test('the description is searched last', () => {
  assert.ok(find(real, 'registrar').includes('MTB'))
  assert.deepEqual(find(sample, 'bookstore'), ['STAMP'])
})

test('state building numbers are not searchable, their names are', () => {
  assert.deepEqual(find(sample, 'b1'), [])
  assert.deepEqual(find(sample, 'b399'), [])
  assert.deepEqual(find(sample, 'aquatic'), ['B399'])
})

test('equal matches keep the order they came in', () => {
  // Both are found by department alone, so neither outranks the other.
  assert.deepEqual(find(sample, 'recreation'), ['B399', 'B164'])
})

test('among equal matches, a building with its own code comes first', () => {
  const aquatic = sample.find((building) => building.acronym === 'B399')
  const iribe = sample.find((building) => building.acronym === 'IRB')
  // Both names have the word "Center". The state-numbered one is listed first.
  assert.deepEqual(find([aquatic, iribe], 'center'), ['IRB', 'B399'])
})

test('nothing close returns nothing', () => {
  assert.deepEqual(findPlaces(sample, 'zzzzzz', fields), { results: [], approximate: false })
})

// The tests below run on the aliases in the real data files.

test('feedback: the football stadium is found', () => {
  for (const query of ['stadium', 'football stadium', 'secu', 'byrd stadium', 'maryland stadium']) {
    assert.equal(find(real, query)[0], 'SECU', query)
  }
  // The site lists the state's buildings first. The baseball and softball
  // stadiums are among them and must not push the football stadium down.
  const others = state.filter((building) => ['B159', 'B409'].includes(building.acronym))
  assert.deepEqual(find([...others, ...real], 'stadium'), ['SECU', 'B159', 'B409'])
})

test('an official building code finds a building we list under another code', () => {
  const cases = {
    keb: 'KIM', mck: 'McKK', ssu: 'STAMP', mth: 'MATH',
    sdh: 'SOUTH', pac: 'CLARICE', crc: 'ERC', kni: 'KGHT',
  }
  for (const [official, ours] of Object.entries(cases)) {
    assert.equal(find(real, official)[0], ours, official)
  }
})

test('a state building with no acronym is found by its official code', () => {
  const laPlata = state.find((building) => building.acronym === 'B259')
  assert.deepEqual(find([laPlata, ...real], 'lpa'), ['B259'])
  // Its state number is still not something to search for.
  assert.deepEqual(find([laPlata], 'b259'), [])
})

test('nicknames and offices lead to the right building', () => {
  assert.equal(find(real, 'the y')[0], 'Y')
  assert.equal(find(real, 'gym')[0], 'ERC')
  assert.equal(find(real, 'comcast center')[0], 'XFIN')
  assert.equal(find(real, 'cs building')[0], 'IRB')
  // The Main Administration Building's description names both offices too,
  // but the offices are in these two buildings.
  assert.equal(find(real, 'registrar')[0], 'MTB')
  assert.equal(find(real, 'financial aid')[0], 'LEE')
})

test('the campus name in a search is filler, on its own campus only', () => {
  assert.equal(find(real, 'umd stadium')[0], 'SECU')
  assert.ok(find(real, 'university of maryland library').includes('McKK'))
  // "Towson" means nothing on the UMD site, so it is not dropped there.
  assert.deepEqual(find(sample, 'towson stamp'), [])

  const towsonFields = buildingFields(towson)
  const towsonFind = (query) => codes(searchPlaces(towsonData, query, towsonFields))
  assert.equal(towsonFind('towson stadium')[0], 'US')
  assert.equal(towsonFind('towson glen dining')[0], 'GD')
  assert.equal(towsonFind('towson university library')[0], 'CK')
  // A place whose name starts with the campus name is still found by it.
  assert.equal(towsonFind('towson center')[0], 'TC')
  // "UMD" means nothing on the Towson site.
  assert.deepEqual(towsonFind('umd union'), [])
})

test('the old Ellicott dining hall is found as what it is now', () => {
  assert.equal(find(real, 'north campus market')[0], 'B257')
  assert.equal(find(real, 'diner')[0], 'B257')
  // It is not a dining hall any more, so it is not listed with them.
  assert.ok(!find(real, 'dining hall').includes('B257'))
})
