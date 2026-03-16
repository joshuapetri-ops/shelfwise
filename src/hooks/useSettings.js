import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'shelfwise-settings'

const DEFAULTS = {
  theme: 'light',
  defaultAction: 'details',
  defaultAcquire: 'none',
  libraryCode: '',
  libraryName: '',
}

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }
  } catch {
    return { ...DEFAULTS }
  }
}

export default function useSettings() {
  const [settings, setSettings] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings.theme])

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  return { settings, updateSetting }
}
