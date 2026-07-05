import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import BuildingDetail from './pages/BuildingDetail'
import Saved from './pages/Saved'
import Buildings from './pages/Buildings'
import Map from './pages/Map'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/buildings" element={<Buildings />} />
        <Route path="/building/:acronym" element={<BuildingDetail />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/map" element={<Map />} />
        <Route path="/parking" element={<Map parkingFocus />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App