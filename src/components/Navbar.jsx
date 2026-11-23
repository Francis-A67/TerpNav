import { useNavigate, useLocation } from 'react-router-dom'
import { CAMPUSES, campusPath } from '../campuses'
import { useCampus } from '../campuses/CampusContext'
import CampusSwitcher from './CampusSwitcher'
import styles from './Navbar.module.css'

// With more than one campus the switcher takes the place of the subtitle,
// since it already names the campus.
const hasSwitcher = Object.keys(CAMPUSES).length > 1

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const campus = useCampus()

  const links = [
    { label: 'Home', path: '/' },
    { label: 'Buildings', path: '/buildings' },
    { label: 'Map', path: '/map' },
    { label: 'Parking', path: '/parking' },
    { label: 'Saved', path: '/saved' },
  ].map((link) => ({ ...link, path: campusPath(campus, link.path) }))

  return (
    <nav className={`${styles.navbar} ${hasSwitcher ? styles.withSwitcher : ''}`}>
      <div className={styles.brand}>
        <button
          className={styles.left}
          onClick={() => navigate(campusPath(campus))}
          aria-label="TerpNav home"
        >
          <div className={styles.logo}>
            <span>Terp</span>Nav
          </div>
          {!hasSwitcher && <div className={styles.logoSub}>{campus.navSub}</div>}
        </button>
        <CampusSwitcher />
      </div>

      <div className={styles.navLinks}>
        {links.map((link) => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className={`${styles.navLink} ${location.pathname === link.path ? styles.navLinkActive : ''}`}
          >
            {link.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

export default Navbar
