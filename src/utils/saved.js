import { DEFAULT_CAMPUS } from '../campuses/index.js'

// One list of saved acronyms per campus. UMD keeps the original key, so
// buildings saved before other campuses existed are still there.
function storageKey(campus) {
  return campus.slug === DEFAULT_CAMPUS ? 'savedBuildings' : `savedBuildings:${campus.slug}`
}

function getSaved(campus) {
  const data = localStorage.getItem(storageKey(campus))
  if (!data) return []
  try {
    const saved = JSON.parse(data)
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function saveBuilding(campus, acronym) {
  const saved = getSaved(campus)
  if (saved.includes(acronym)) return
  saved.push(acronym)
  localStorage.setItem(storageKey(campus), JSON.stringify(saved))
}

function unsaveBuilding(campus, acronym) {
  const removed = getSaved(campus).filter(a => a !== acronym)
  localStorage.setItem(storageKey(campus), JSON.stringify(removed))
}

export { getSaved, saveBuilding, unsaveBuilding }
