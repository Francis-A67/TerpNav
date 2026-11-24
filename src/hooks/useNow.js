import { useState, useEffect } from 'react'

// The current time, refreshed on an interval, so anything that depends on
// the clock (is parking free right now?) stays true on a page left open.
export default function useNow(everyMs = 60000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])

  return now
}
