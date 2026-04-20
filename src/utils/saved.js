function getSaved() {
    const data = localStorage.getItem('savedBuildings')
    if (!data) return []
    try {
        return JSON.parse(data)
    } catch {
        return []
    }
}

function saveBuilding(acronym) {
    const saved = getSaved()
    saved.push(acronym)
    localStorage.setItem('savedBuildings', JSON.stringify(saved))
}

function unsaveBuilding(acronym) {
    const saved = getSaved()
    const removed = saved.filter(a => a !== acronym)
    localStorage.setItem('savedBuildings', JSON.stringify(removed))
}

export { getSaved, saveBuilding, unsaveBuilding }