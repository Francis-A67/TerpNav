import styles from './Footer.module.css'

function Footer() {
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
        Building data: Maryland iMAP · Addresses © OpenStreetMap contributors · Photos via Wikimedia Commons
      </div>
    </footer>
  )
}

export default Footer
