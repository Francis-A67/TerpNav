import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import BuildingDetail from './pages/BuildingDetail'
import Saved from './pages/Saved'
import Profile from './pages/Profile'
import Buildings from './pages/Buildings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/buildings" element={<Buildings />} />
        <Route path="/building/:acronym" element={<BuildingDetail />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App