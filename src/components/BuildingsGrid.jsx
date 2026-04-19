import {useNavigate} from 'react-router-dom'
import BuildingCard from './BuildingCard'
import styles from './BuildingsGrid.module.css'
import { useState, useEffect } from 'react'
import api from '../api/axios'

function BuildingsGrid() {
  const navigate = useNavigate()

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.title}>Popular buildings</div>
        <button
          className={styles.viewAll}
          onClick={() => navigate('/buildings')}
        >
          View all buildings →
        </button>
      </div>
      <div className={styles.grid}>
        {buildings.slice(0, 6).map((building) => (
          <BuildingCard key={building.acronym} building={building} />
        ))}
      </div>
    </div>
  )
}

export default BuildingsGrid