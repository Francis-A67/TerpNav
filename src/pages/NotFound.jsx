import { Link, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { ALL_CAMPUSES, CAMPUSES, DEFAULT_CAMPUS, campusPath, getCampus } from '../campuses'
import { CampusContext } from '../campuses/CampusContext'
import styles from './NotFound.module.css'

export default function NotFound() {
  const { pathname } = useLocation()
  const firstSegment = pathname.split('/')[1]
  // A bad link under /towson should still look and navigate like Towson.
  const campus = getCampus(firstSegment) ?? CAMPUSES[DEFAULT_CAMPUS]
  // A campus that exists in the app but is switched off right now.
  const hidden =
    !getCampus(firstSegment) && Object.prototype.hasOwnProperty.call(ALL_CAMPUSES, firstSegment)
      ? ALL_CAMPUSES[firstSegment]
      : null

  return (
    <CampusContext.Provider value={campus}>
      <div className={styles.page} data-campus={campus.slug}>
        <Navbar />
        <div className={styles.body}>
          <h1 className={styles.title}>
            {hidden ? `${hidden.name} is not available right now` : 'Page not found'}
          </h1>
          <p className={styles.text}>
            {hidden
              ? 'This campus is switched off on TerpNav at the moment. Please check back later.'
              : 'That link does not match any page on TerpNav.'}
          </p>
          <div className={styles.links}>
            {Object.values(CAMPUSES).map((option) => (
              <Link key={option.slug} className={styles.link} to={campusPath(option)}>
                Go to {option.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </CampusContext.Provider>
  )
}
