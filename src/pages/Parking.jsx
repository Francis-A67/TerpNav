import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import LoadingNotice from '../components/LoadingNotice'
import { getWithRetry } from '../api/axios'
import { apiPath, campusPath } from '../campuses'
import { useCampus } from '../campuses/CampusContext'
import { distanceMiles, formatDistance } from '../utils/geo'
import useGeolocation from '../hooks/useGeolocation'
import useNow from '../hooks/useNow'
import styles from './parking.module.css'

// Keyed by the tone names each campus uses in its parking statuses.
const BADGES = {
  free: styles.badgeFree,
  permit: styles.badgePermit,
  garage: styles.badgeGarage,
}

function ParkingCard({ lot, distance, now }) {
  const rules = useCampus().parking
  const status = rules.statuses[rules.lotStatus(lot, now)]

  function handleDirections() {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lot.latitude},${lot.longitude}`,
      '_blank'
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.name}>{lot.name}</div>
        {rules.showLotCode && <div className={styles.code}>{lot.code}</div>}
      </div>
      {distance != null && (
        <div className={styles.distance}>{formatDistance(distance)} away</div>
      )}
      <span className={`${styles.badge} ${BADGES[status.tone]}`}>{status.cardLabel}</span>
      <div className={styles.note}>{lot.note}</div>
      <button className={styles.dirBtn} onClick={handleDirections}>
        Directions
      </button>
    </div>
  )
}

export default function Parking() {
  const campus = useCampus()
  const rules = campus.parking
  const [parking, setParking] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [nearMode, setNearMode] = useState(false)
  const geo = useGeolocation()

  function handleNearMe() {
    if (nearMode) {
      setNearMode(false)
      return
    }
    setNearMode(true)
    if (!geo.position) geo.request()
  }

  useEffect(() => {
    let cancelled = false
    getWithRetry(apiPath(campus, '/api/parking/'))
      .then(res => {
        if (!cancelled) setParking(res.data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [attempt, campus])

  function retry() {
    setLoading(true)
    setError(false)
    setAttempt(a => a + 1)
  }

  // Re-read the clock every minute so a page left open stays correct.
  const now = useNow()
  const expired = rules.isExpired(now)
  const freeNow = !expired && rules.isFreePeriod(now)
  const term = searchTerm.trim().toLowerCase()
  const filtered = parking.filter(
    p => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)
  )
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })
  const garages = filtered.filter(p => p.kind === 'garage').sort(byName)
  const lots = filtered.filter(p => p.kind !== 'garage').sort(byName)

  const nearActive = nearMode && geo.position
  const nearest = nearActive
    ? filtered
        .map(p => ({
          ...p,
          distance: distanceMiles(geo.position.lat, geo.position.lon, p.latitude, p.longitude),
        }))
        .sort((a, b) => a.distance - b.distance)
    : []

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.topBar}>
        <input
          className={styles.searchInput}
          placeholder={rules.searchPlaceholder}
          aria-label="Search parking"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoComplete='off'
          spellCheck='false'
          maxLength={100}
        />
        <button
          className={`${styles.nearBtn} ${nearActive ? styles.nearBtnActive : ''}`}
          onClick={handleNearMe}
          disabled={geo.loading}
        >
          {geo.loading ? 'Locating…' : nearActive ? 'Nearest first ✓' : 'Near me'}
        </button>
        <div className={styles.count}>
          {filtered.length} {filtered.length === 1 ? 'location' : 'locations'}
        </div>
      </div>

      {nearMode && geo.error && (
        <div className={styles.geoError}>{geo.error}</div>
      )}

      <div className={`${styles.statusBanner} ${freeNow ? styles.statusFree : styles.statusPermit}`}>
        {expired ? rules.banner.expired : freeNow ? rules.banner.free : rules.banner.permit}
        {' '}
        <Link to={campusPath(campus, '/map')} className={styles.mapLink}>View on map →</Link>
      </div>
      {rules.verified && <div className={styles.verified}>{rules.verified}</div>}

      {loading || error ? (
        <LoadingNotice error={error} onRetry={retry} />
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>No parking found for "{searchTerm}"</div>
      ) : nearActive ? (
        <>
          <div className={styles.sectionTitle}>Nearest parking to you</div>
          <div className={styles.grid}>
            {nearest.map(p => (
              <ParkingCard key={p.code} lot={p} distance={p.distance} now={now} />
            ))}
          </div>
        </>
      ) : (
        <>
          {garages.length > 0 && (
            <>
              <div className={styles.sectionTitle}>{rules.garagesTitle}</div>
              <div className={styles.grid}>
                {garages.map(p => <ParkingCard key={p.code} lot={p} now={now} />)}
              </div>
            </>
          )}
          {lots.length > 0 && (
            <>
              <div className={styles.sectionTitle}>{rules.lotsTitle}</div>
              <div className={styles.grid}>
                {lots.map(p => <ParkingCard key={p.code} lot={p} now={now} />)}
              </div>
            </>
          )}
        </>
      )}
      <Footer />
    </div>
  )
}
