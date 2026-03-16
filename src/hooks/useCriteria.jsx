/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import useAuth from './useAuth'
import { writeCriteria, fetchCriteria } from '../lib/pdsSync'

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
  const auth = useAuth()
  const hasSynced = useRef(false)

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(criteria))
  }, [criteria])

  // Sync from PDS on auth
  useEffect(() => {
    if (!auth?.isAuthenticated || !auth.agent || !auth.did || hasSynced.current) return
    hasSynced.current = true

    async function sync() {
      try {
        const pdsCriteria = await fetchCriteria(auth.agent, auth.did)
        if (pdsCriteria && pdsCriteria.length > 0) {
          setCriteria(pdsCriteria)
        }
      } catch { /* non-fatal */ }
    }
    sync()
  }, [auth])

  // Write to PDS after any change (debounced by effect)
  const syncTimeout = useRef(null)
  useEffect(() => {
    if (!auth?.isAuthenticated || !auth.agent || !auth.did) return
    clearTimeout(syncTimeout.current)
    syncTimeout.current = setTimeout(() => {
      writeCriteria(auth.agent, auth.did, criteria).catch(() => {})
    }, 1000)
    return () => clearTimeout(syncTimeout.current)
  }, [criteria, auth])

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
