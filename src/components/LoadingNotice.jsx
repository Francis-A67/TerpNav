import styles from './LoadingNotice.module.css'

function LoadingNotice({ error, onRetry, compact }) {
  if (error) {
    return (
      <div className={compact ? styles.compact : styles.wrap}>
        <div className={styles.text}>Couldn&apos;t reach the server.</div>
        <button className={styles.btn} onClick={onRetry}>Try again</button>
      </div>
    )
  }
  return (
    <div className={compact ? styles.compact : styles.wrap}>
      <div className={styles.spinner} />
      <div className={styles.text}>
        Waking up the server. This can take up to a minute after a quiet period.
      </div>
    </div>
  )
}

export default LoadingNotice
