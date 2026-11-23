import { useNavigate, useLocation } from 'react-router-dom'
import { CAMPUSES, switchPath } from '../campuses'
import { useCampus } from '../campuses/CampusContext'
import styles from './CampusSwitcher.module.css'

const campuses = Object.values(CAMPUSES)

// Picks which campus the site shows. A native <select> works with the
// keyboard and screen readers as is, and opens the phone's own picker.
export default function CampusSwitcher() {
  const campus = useCampus()
  const navigate = useNavigate()
  const location = useLocation()

  if (campuses.length < 2) return null

  function handleChange(e) {
    navigate(switchPath(campus, CAMPUSES[e.target.value], location.pathname))
  }

  return (
    <label className={styles.wrap}>
      <span className={styles.label}>Campus</span>
      <select className={styles.select} value={campus.slug} onChange={handleChange}>
        {campuses.map((option) => (
          <option key={option.slug} value={option.slug}>
            {option.shortName}
          </option>
        ))}
      </select>
    </label>
  )
}
