import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import styles from './BuildingDetail.module.css'


const GIS_CODE = /^B\d+$/

export default function BuildingDetail() {
  const { acronym } = useParams()
  const navigate = useNavigate()

  const [building, setBuilding] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [buildingTips, setTips] = useState([])
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get(`/api/buildings/${acronym}/`)
      .then(res => setBuilding(res.data))
      .catch(() => setNotFound(true))
  }, [acronym])

  useEffect(() => {
    api.get(`/api/buildings/tips/${acronym}/`)
      .then(res => setTips(res.data))
  }, [acronym])

  useEffect(() => {
    api.get(`/api/buildings/${acronym}/comments/`)
      .then(res => setComments(res.data))
  }, [acronym])

  async function handleCommentSubmit(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    try {
      const res = await api.post(`/api/buildings/${acronym}/comments/`, { text: commentText.trim() })
      setComments(prev => [res.data, ...prev])
      setCommentText('')
    } finally {
      setSubmitting(false)
    }
  }

  function handleDirections() {
    const query = encodeURIComponent(building.address || building.full_name + ' College Park MD')
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  if (notFound) return <div>Building not found.</div>
  if (!building) return <div>Loading...</div>

  const hasRealAcronym = !GIS_CODE.test(building.acronym)

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

        {building.image_url && (
          <div className={styles.photoWrap}>
            <img
              className={styles.photo}
              src={building.image_url}
              alt={building.full_name}
              loading="lazy"
              onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
            />
            <a
              className={styles.photoCredit}
              href={building.image_url.split('?')[0].replace('Special:FilePath/', 'File:')}
              target="_blank"
              rel="noopener noreferrer"
            >
              Photo: Wikimedia Commons
            </a>
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.cardTitle}>Building info</div>
          {building.description && (
            <p className={styles.description}>{building.description}</p>
          )}
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