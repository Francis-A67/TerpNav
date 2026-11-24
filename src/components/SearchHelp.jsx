import { Link } from 'react-router-dom'
import { campusPath } from '../campuses'
import { useCampus } from '../campuses/CampusContext'
import { FEEDBACK_URL } from '../utils/links'
import styles from './SearchHelp.module.css'

// People type "parking" or "lot 1" into the building search. Lots and garages
// are not buildings, so the answer is the page that lists them.
const PARKING_WORDS = /\b(parking|park|lots?|garages?|permits?)\b/i

// Shown above results that only matched once spelling was forgiven, so a
// close match is never passed off as the thing that was typed.
export function CloseMatches({ query }) {
  return (
    <div className={styles.note}>
      No exact match for "{query.trim()}". Showing the closest.
    </div>
  )
}

// Shown when a search finds nothing at all: where to look next.
export function NoResults({ query }) {
  const campus = useCampus()

  return (
    <>
      <div>No buildings found for "{query.trim()}"</div>
      {PARKING_WORDS.test(query) && (
        <div className={styles.hint}>
          Looking for parking?{' '}
          <Link className={styles.link} to={campusPath(campus, '/parking')}>
            Open the Parking page
          </Link>
        </div>
      )}
      <div className={styles.hint}>
        Missing a place?{' '}
        <a className={styles.link} href={FEEDBACK_URL} target='_blank' rel='noopener noreferrer'>
          Tell us
        </a>
      </div>
    </>
  )
}
