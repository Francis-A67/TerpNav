import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import Navbar from '../components/Navbar'
import BuildingCard from '../components/BuildingCard'
import Footer from '../components/Footer'
import LoadingNotice from '../components/LoadingNotice'
import styles from './Buildings.module.css'
import useBuildings from '../hooks/useBuildings'
import { BUILDING_TYPES } from '../utils/buildingTypes'

export default function Buildings() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const query = params.get('search') || ''
  const [searchTerm, setSearchTerm] = useState(query)
  const [selectedTypes, setSelectedTypes] = useState([])
  const { buildings, loading, error, retry } = useBuildings()

  function toggleType(type) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const searchMatched = buildings.filter((building) => {
    return (
      building.acronym.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.department.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // No types selected means no type constraint, so the All chip is a pure reset.
  const filtered = searchMatched.filter(
    (building) => selectedTypes.length === 0 || selectedTypes.includes(building.type)
  )

  // Counts come from the search-filtered set so they track what you type.
  const countFor = (type) => searchMatched.filter((b) => b.type === type).length

  // Canonical categories plus any unrecognized type present in the data, so a
  // building can never end up unreachable by every chip.
  const extraTypes = [...new Set(buildings.map((b) => b.type))]
    .filter((type) => type && !BUILDING_TYPES.includes(type))
    .sort()
  const chipTypes = [...BUILDING_TYPES, ...extraTypes]

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.topBar}>
        <input
          className={styles.searchInput}
          placeholder='Find your building...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoComplete='off'
          spellCheck='false'
          maxLength={100}
        />
        <div className={styles.count}>
          {filtered.length} {filtered.length === 1 ? 'building' : 'buildings'}
        </div>
      </div>

      {!loading && !error && (
        <div className={styles.filterBar}>
          <button
            type='button'
            aria-pressed={selectedTypes.length === 0}
            onClick={() => setSelectedTypes([])}
            className={`${styles.chip} ${selectedTypes.length === 0 ? styles.chipActive : ''}`}
          >
            All
          </button>
          {chipTypes.map((type) => (
            <button
              key={type}
              type='button'
              aria-pressed={selectedTypes.includes(type)}
              onClick={() => toggleType(type)}
              className={`${styles.chip} ${selectedTypes.includes(type) ? styles.chipActive : ''}`}
            >
              {type}
              <span className={styles.chipCount}>{countFor(type)}</span>
            </button>
          ))}
        </div>
      )}

      {loading || error ? (
        <LoadingNotice error={error} onRetry={retry} />
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {searchTerm
            ? `No buildings found for "${searchTerm}"`
            : 'No buildings match the selected types.'}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((building) => (
            <BuildingCard key={building.acronym} building={building} />
          ))}
        </div>
      )}
      <Footer />
    </div>
  )
}
