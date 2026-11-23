import {useNavigate} from 'react-router-dom'
import BuildingCard from './BuildingCard'
import LoadingNotice from './LoadingNotice'
import { CloseMatches, NoResults } from './SearchHelp'
import styles from './BuildingsGrid.module.css'
import useBuildings from '../hooks/useBuildings'
import { campusPath } from '../campuses'
import { useCampus } from '../campuses/CampusContext'
import { buildingFields, findPlaces, normalize } from '../utils/search'

function BuildingsGrid({ filter = '' }) {
  const navigate = useNavigate()
  const campus = useCampus()
  const { buildings, loading, error, retry } = useBuildings()

  // Punctuation alone ("??") is not a search.
  const isSearching = normalize(filter) !== ''
  const found = findPlaces(buildings, filter, buildingFields(campus))

  const shown = isSearching
    ? found.results
    : buildings.filter(b => campus.hasAcronym(b))
  const matchWord = found.approximate ? 'close match' : 'match'

  if (loading || error) {
    return (
      <div className={styles.section}>
        <LoadingNotice error={error} onRetry={retry} />
      </div>
    )
  }

  const allBuildingsPath = isSearching
    ? campusPath(campus, `/buildings?search=${encodeURIComponent(filter.trim())}`)
    : campusPath(campus, '/buildings')

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.title}>
          {isSearching ? `${shown.length} ${matchWord}${shown.length === 1 ? '' : 'es'}` : 'Popular buildings'}
        </div>
        <button className={styles.viewAll} onClick={() => navigate(allBuildingsPath)}>
          {isSearching ? 'See all results →' : 'View all buildings →'}
        </button>
      </div>
      {isSearching && found.approximate && (
        <div className={styles.note}>
          <CloseMatches query={filter} />
        </div>
      )}
      {isSearching && shown.length === 0 ? (
        <div className={styles.empty}>
          <NoResults query={filter} />
        </div>
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
