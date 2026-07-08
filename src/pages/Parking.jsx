import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import LoadingNotice from '../components/LoadingNotice'
import { getWithRetry } from '../api/axios'
import { isFreePeriod } from '../utils/parking'
import { distanceMiles, formatDistance } from '../utils/geo'
import useGeolocation from '../hooks/useGeolocation'
import styles from './parking.module.css'

function ParkingCard({ lot, freeNow, distance }) {
  const lotIsFree = lot.kind !== 'garage' && lot.free_after_hours && freeNow

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
        <div className={styles.code}>{lot.code}</div>
      </div>
      {distance != null && (
        <div className={styles.distance}>{formatDistance(distance)} away</div>
      )}
      {lot.kind === 'garage' ? (
        <span className={`${styles.badge} ${styles.badgeGarage}`}>Paid visitor parking — 24/7</span>
      ) : !lot.free_after_hours ? (
        <span className={`${styles.badge} ${styles.badgeGarage}`}>Not public parking</span>
      ) : lotIsFree ? (
        <span className={`${styles.badge} ${styles.badgeFree}`}>Likely FREE right now</span>
      ) : (
        <span className={`${styles.badge} ${styles.badgePermit}`}>Permit hours — free after 4pm &amp; weekends</span>
      )}
      <div className={styles.note}>{lot.note}</div>
      <button className={styles.dirBtn} onClick={handleDirections}>
        Directions
      </button>
    </div>
  )
}

export default function Parking() {
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
    getWithRetry('/api/parking/')
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
  }, [attempt])

  function retry() {
    setLoading(true)
    setError(false)
    setAttempt(a => a + 1)
  }

  const freeNow = isFreePeriod()
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
          placeholder='Find a lot or garage... e.g. "Lot 1b" or "Union Lane"'
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
        {freeNow
          ? 'Right now most surface lots are FREE (evenings after 4pm & weekends) — check posted signs; event restrictions apply.'
          : 'Right now it’s permit hours (Mon–Fri 7am–4pm) — surface lots are free after 4pm and on weekends. Garages take visitor payment anytime.'}
        {' '}
        <Link to="/map" className={styles.mapLink}>View on map →</Link>
      </div>

      {loading || error ? (
        <LoadingNotice error={error} onRetry={retry} />
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>No parking found for "{searchTerm}"</div>
      ) : nearActive ? (
        <>
          <div className={styles.sectionTitle}>Nearest parking to you</div>
          <div className={styles.grid}>
            {nearest.map(p => (
              <ParkingCard key={p.code} lot={p} freeNow={freeNow} distance={p.distance} />
            ))}
          </div>
        </>
      ) : (
        <>
          {garages.length > 0 && (
            <>
              <div className={styles.sectionTitle}>Garages — paid visitor parking</div>
              <div className={styles.grid}>
                {garages.map(p => <ParkingCard key={p.code} lot={p} freeNow={freeNow} />)}
              </div>
            </>
          )}
          {lots.length > 0 && (
            <>
              <div className={styles.sectionTitle}>Surface lots</div>
              <div className={styles.grid}>
                {lots.map(p => <ParkingCard key={p.code} lot={p} freeNow={freeNow} />)}
              </div>
            </>
          )}
        </>
      )}
      <Footer />
    </div>
  )
}
