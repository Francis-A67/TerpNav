import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import CampusLayout from './components/CampusLayout'
import Home from './pages/Home'
import BuildingDetail from './pages/BuildingDetail'
import Saved from './pages/Saved'
import Buildings from './pages/Buildings'
import Map from './pages/Map'
import Parking from './pages/Parking'
import NotFound from './pages/NotFound'
import { CAMPUSES, DEFAULT_CAMPUS, prefixedCampuses } from './campuses'

// The six pages every campus has. Mounted once per campus below.
function campusPages() {
  return (
    <>
      <Route index element={<Home />} />
      <Route path="buildings" element={<Buildings />} />
      <Route path="building/:acronym" element={<BuildingDetail />} />
      <Route path="saved" element={<Saved />} />
      <Route path="map" element={<Map />} />
      <Route path="parking" element={<Parking />} />
    </>
  )
}

// /umd/map is the same page as /map, because the default campus has no prefix.
function DefaultCampusAlias() {
  const location = useLocation()
  const rest = location.pathname.slice(`/${DEFAULT_CAMPUS}`.length) || '/'
  return <Navigate to={rest + location.search + location.hash} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The default campus keeps the un-prefixed URLs it always had. */}
        <Route path="/" element={<CampusLayout campus={CAMPUSES[DEFAULT_CAMPUS]} />}>
          {campusPages()}
        </Route>
        {/* Every other campus gets the same pages under /<slug>. */}
        {prefixedCampuses.map((campus) => (
          <Route
            key={campus.slug}
            path={`/${campus.slug}`}
            element={<CampusLayout campus={campus} />}
          >
            {campusPages()}
          </Route>
        ))}
        <Route path={`/${DEFAULT_CAMPUS}/*`} element={<DefaultCampusAlias />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <SpeedInsights />
      <Analytics />
    </BrowserRouter>
  )
}

export default App
