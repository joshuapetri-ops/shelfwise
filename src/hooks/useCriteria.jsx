/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, createContext, useContext } from 'react'

const STORAGE_KEY = 'shelfwise-criteria'
const CriteriaContext = createContext()

const DEFAULTS = [
  { id: 'overall', name: 'Overall', emoji: '⭐', max: 5, type: 'stars' },
  { id: 'plot', name: 'Plot', emoji: '📖', max: 5, type: 'stars' },
  { id: 'characters', name: 'Characters', emoji: '🧑', max: 5, type: 'stars' },
  { id: 'writing', name: 'Writing', emoji: '✍️', max: 5, type: 'stars' },
  { id: 'enjoyment', name: 'Enjoyment', emoji: '😊', max: 10, type: 'slider' },
]

function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return stored?.length ? stored : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function CriteriaProvider({ children }) {
  const [criteria, setCriteria] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(criteria))
  }, [criteria])

  const addCriterion = useCallback((criterion) => {
    setCriteria((prev) => [...prev, { ...criterion, id: criterion.id ?? crypto.randomUUID() }])
  }, [])

  const updateCriterion = useCallback((id, updates) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }, [])

  const removeCriterion = useCallback((id) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const reorderCriteria = useCallback((newOrder) => {
    setCriteria(newOrder)
  }, [])

  return (
    <CriteriaContext.Provider value={{ criteria, addCriterion, updateCriterion, removeCriterion, reorderCriteria }}>
      {children}
    </CriteriaContext.Provider>
  )
}

export default function useCriteria() {
  return useContext(CriteriaContext)
}
