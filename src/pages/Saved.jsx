import Navbar from '../components/Navbar'
import BuildingCard from '../components/BuildingCard'
import Footer from '../components/Footer'
import LoadingNotice from '../components/LoadingNotice'
import { getSaved } from '../utils/saved'
import useBuildings from '../hooks/useBuildings'
import styles from './saved.module.css'

export default function Saved() {
  const { buildings, loading, error, retry } = useBuildings()
  const saved = getSaved()
  const savedBuildings = buildings.filter(b => saved.includes(b.acronym))

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.header}>
        <h2 className={styles.title}>Saved Buildings</h2>
        <span className={styles.count}>{savedBuildings.length} saved</span>
      </div>
      {loading || error ? (
        <LoadingNotice error={error} onRetry={retry} />
      ) : savedBuildings.length === 0 ? (
        <div className={styles.empty}>No saved buildings yet</div>
      ) : (
        <div className={styles.grid}>
          {savedBuildings.map(building => (
            <BuildingCard key={building.acronym} building={building} />
          ))}
        </div>
      )}
      <Footer />
    </div>
  )
}
