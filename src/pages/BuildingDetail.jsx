import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import styles from './BuildingDetail.module.css'


export default function BuildingDetail() {
  const { acronym } = useParams()
  const navigate = useNavigate()

  const [building, setBuilding] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    api.get(`/api/buildings/${acronym}/`)
      .then(res => setBuilding(res.data))
      .catch(() => setNotFound(true))
  }, [acronym])

  function handleDirections() {
    const query = encodeURIComponent(building.address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  if (notFound) return <div>Building not found.</div>
  if (!building) return <div>Loading...</div>

  const buildingTips = tips[acronym] || []

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.header}>
        <div className={styles.acronym}>{building.acronym}</div>
        <div className={styles.fullName}>{building.full_name}</div>
      </div>

      <div className={styles.body}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Building info</div>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Department</span>
            <span className={styles.detailVal}>{building.department}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Address</span>
            <span className={styles.detailVal}>{building.address}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailKey}>Hours</span>
            <span className={styles.detailVal}>{building.hours}</span>
          </div>
        </div>

        <button className={styles.dirBtn} onClick={handleDirections}>
          Get directions from my location
        </button>

        {buildingTips.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Student tips</div>
            {buildingTips.map((tip, index) => (
              <div key={index} className={styles.tipCard}>
                <div className={styles.tipText}>{tip.text}</div>
                <div className={styles.tipMeta}>{tip.helpful} students found this helpful</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}