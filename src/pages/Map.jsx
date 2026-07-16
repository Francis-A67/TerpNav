import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import Navbar from '../components/Navbar'
import LoadingNotice from '../components/LoadingNotice'
import useBuildings from '../hooks/useBuildings'
import { getWithRetry } from '../api/axios'
import { isFreePeriod } from '../utils/parking'
import useGeolocation from '../hooks/useGeolocation'
import styles from './Map.module.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const UMD_CENTER = [38.9869, -76.9426]

function parkingIcon(variantClass) {
  return L.divIcon({
    className: `${styles.pMarker} ${variantClass}`,
    html: 'P',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

const ICONS = {
  free: parkingIcon(styles.pFree),
  permit: parkingIcon(styles.pPermit),
  garage: parkingIcon(styles.pGarage),
}

const USER_ICON = L.divIcon({
  className: styles.userDot,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

// Flies the map to the user's position each time the locate button is pressed
// (nonce), once the position is actually available.
function FlyToUser({ position, nonce }) {
  const map = useMap()
  const flownFor = useRef(0)
  useEffect(() => {
    if (position && nonce > 0 && flownFor.current !== nonce) {
      flownFor.current = nonce
      map.flyTo([position.lat, position.lon], 17)
    }
  }, [position, nonce, map])
  return null
}

export default function Map() {
  const { buildings: allBuildings, loading, error, retry } = useBuildings()
  const buildings = allBuildings.filter(b => b.latitude && b.longitude)

  const [parking, setParking] = useState([])
  const [showParking, setShowParking] = useState(true)
  const [showBuildings, setShowBuildings] = useState(true)
  const geo = useGeolocation({ watch: true })
  const [locateNonce, setLocateNonce] = useState(0)
  const [query, setQuery] = useState('')

  function handleLocate() {
    geo.request()
    setLocateNonce(n => n + 1)
  }

  useEffect(() => {
    getWithRetry('/api/parking/')
      .then(res => setParking(res.data))
      .catch(() => {})
  }, [])

  const freeNow = isFreePeriod()

  const q = query.trim().toLowerCase()
  const shownBuildings = q
    ? buildings.filter(b =>
        b.acronym.toLowerCase().includes(q) ||
        b.full_name.toLowerCase().includes(q) ||
        b.department.toLowerCase().includes(q)
      )
    : buildings
  const shownParking = q
    ? parking.filter(p =>
        p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      )
    : parking

  return (
    <div className={styles.page}>
      <Navbar />
      {(loading || error) && (
        <LoadingNotice compact error={error} onRetry={retry} />
      )}
      <div className={styles.mapWrap}>
        <div className={styles.searchBox}>
          <input
            className={styles.searchInput}
            placeholder="Search buildings or parking..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck="false"
            maxLength={100}
          />
          {query && (
            <button className={styles.searchClear} onClick={() => setQuery('')} aria-label="Clear search">
              ×
            </button>
          )}
          {q && (
            <div className={styles.searchCount}>
              {shownBuildings.length} {shownBuildings.length === 1 ? 'building' : 'buildings'}
              {' · '}
              {shownParking.length} parking
            </div>
          )}
        </div>
        <div className={styles.controls}>
          <button className={styles.locateBtn} onClick={handleLocate} disabled={geo.loading}>
            {geo.loading ? 'Locating…' : geo.position ? 'Re-center on me' : 'My location'}
          </button>
          {geo.error && <div className={styles.locateError}>{geo.error}</div>}
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showBuildings}
              onChange={(e) => setShowBuildings(e.target.checked)}
            />
            Buildings ({buildings.length})
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showParking}
              onChange={(e) => setShowParking(e.target.checked)}
            />
            Parking ({parking.length})
          </label>
          {showParking && (
            <div className={styles.legend}>
              <div><span className={`${styles.dot} ${styles.dotFree}`} /> Free now (after 4pm &amp; weekends)</div>
              <div><span className={`${styles.dot} ${styles.dotPermit}`} /> Permit hours (Mon–Fri 7am–4pm)</div>
              <div><span className={`${styles.dot} ${styles.dotGarage}`} /> Garage / restricted: see marker</div>
            </div>
          )}
        </div>
        <MapContainer center={UMD_CENTER} zoom={15} className={styles.map}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyToUser position={geo.position} nonce={locateNonce} />
          {geo.position && (
            <>
              <Circle
                center={[geo.position.lat, geo.position.lon]}
                radius={geo.position.accuracy}
                pathOptions={{ color: '#1a73e8', weight: 1, fillOpacity: 0.1 }}
              />
              <Marker position={[geo.position.lat, geo.position.lon]} icon={USER_ICON}>
                <Popup>You are here</Popup>
              </Marker>
            </>
          )}
          {showBuildings && shownBuildings.map(b => (
            <Marker key={b.acronym} position={[b.latitude, b.longitude]}>
              <Popup>
                <strong>{b.acronym}</strong> · {b.full_name}
                <br />
                <Link to={`/building/${b.acronym}`}>View details →</Link>
              </Popup>
            </Marker>
          ))}
          {showParking && shownParking.map(p => {
            const lotIsFree = p.kind !== 'garage' && p.free_after_hours && freeNow
            const icon = p.kind === 'garage' ? ICONS.garage : lotIsFree ? ICONS.free : ICONS.permit
            return (
              <Marker key={p.code} position={[p.latitude, p.longitude]} icon={icon}>
                <Popup>
                  <strong>{p.name}</strong>
                  <br />
                  {p.kind === 'garage' ? (
                    <span className={styles.badgeGarage}>Garage: paid parking</span>
                  ) : !p.free_after_hours ? (
                    <span className={styles.badgeGarage}>Restricted: see note</span>
                  ) : lotIsFree ? (
                    <span className={styles.badgeFree}>Likely FREE right now</span>
                  ) : (
                    <span className={styles.badgePermit}>Permit required now. Free after 4pm &amp; weekends</span>
                  )}
                  <div className={styles.popupNote}>{p.note}</div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}
