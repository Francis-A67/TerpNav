import { useNavigate, useLocation } from 'react-router-dom'
import styles from './Navbar.module.css'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const links = [
    { label: 'Home', path: '/' },
    { label: 'Buildings', path: '/buildings' },
    { label: 'Map', path: '/map' },
    { label: 'Parking', path: '/parking' },
    { label: 'Saved', path: '/saved' },
  ]

  return (
    <nav className={styles.navbar}>
      <button className={styles.left} onClick={() => navigate('/')} aria-label="TerpNav home">
        <div className={styles.logo}>
          <span>Terp</span>Nav
        </div>
        <div className={styles.logoSub}>UMD Building Navigator</div>
      </button>

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