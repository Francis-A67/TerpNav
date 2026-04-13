import {useNavigate} from 'react-router-dom'
import BuildingCard from './BuildingCard'
import buildings from '../data/buildings.json'
import styles from './BuildingsGrid.module.css'

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