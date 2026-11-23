import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api, { getWithRetry } from '../api/axios'
import { apiPath, campusPath } from '../campuses'
import { useCampus } from '../campuses/CampusContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import LoadingNotice from '../components/LoadingNotice'
import styles from './BuildingDetail.module.css'


// Esri World Imagery export (no API key). The dLat/dLon below span
// about 220m x 110m at true aspect.
function aerialUrl(lat, lon) {
  const dLat = 0.00055
  const dLon = 0.00142
  const bbox = `${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat}`
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=800,400&format=jpg&f=image`
}

export default function BuildingDetail() {
  const { acronym } = useParams()
  const navigate = useNavigate()
  const campus = useCampus()

  const [building, setBuilding] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [buildingTips, setTips] = useState([])
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState('')

  useEffect(() => {
    getWithRetry(apiPath(campus, `/api/buildings/${acronym}/`))
      .then(res => setBuilding(res.data))
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true)
        else setLoadError(true)
      })
  }, [acronym, campus])

  useEffect(() => {
    getWithRetry(apiPath(campus, `/api/buildings/tips/${acronym}/`))
      .then(res => setTips(res.data))
      .catch(() => {})
  }, [acronym, campus])

  useEffect(() => {
    getWithRetry(apiPath(campus, `/api/buildings/${acronym}/comments/`))
      .then(res => setComments(res.data))
      .catch(() => {})
  }, [acronym, campus])

  async function handleCommentSubmit(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    setCommentError('')
    try {
      const res = await api.post(
        apiPath(campus, `/api/buildings/${acronym}/comments/`),
        { text: commentText.trim() },
      )
      setComments(prev => [res.data, ...prev])
      setCommentText('')
    } catch (err) {
      if (err.response?.status === 429) {
        setCommentError('Too many comments. Try again later.')
      } else {
        setCommentError(err.response?.data?.error || 'Could not post your comment.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleDirections() {
    const dest = building.latitude != null && building.longitude != null
      ? `${building.latitude},${building.longitude}`
      : building.address || `${building.full_name} ${campus.cityFallback}`
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`, '_blank')
  }

  if (notFound) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.body}>
          <div>Building not found.</div>
          <Link className={styles.backLink} to={campusPath(campus, '/buildings')}>
            See all {campus.shortName} buildings →
          </Link>
        </div>
      </div>
    )
  }
  if (loadError) {
    return (
      <div className={styles.page}>
        <Navbar />
        <LoadingNotice error onRetry={() => window.location.reload()} />
      </div>
    )
  }
  if (!building) {
    return (
      <div className={styles.page}>
        <Navbar />
        <LoadingNotice />
      </div>
    )
  }

  const hasRealAcronym = campus.hasAcronym(building)
  const hasLocation = building.latitude != null && building.longitude != null

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.header}>
        {hasRealAcronym ? (
          <>
            <div className={styles.acronym}>{building.acronym}</div>
            <div className={styles.fullName}>{building.full_name}</div>
          </>
        ) : (
          <div className={styles.acronym} style={{ fontSize: '28px' }}>{building.full_name}</div>
        )}
      </div>

      <div className={styles.body}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>

        {(building.image_url || (building.latitude && building.longitude)) && (
          <div className={styles.photoWrap}>
            <img
              className={styles.photo}
              src={building.image_url || aerialUrl(building.latitude, building.longitude)}
              alt={building.image_url ? building.full_name : `Aerial view of ${building.full_name}`}
              loading="lazy"
              onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
            />
            {building.image_url ? (
              <a
                className={styles.photoCredit}
                href={
                  building.image_url.includes('Special:FilePath/')
                    ? building.image_url.split('?')[0].replace('Special:FilePath/', 'File:')
                    : 'https://commons.wikimedia.org/'
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Photo: Wikimedia Commons
              </a>
            ) : (
              <span className={styles.photoCredit}>Aerial imagery © Esri &amp; partners</span>
            )}
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.cardTitle}>Building info</div>
          {building.description && (
            <p className={styles.description}>{building.description}</p>
          )}
          {/* A row is only shown when there is a verified value to put in it. */}
          {building.department && (
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Department</span>
              <span className={styles.detailVal}>{building.department}</span>
            </div>
          )}
          {building.address && (
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Address</span>
              <span className={styles.detailVal}>{building.address}</span>
            </div>
          )}
          {building.hours && (
            <div className={styles.detailRow}>
              <span className={styles.detailKey}>Hours</span>
              <span className={styles.detailVal}>{building.hours}</span>
            </div>
          )}
        </div>

        {hasLocation || !campus.officialMap ? (
          <button className={styles.dirBtn} onClick={handleDirections}>
            Get directions from my location
          </button>
        ) : (
          // Without a confirmed location a directions search could lead to
          // the wrong place, so point to the official map instead.
          <a
            className={styles.backLink}
            href={campus.officialMap}
            target="_blank"
            rel="noopener noreferrer"
          >
            Location not confirmed yet. Find it on the official campus map →
          </a>
        )}

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

        <div className={styles.card}>
          <div className={styles.cardTitle}>Comments</div>
          <form className={styles.commentForm} onSubmit={handleCommentSubmit}>
            <textarea
              className={styles.commentInput}
              placeholder="Leave a comment for other students..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              maxLength={500}
              rows={3}
            />
            {commentError && (
              <div className={styles.commentError}>{commentError}</div>
            )}
            <button
              className={styles.commentBtn}
              type="submit"
              disabled={!commentText.trim() || submitting}
            >
              {submitting ? 'Posting...' : 'Post comment'}
            </button>
          </form>

          {comments.length === 0 ? (
            <div className={styles.noComments}>No comments yet. Be the first!</div>
          ) : (
            comments.map(c => (
              <div key={c.id} className={styles.commentCard}>
                <div className={styles.commentText}>{c.text}</div>
                <div className={styles.commentMeta}>
                  {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
