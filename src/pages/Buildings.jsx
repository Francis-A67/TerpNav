import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import Navbar from '../components/Navbar'
import BuildingCard from '../components/BuildingCard'
import Footer from '../components/Footer'
import LoadingNotice from '../components/LoadingNotice'
import styles from './Buildings.module.css'
import useBuildings from '../hooks/useBuildings'

export default function Buildings() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const query = params.get('search') || ''
  const [searchTerm, setSearchTerm] = useState(query)
  const { buildings, loading, error, retry } = useBuildings()

  const filtered = buildings.filter((building) => {
    return (
      building.acronym.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.department.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

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

      {loading || error ? (
        <LoadingNotice error={error} onRetry={retry} />
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>No buildings found for "{searchTerm}"</div>
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
