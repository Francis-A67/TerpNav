import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { bootRedirectPath, rememberedCampus } from './campuses'

// A returning visitor who opens the bare site root lands on the campus they
// used last. This runs once, before the router reads the URL, so it never
// fires on in-app navigation and the Back button keeps working.
const target = bootRedirectPath(window.location.pathname, rememberedCampus())
if (target) {
  window.history.replaceState(null, '', target + window.location.search + window.location.hash)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
