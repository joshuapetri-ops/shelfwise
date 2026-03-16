/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import useAuth from './useAuth'
import { writeSettings, fetchSettings } from '../lib/pdsSync'

const STORAGE_KEY = 'shelfwise-settings'
const SettingsContext = createContext()

const DEFAULTS = {
  theme: 'light',
  defaultAction: 'details',
  defaultAcquire: 'none',
  libraryCode: '',
  libraryName: '',
  language: 'en',
}

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)
  const auth = useAuth()
  const hasSynced = useRef(false)

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // Dark mode class toggle
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings.theme])

  // Sync from PDS on auth
  useEffect(() => {
    if (!auth?.isAuthenticated || !auth.agent || !auth.did || hasSynced.current) return
    hasSynced.current = true

    async function sync() {
      try {
        const pdsSettings = await fetchSettings(auth.agent, auth.did)
        if (pdsSettings) {
          setSettings((prev) => {
            // PDS settings override localStorage, but keep any local-only keys
            return { ...prev, ...pdsSettings }
          })
        }
      } catch { /* non-fatal */ }
    }
    sync()
  }, [auth])

  // Write to PDS after changes (debounced)
  const syncTimeout = useRef(null)
  useEffect(() => {
    if (!auth?.isAuthenticated || !auth.agent || !auth.did) return
    clearTimeout(syncTimeout.current)
    syncTimeout.current = setTimeout(() => {
      writeSettings(auth.agent, auth.did, settings).catch(() => {})
    }, 1000)
    return () => clearTimeout(syncTimeout.current)
  }, [settings, auth])

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}

export default function useSettings() {
  return useContext(SettingsContext)
}
