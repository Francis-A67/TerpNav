import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    timeout: 15000, // fail an attempt after 15s instead of hanging forever
})

// Render's free tier spins the backend down after 15 idle minutes; the next
// request waits ~1 min while it boots (and can 502 mid-boot). Retry GETs
// until it wakes: 10 attempts x (15s timeout + 5s pause) covers the worst case.
export async function getWithRetry(url, { retries = 10, delayMs = 5000 } = {}) {
    let lastError
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await api.get(url)
        } catch (err) {
            // 4xx means the server is awake and told us no — don't retry those
            const status = err.response?.status
            if (status && status < 500) throw err
            lastError = err
            await new Promise(resolve => setTimeout(resolve, delayMs))
        }
    }
    throw lastError
}

export default api
