import Navbar from '../components/Navbar'
import styles from './saved.module.css'
import { getSaved, saveBuilding, unsaveBuilding  } from '../utils/saved'
import { useState, useEffect } from 'react'
import BuildingCard from '../components/BuildingCard'
import api from '../api/axios'

export default function Saved() { 
    const [building,  setBuildings] = useState([])
    const saved = getSaved()
    let filtered = []

    useEffect(() => {
        api.get('api/buildings/').then(res => {
            filtered = res.data.filter(b => saved.includes(b))
            setBuildings(filtered)
            }
        )
    }, [])
    
    return (
    <div className={styles.page}>
        <Navbar />

        {filtered.length === 0 ? (
          <div className={styles.empty}>No saved Buildings</div>
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
