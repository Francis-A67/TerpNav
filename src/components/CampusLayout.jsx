import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { CampusContext } from '../campuses/CampusContext'
import { rememberCampus } from '../campuses'

// Wraps every page of one campus: hands the campus config to the pages, tags
// the subtree so CSS can theme it, and remembers the campus for next visit.
export default function CampusLayout({ campus }) {
  useEffect(() => {
    document.title = campus.title
    rememberCampus(campus.slug)
  }, [campus])

  return (
    <CampusContext.Provider value={campus}>
      {/* The key remounts the pages when the campus changes, so no search
          text, list or map position leaks from one campus into the other. */}
      <div data-campus={campus.slug} key={campus.slug}>
        <Outlet />
      </div>
    </CampusContext.Provider>
  )
}
