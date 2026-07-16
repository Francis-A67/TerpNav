import { useState, useRef, useEffect } from 'react'

// Browser geolocation with a request() trigger (must be user-initiated so the
// permission prompt makes sense). watch: true keeps updating as you move.
export default function useGeolocation({ watch = false } = {}) {
  const [position, setPosition] = useState(null) // { lat, lon, accuracy }
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const watchId = useRef(null)

  function request() {
    if (!('geolocation' in navigator)) {
      setError('Location is not supported by this browser.')
      return
    }
    setLoading(true)
    setError('')
    const onOk = (pos) => {
      setLoading(false)
      setPosition({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      })
    }
    const onErr = (e) => {
      setLoading(false)
      setError(
        e.code === 1
          ? 'Location permission denied. Allow location access in your browser to use this.'
          : 'Could not get your location. Try again.'
      )
    }
    const opts = { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    if (watch) {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
      watchId.current = navigator.geolocation.watchPosition(onOk, onErr, opts)
    } else {
      navigator.geolocation.getCurrentPosition(onOk, onErr, opts)
    }
  }

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [])

  return { position, error, loading, request }
}
