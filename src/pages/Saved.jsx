import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import BuildingCard from '../components/BuildingCard'
import { getSaved } from '../utils/saved'
import api from '../api/axios'
import styles from './saved.module.css'

export default function Saved() {
  const [buildings, setBuildings] = useState([])

  useEffect(() => {
    const saved = getSaved()
    api.get('/api/buildings/').then(res => {
      setBuildings(res.data.filter(b => saved.includes(b.acronym)))
    })
  }, [])

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.header}>
        <h2 className={styles.title}>Saved Buildings</h2>
        <span className={styles.count}>{buildings.length} saved</span>
      </div>
      {buildings.length === 0 ? (
        <div className={styles.empty}>No saved buildings yet</div>
      ) : (
        <div className={styles.grid}>
          {buildings.map(building => (
            <BuildingCard key={building.acronym} building={building} />
          ))}
        </div>
      )}
    </div>
  )
}
