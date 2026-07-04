import { useState } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import BuildingsGrid from '../components/BuildingsGrid'

export default function Home() {
  const [query, setQuery] = useState('')

  return (
    <div>
      <Navbar />
      <Hero query={query} onQueryChange={setQuery} />
      <BuildingsGrid filter={query} />
    </div>
  )
}
