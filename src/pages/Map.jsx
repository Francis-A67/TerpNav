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
import { apiPath, campusPath } from '../campuses'
import { useCampus } from '../campuses/CampusContext'
import useGeolocation from '../hooks/useGeolocation'
import useNow from '../hooks/useNow'
import { DISCLAIMER } from '../campuses'
import { buildingFields, findPlaces } from '../utils/search'
import styles from './Map.module.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

function parkingIcon(variantClass) {
  return L.divIcon({
    className: `${styles.pMarker} ${variantClass}`,
    html: 'P',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

// Keyed by the marker and tone names each campus uses in its parking statuses.
const ICONS = {
  free: parkingIcon(styles.pFree),
  permit: parkingIcon(styles.pPermit),
  garage: parkingIcon(styles.pGarage),
}

const BADGES = {
  free: styles.badgeFree,
  permit: styles.badgePermit,
  garage: styles.badgeGarage,
}

const DOTS = {
  free: styles.dotFree,
  permit: styles.dotPermit,
  garage: styles.dotGarage,
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
  const campus = useCampus()
  const rules = campus.parking
  const { buildings: allBuildings, loading, error, retry } = useBuildings()
  const buildings = allBuildings.filter(b => b.latitude && b.longitude)

  const [parking, setParking] = useState([])
  const [showParking, setShowParking] = useState(true)
  const [showBuildings, setShowBuildings] = useState(true)
  const geo = useGeolocation({ watch: true })
  const [locateNonce, setLocateNonce] = useState(0)
  const [query, setQuery] = useState('')
  // Re-read the clock every minute so the parking pins stay correct.
  const now = useNow()

  function handleLocate() {
    geo.request()
    setLocateNonce(n => n + 1)
  }

  useEffect(() => {
    getWithRetry(apiPath(campus, '/api/parking/'))
      .then(res => setParking(res.data))
      .catch(() => {})
  }, [campus])

  const q = query.trim().toLowerCase()
  // Same search as the building list, so a nickname or a misspelling that
  // works there works on the map too.
  const found = findPlaces(buildings, query, buildingFields(campus))
  const shownBuildings = found.results
  const count = shownBuildings.length
  const buildingCount = found.approximate
    ? `${count} close ${count === 1 ? 'match' : 'matches'}`
    : `${count} ${count === 1 ? 'building' : 'buildings'}`
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
            aria-label="Search buildings or parking"
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
              {buildingCount}
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
              {rules.legend.map((item) => (
                <div key={item.text}>
                  <span className={`${styles.dot} ${DOTS[item.tone]}`} /> {item.text}
                </div>
              ))}
            </div>
          )}
          <div className={styles.disclaimer}>{DISCLAIMER}</div>
        </div>
        <MapContainer center={campus.map.center} zoom={campus.map.zoom} className={styles.map}>
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
                <Link to={campusPath(campus, `/building/${b.acronym}`)}>View details →</Link>
              </Popup>
            </Marker>
          ))}
          {showParking && shownParking.map(p => {
            const status = rules.statuses[rules.lotStatus(p, now)]
            return (
              <Marker key={p.code} position={[p.latitude, p.longitude]} icon={ICONS[status.marker]}>
                <Popup>
                  <strong>{p.name}</strong>
                  <br />
                  <span className={BADGES[status.tone]}>{status.mapLabel}</span>
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
