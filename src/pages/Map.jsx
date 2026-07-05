import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import Navbar from '../components/Navbar'
import LoadingNotice from '../components/LoadingNotice'
import useBuildings from '../hooks/useBuildings'
import { getWithRetry } from '../api/axios'
import styles from './Map.module.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const UMD_CENTER = [38.9869, -76.9426]

// DOTS rule of thumb: most surface lots are permit-only Mon–Fri 7am–4pm and
// unrestricted evenings + weekends (posted signs and event days override).
function isFreePeriod(d = new Date()) {
  const day = d.getDay()
  if (day === 0 || day === 6) return true
  const h = d.getHours()
  return h >= 16 || h < 7
}

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

export default function Map() {
  const { buildings: allBuildings, loading, error, retry } = useBuildings()
  const buildings = allBuildings.filter(b => b.latitude && b.longitude)

  const [parking, setParking] = useState([])
  const [showParking, setShowParking] = useState(true)

  useEffect(() => {
    getWithRetry('/api/parking/')
      .then(res => setParking(res.data))
      .catch(() => {})
  }, [])

  const freeNow = isFreePeriod()

  return (
    <div className={styles.page}>
      <Navbar />
      {(loading || error) && (
        <LoadingNotice compact error={error} onRetry={retry} />
      )}
      <div className={styles.mapWrap}>
        <div className={styles.controls}>
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
              <div><span className={`${styles.dot} ${styles.dotGarage}`} /> Garage — paid visitor parking</div>
            </div>
          )}
        </div>
        <MapContainer center={UMD_CENTER} zoom={15} className={styles.map}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {buildings.map(b => (
            <Marker key={b.acronym} position={[b.latitude, b.longitude]}>
              <Popup>
                <strong>{b.acronym}</strong> — {b.full_name}
                <br />
                <Link to={`/building/${b.acronym}`}>View details →</Link>
              </Popup>
            </Marker>
          ))}
          {showParking && parking.map(p => {
            const lotIsFree = p.kind !== 'garage' && p.free_after_hours && freeNow
            const icon = p.kind === 'garage' ? ICONS.garage : lotIsFree ? ICONS.free : ICONS.permit
            return (
              <Marker key={p.code} position={[p.latitude, p.longitude]} icon={icon}>
                <Popup>
                  <strong>{p.name}</strong>
                  <br />
                  {p.kind === 'garage' ? (
                    <span className={styles.badgeGarage}>Paid visitor parking — open 24/7</span>
                  ) : lotIsFree ? (
                    <span className={styles.badgeFree}>Likely FREE right now</span>
                  ) : (
                    <span className={styles.badgePermit}>Permit required now — free after 4pm &amp; weekends</span>
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
