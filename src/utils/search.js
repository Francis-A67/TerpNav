// One search for every search box. It forgives how people actually type:
// a nickname ("the Y"), part of a name, an extra word ("iribe building"),
// or a spelling mistake in a long name ("yanhentamisti").

// Words that carry no meaning on their own. They are only dropped when a
// stricter search found nothing, and never when they are the whole query.
// The campus's own name is filler too ("umd library", "towson stadium"); those
// words come from the campus config, see buildingFields().
const STOP_WORDS = new Set(['the', 'of', 'at', 'a', 'an', 'and', 'for', 'in', 'on'])
const NO_WORDS = new Set()
const PLACE_WORDS = new Set(['building', 'bldg', 'hall', 'center', 'centre'])

// How well a query matched, best first. A place is ranked by its best tier.
const TIER = {
  codeExact: 100,   // "esj" is ESJ
  codePrefix: 90,   // "es" starts ESJ
  nameExact: 85,    // the whole name or a nickname, word for word
  nameWord: 80,     // every word typed starts a word of the name
  namePart: 60,     // typed text sits inside a name ("keldin")
  labelWord: 50,    // department or type
  labelPart: 40,
  text: 30,         // only the description mentions it
}

// Lowercase, no accents, no punctuation: "A.V. Williams" becomes "a v williams".
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// People type "av williams" for "A.V. Williams", so runs of single letters
// are also indexed glued together.
function joinInitials(text) {
  return text.replace(/\b([a-z0-9]) (?=[a-z0-9]\b)/g, '$1')
}

// How many single edits turn one word into the other: add a letter, drop one,
// change one, or swap two neighbors ("stmap" to "stamp" is one swap).
export function editDistance(a, b) {
  let twoBack = null
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const change = a[i - 1] === b[j - 1] ? 0 : 1
      let best = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + change)
      const swapped = i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]
      if (swapped) best = Math.min(best, twoBack[j - 2] + 1)
      current.push(best)
    }
    twoBack = previous
    previous = current
  }
  return previous[b.length]
}

// Mistakes allowed in one word: none under 4 letters, then about one per
// four letters, at most 3.
function typosAllowed(length) {
  if (length < 4) return 0
  return Math.min(3, Math.floor(length / 4))
}

// Distance from a typed word to a word of a name. From 6 letters on the typed
// word is also compared with the start of the name, so a long name matches
// while it is still being typed. Shorter words are compared whole, otherwise
// "food" would match "football".
function typoDistance(token, word) {
  let best = editDistance(token, word)
  if (token.length >= 6) {
    for (const length of [token.length - 1, token.length, token.length + 1]) {
      if (length < word.length) best = Math.min(best, editDistance(token, word.slice(0, length)))
    }
  }
  return best
}

function words(phrases) {
  return [...new Set(phrases.flatMap((phrase) => phrase.split(' ')).filter(Boolean))]
}

function phrases(list) {
  const plain = (list ?? []).map(normalize).filter(Boolean)
  return [...new Set([...plain, ...plain.map(joinInitials)])]
}

// The searchable form of one place, built once and kept.
const indexes = new WeakMap()

function indexOf(item, fields) {
  let perFields = indexes.get(fields)
  if (!perFields) {
    perFields = new WeakMap()
    indexes.set(fields, perFields)
  }
  let index = perFields.get(item)
  if (!index) {
    const found = fields(item)
    const code = normalize(found.code)
    const names = phrases(found.names)
    const labels = phrases(found.labels)
    index = {
      code,
      names,
      nameWords: words(code ? [...names, code] : names),
      labels,
      labelWords: words(labels),
      textWords: words(phrases(found.text)),
    }
    perFields.set(item, index)
  }
  return index
}

function startsAny(list, token) {
  return list.some((word) => word.startsWith(token))
}

// "libraries" should find "library" and "courtyards" should find "courtyard".
function singulars(word) {
  if (word.length < 4 || !word.endsWith('s')) return []
  if (word.endsWith('ies')) return [`${word.slice(0, -3)}y`]
  if (word.endsWith('es')) return [word.slice(0, -2), word.slice(0, -1)]
  return [word.slice(0, -1)]
}

// A typed word, with the other forms it is allowed to match as.
function asToken(text) {
  return { text, forms: [text, ...singulars(text)] }
}

// How well one form of a typed word matches a place, 0 for not at all.
// Text inside a word only counts from 4 letters: "cs" must not find
// "Physics", and "art" must not find "Martin Hall". The description is
// searched from 3 letters, where "the" and "of" would match everything.
function formTier(index, form) {
  if (startsAny(index.nameWords, form)) return TIER.nameWord
  const inside = form.length >= 4
  if (inside && index.names.some((name) => name.includes(form))) return TIER.namePart
  if (startsAny(index.labelWords, form)) return TIER.labelWord
  if (inside && index.labels.some((label) => label.includes(form))) return TIER.labelPart
  if (form.length >= 3 && startsAny(index.textWords, form)) return TIER.text
  return 0
}

function tokenTier(index, token) {
  return Math.max(...token.forms.map((form) => formTier(index, form)))
}

// Every typed word has to match; the weakest word sets the rank.
function score(index, query, tokens) {
  if (index.code && index.code === query) return TIER.codeExact
  if (index.code && index.code.startsWith(query)) return TIER.codePrefix
  if (index.names.includes(query)) return TIER.nameExact
  let weakest = Infinity
  for (const token of tokens) {
    const tier = tokenTier(index, token)
    if (tier === 0) return 0
    weakest = Math.min(weakest, tier)
  }
  return weakest
}

// Total spelling mistakes needed for every typed word to match, or null when
// a word is too far from everything. A department match costs half a mistake
// more than a name match, so names come first.
function typoCost(index, tokens) {
  let total = 0
  for (const token of tokens) {
    if (tokenTier(index, token) > 0) continue
    const allowed = typosAllowed(token.text.length)
    if (allowed === 0) return null
    let best = Infinity
    for (const word of index.nameWords) {
      const distance = typoDistance(token.text, word)
      if (distance <= allowed) best = Math.min(best, distance)
    }
    for (const word of index.labelWords) {
      const distance = typoDistance(token.text, word)
      if (distance <= allowed) best = Math.min(best, distance + 0.5)
    }
    if (best === Infinity) return null
    total += best
  }
  return total
}

// Equal matches are settled in two steps: places with a code of their own
// (the main buildings) come first, then the order the list came in. So
// "stadium" shows SECU Stadium before the softball stadium.
function ranked(items, fields, rank, bestFirst) {
  return items
    .map((item, position) => {
      const index = indexOf(item, fields)
      return { item, position, minor: index.code ? 0 : 1, rank: rank(index) }
    })
    .filter((entry) => entry.rank !== null && entry.rank !== 0)
    .sort((a, b) => bestFirst(a.rank, b.rank) || a.minor - b.minor || a.position - b.position)
    .map((entry) => entry.item)
}

// What search reads in a building. State building numbers (B164) are not
// names anyone types, so they are left out of the searchable code.
const buildingFieldsByCampus = new WeakMap()

export function buildingFields(campus) {
  let fields = buildingFieldsByCampus.get(campus)
  if (!fields) {
    fields = (building) => ({
      code: campus.hasAcronym(building) ? building.acronym : '',
      names: [building.full_name, ...(building.aliases ?? [])],
      labels: [building.department, building.type],
      text: [building.description],
    })
    // People add the campus to a search: "umd library", "towson stadium",
    // "university of maryland library". Each campus's own slug, short name and
    // full name count as filler, and only on that campus.
    fields.campusWords = new Set(
      [campus.slug, campus.shortName, campus.name]
        .flatMap((text) => normalize(text).split(' '))
        .filter(Boolean)
    )
    buildingFieldsByCampus.set(campus, fields)
  }
  return fields
}

// Search `items` for `query`. `fields(item)` says what to read in an item:
// { code, names, labels, text }; `fields.campusWords`, when set, are extra
// filler words. Returns the matches, best first, and whether
// they are only close matches (nothing matched as typed, so spelling was
// forgiven). An empty query returns everything in its original order.
export function findPlaces(items, query, fields) {
  const normalized = normalize(query)
  if (!normalized) return { results: items, approximate: false }

  const tokens = normalized.split(' ').map(asToken)
  const highFirst = (a, b) => b - a
  const strict = ranked(items, fields, (index) => score(index, normalized, tokens), highFirst)
  if (strict.length > 0) return { results: strict, approximate: false }

  // "iribe building": the building's name has no "building" in it. Try again
  // without the filler words before giving up on an exact match.
  const campusWords = fields.campusWords ?? NO_WORDS
  const meaningful = tokens.filter(
    (token) =>
      !STOP_WORDS.has(token.text) && !PLACE_WORDS.has(token.text) && !campusWords.has(token.text)
  )
  const relaxed = meaningful.length > 0 && meaningful.length < tokens.length ? meaningful : tokens
  if (relaxed !== tokens) {
    const loose = ranked(items, fields, (index) => score(index, normalized, relaxed), highFirst)
    if (loose.length > 0) return { results: loose, approximate: false }
  }

  // Zero mistakes would have matched above, so a cost of 0 cannot occur here
  // and never collides with the "no match" filter in ranked().
  const close = ranked(items, fields, (index) => typoCost(index, relaxed), (a, b) => a - b)
  return { results: close, approximate: close.length > 0 }
}

// The matches alone, for callers that do not need to know how they matched.
export function searchPlaces(items, query, fields) {
  return findPlaces(items, query, fields).results
}
