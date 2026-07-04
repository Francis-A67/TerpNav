import {useNavigate} from 'react-router-dom'
import BuildingCard from './BuildingCard'
import LoadingNotice from './LoadingNotice'
import styles from './BuildingsGrid.module.css'
import useBuildings from '../hooks/useBuildings'

function BuildingsGrid({ filter = '' }) {
  const navigate = useNavigate()
  const { buildings, loading, error, retry } = useBuildings()

  const term = filter.trim().toLowerCase()
  const isSearching = term.length > 0

  const shown = isSearching
    ? buildings.filter(b =>
        b.acronym.toLowerCase().includes(term) ||
        b.full_name.toLowerCase().includes(term) ||
        b.department.toLowerCase().includes(term)
      )
    : buildings.filter(b => !/^B\d+$/.test(b.acronym))

  if (loading || error) {
    return (
      <div className={styles.section}>
        <LoadingNotice error={error} onRetry={retry} />
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.title}>
          {isSearching ? `${shown.length} ${shown.length === 1 ? 'match' : 'matches'}` : 'Popular buildings'}
        </div>
        <button
          className={styles.viewAll}
          onClick={() => navigate(isSearching ? `/buildings?search=${encodeURIComponent(filter.trim())}` : '/buildings')}
        >
          {isSearching ? 'See all results →' : 'View all buildings →'}
        </button>
      </div>
      {isSearching && shown.length === 0 ? (
        <div className={styles.empty}>No buildings found for "{filter.trim()}"</div>
      ) : (
        <div className={styles.grid}>
          {shown.slice(0, 6).map((building) => (
            <BuildingCard key={building.acronym} building={building} />
          ))}
        </div>
      )}
    </div>
  )
}

export default BuildingsGrid
