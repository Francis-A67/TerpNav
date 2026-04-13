import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Hero.module.css'

function sanitize(input) {
  return input
    .replace(/[<>'"]/g, '')
}

function Hero() {
  const [query, setQuery] = useState('')
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
      <div className={styles.tag}>University of Maryland</div>
      <h1 className={styles.title}>
        Find any UMD building <span>instantly</span>
      </h1>
      <p className={styles.subtitle}>
        Search by acronym, department, or building name. Get directions from your location in one click.
      </p>
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          placeholder='Search "IRB", "Iribe Center", or "Computer Science"...'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
        />
        <button className={styles.searchBtn} onClick={handleSearch}>
          Search
        </button>
      </div>
    </div>
  )
}

export default Hero