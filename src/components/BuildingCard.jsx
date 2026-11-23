import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import styles from './BuildingCard.module.css'
import { campusPath } from '../campuses'
import { useCampus } from '../campuses/CampusContext'
import { getSaved, saveBuilding, unsaveBuilding } from '../utils/saved'

function BuildingCard({ building }) {
  const navigate = useNavigate()
  const campus = useCampus()
  const [isSaved, setSavedBuilding] = useState(getSaved(campus).includes(building.acronym))
  const hasRealAcronym = campus.hasAcronym(building)

  function handleSave(e) {
    e.stopPropagation()
    if (isSaved) {
      unsaveBuilding(campus, building.acronym)
      setSavedBuilding(false)
    } else {
      saveBuilding(campus, building.acronym)
      setSavedBuilding(true)
    }
  }

  function handleDirections(e) {
    e.stopPropagation()
    const dest = building.latitude != null && building.longitude != null
      ? `${building.latitude},${building.longitude}`
      : building.address || `${building.full_name} ${campus.cityFallback}`
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`, '_blank')
  }

  function handleClick() {
    navigate(campusPath(campus, `/building/${building.acronym}`))
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
        <div className={styles.address}>{building.address || campus.addressFallback}</div>
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
