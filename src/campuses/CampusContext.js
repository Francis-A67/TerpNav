import { createContext, useContext } from 'react'
import { CAMPUSES, DEFAULT_CAMPUS } from './index.js'

// Holds the campus whose pages are on screen. CampusLayout provides it;
// anything rendered outside a layout (the 404 page) falls back to UMD.
export const CampusContext = createContext(CAMPUSES[DEFAULT_CAMPUS])

export function useCampus() {
  return useContext(CampusContext)
}
