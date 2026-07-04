import styles from './Footer.module.css'

function Footer() {
  return (
    <footer className={styles.footer}>
      <div>© {new Date().getFullYear()} Francis Ametewee · TerpNav</div>
      <div className={styles.sources}>
        Building data: Maryland iMAP · Addresses © OpenStreetMap contributors · Photos via Wikimedia Commons
      </div>
    </footer>
  )
}

export default Footer
