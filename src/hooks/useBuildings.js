import { useState, useEffect } from 'react'
import { getWithRetry } from '../api/axios'
import { apiPath } from '../campuses'
import { useCampus } from '../campuses/CampusContext'

// Shared fetch for the current campus's building list: handles the slow
// free-tier wake-up with loading/error state and a manual retry.
export default function useBuildings() {
  const campus = useCampus()
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    getWithRetry(apiPath(campus, '/api/buildings/'))
      .then(res => {
        if (!cancelled) setBuildings(res.data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [attempt, campus])

  function retry() {
    setLoading(true)
    setError(false)
    setAttempt(a => a + 1)
  }

  return { buildings, loading, error, retry }
}
