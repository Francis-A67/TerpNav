import { useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import BuildingCard from '../components/BuildingCard'
import styles from './Buildings.module.css'
import api from '../api/axios'

export default function Buildings() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const query = params.get('search') || ''
  const [searchTerm, setSearchTerm] = useState(query)
  const [buildings, setBuildings] = useState([])

  useEffect(() => {
    api.get('/api/buildings/').then(res => setBuildings(res.data))
  }, [])
  
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

      {filtered.length === 0 ? (
        <div className={styles.empty}>No buildings found for "{searchTerm}"</div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((building) => (
            <BuildingCard key={building.acronym} building={building} />
          ))}
        </div>
      )}
    </div>
  )
}
