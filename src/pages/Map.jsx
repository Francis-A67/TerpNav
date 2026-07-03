import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import styles from './Map.module.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const UMD_CENTER = [38.9869, -76.9426]

export default function Map() {
  const [buildings, setBuildings] = useState([])

  useEffect(() => {
    api.get('/api/buildings/')
      .then(res => setBuildings(res.data.filter(b => b.latitude && b.longitude)))
  }, [])

  return (
    <div className={styles.page}>
      <Navbar />
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
