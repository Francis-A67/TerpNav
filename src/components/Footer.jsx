import { DISCLAIMER } from '../campuses'
import { useCampus } from '../campuses/CampusContext'
import styles from './Footer.module.css'

function Footer() {
  const campus = useCampus()

  return (
    <footer className={styles.footer}>
      <div>
        <a
          className={styles.feedback}
          href='https://forms.gle/1bnDxDRXm9dTZzRf9'
          target='_blank'
          rel='noopener noreferrer'
        >
          Feedback
        </a>
      </div>
      <div>© {new Date().getFullYear()} Francis Ametewee · TerpNav</div>
      <div className={styles.sources}>
        {campus.dataCredit}
        {' · '}
        <a
          className={styles.sourceLink}
          href='https://www.openstreetmap.org/copyright'
          target='_blank'
          rel='noopener noreferrer'
        >
          OpenStreetMap license
        </a>
      </div>
      <div className={styles.sources}>{DISCLAIMER}</div>
    </footer>
  )
}

export default Footer
