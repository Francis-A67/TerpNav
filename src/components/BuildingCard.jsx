import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import styles from './BuildingCard.module.css'
import { getSaved, saveBuilding, unsaveBuilding } from '../utils/saved'

const GIS_CODE = /^B\d+$/

function BuildingCard({ building }) {
  const navigate = useNavigate()
  const [isSaved, setSavedBuilding] = useState(getSaved().includes(building.acronym))
  const hasRealAcronym = !GIS_CODE.test(building.acronym)

  function handleSave(e) {
    e.stopPropagation()
    if (isSaved) {
      unsaveBuilding(building.acronym)
      setSavedBuilding(false)
    } else {
      saveBuilding(building.acronym)
      setSavedBuilding(true)
    }
  }

  function handleDirections(e) {
    e.stopPropagation()
    const query = encodeURIComponent(building.address || building.full_name + ' College Park MD')
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  function handleClick() {
    navigate(`/building/${building.acronym}`)
  }

  return (
    <div className={styles.card} onClick={handleClick}>
      <div className={styles.top}>
        <div className={hasRealAcronym ? styles.acronym : styles.acronymName}>
          {hasRealAcronym ? building.acronym : building.full_name}
        </div>
        {building.department && <div className={styles.badge}>{building.department}</div>}
      </div>
      {hasRealAcronym && <div className={styles.name}>{building.full_name}</div>}
      <div className={styles.dept}>{building.department}</div>
      <div className={styles.footer}>
        <div className={styles.address}>{building.address || 'College Park, MD 20742'}</div>
        <button className={styles.dirBtn} onClick={handleDirections}>
          Directions
        </button>
        <button className={`${styles.starBtn} ${isSaved ? styles.starSaved : ''}`} onClick={handleSave}>
          ★
        </button>
      </div>
    </div>
  )
}

export default BuildingCard