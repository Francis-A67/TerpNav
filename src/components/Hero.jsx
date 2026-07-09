import { useNavigate } from 'react-router-dom'
import styles from './Hero.module.css'

function sanitize(input) {
  return input
    .replace(/[<>'"]/g, '')
}

function Hero({ query, onQueryChange }) {
  const navigate = useNavigate()

  function handleSearch() {
    const clean = sanitize(query)
    if (clean) {
      navigate(`/buildings?search=${encodeURIComponent(clean)}`)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className={styles.hero}>
      <h1 className={styles.title}>
        Find any UMD building
      </h1>
      <p className={styles.subtitle}>
        Search by acronym, department, or building name.
      </p>
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          placeholder='Search "IRB", "Iribe Center", or "Computer Science"...'
          value={query}
          onChange={(e) => onQueryChange(sanitize(e.target.value))}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
        />
        <button className={styles.searchBtn} onClick={handleSearch}>
          Search
        </button>
      </div>
      <a
        className={styles.heroCredit}
        href="https://commons.wikimedia.org/wiki/File:McKeldin_Library,_front_view,_mid-afternoon_light,_August_21,_2006.jpg"
        target="_blank"
        rel="noopener noreferrer"
      >
        Photo: McKeldin Library by Tomf688, Wikimedia Commons (CC BY-SA 2.5)
      </a>
    </div>
  )
}

export default Hero