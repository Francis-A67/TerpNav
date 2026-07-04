import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import Navbar from '../components/Navbar'
import LoadingNotice from '../components/LoadingNotice'
import useBuildings from '../hooks/useBuildings'
import styles from './Map.module.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const UMD_CENTER = [38.9869, -76.9426]

export default function Map() {
  const { buildings: allBuildings, loading, error, retry } = useBuildings()
  const buildings = allBuildings.filter(b => b.latitude && b.longitude)

  return (
    <div className={styles.page}>
      <Navbar />
      {(loading || error) && (
        <LoadingNotice compact error={error} onRetry={retry} />
      )}
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
      </MapContainer>
    </div>
  )
}
