import { Link, useNavigate } from 'react-router-dom'
import { CAMPUSES, campusPath } from '../campuses'
import { useCampus } from '../campuses/CampusContext'
import styles from './Hero.module.css'

function sanitize(input) {
  return input
    .replace(/[<>'"]/g, '')
}

function Hero({ query, onQueryChange }) {
  const navigate = useNavigate()
  const campus = useCampus()
  const { hero } = campus
  // A visitor from another campus who lands here should see they can switch.
  const otherCampuses = Object.values(CAMPUSES).filter((other) => other.slug !== campus.slug)

  function handleSearch() {
    const clean = sanitize(query)
    if (clean) {
      navigate(campusPath(campus, `/buildings?search=${encodeURIComponent(clean)}`))
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div
      className={styles.hero}
      style={{
        '--hero-image': `url('${hero.image}')`,
        '--hero-position': hero.imagePosition,
      }}
    >
      <h1 className={styles.title}>
        {hero.title}
      </h1>
      <p className={styles.subtitle}>
        Search by acronym, department, or building name.
      </p>
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          placeholder={hero.placeholder}
          aria-label="Search buildings"
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
      {otherCampuses.map((other) => (
        <Link key={other.slug} className={styles.switchHint} to={campusPath(other)}>
          At {other.shortName}? Switch to {other.name} →
        </Link>
      ))}
      <a
        className={styles.heroCredit}
        href={hero.credit.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {hero.credit.text}
      </a>
    </div>
  )
}

export default Hero
