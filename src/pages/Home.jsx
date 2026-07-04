import { useState } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import BuildingsGrid from '../components/BuildingsGrid'
import Footer from '../components/Footer'

export default function Home() {
  const [query, setQuery] = useState('')

  return (
    <div>
      <Navbar />
      <Hero query={query} onQueryChange={setQuery} />
      <BuildingsGrid filter={query} />
      <Footer />
    </div>
  )
}
