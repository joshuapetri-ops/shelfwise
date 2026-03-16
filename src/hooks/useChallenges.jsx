/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import useAuth from './useAuth'
import { writeChallenge, deleteChallenge as pdsDeleteChallenge } from '../lib/pdsSync'

const STORAGE_KEY = 'shelfwise-challenges'
const ChallengesContext = createContext()

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

export function ChallengesProvider({ children }) {
  const [challenges, setChallenges] = useState(load)
  const auth = useAuth()
  const hasSynced = useRef(false)

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(challenges))
  }, [challenges])

  // Sync from PDS on auth (challenges are listed from the user's repo)
  useEffect(() => {
    if (!auth?.isAuthenticated || !auth.agent || !auth.did || hasSynced.current) return
    hasSynced.current = true

    async function sync() {
      try {
        const res = await auth.agent.com.atproto.repo.listRecords({
          repo: auth.did,
          collection: 'app.shelfwise.challenge',
          limit: 100,
        })
        if (res.data.records.length > 0) {
          const pdsChallenges = res.data.records.map((r) => ({
            id: r.uri.split('/').pop(),
            rkey: r.uri.split('/').pop(),
            title: r.value.title,
            goal: r.value.goal,
            startDate: r.value.startDate,
            endDate: r.value.endDate,
            createdAt: r.value.createdAt,
            participants: [
              { name: 'Alice', handle: 'alice.bsky.social', progress: Math.floor(Math.random() * r.value.goal) },
              { name: 'Bob', handle: 'bob.bsky.social', progress: Math.floor(Math.random() * r.value.goal) },
            ],
          }))
          setChallenges(pdsChallenges)
        }
      } catch { /* non-fatal */ }
    }
    sync()
  }, [auth])

  const addChallenge = useCallback((challenge) => {
    const goal = challenge.goal || 10
    const id = crypto.randomUUID()
    const full = {
      ...challenge,
      id,
      rkey: id,
      createdAt: new Date().toISOString(),
      participants: [
        { name: 'Alice', handle: 'alice.bsky.social', progress: Math.floor(Math.random() * goal) },
        { name: 'Bob', handle: 'bob.bsky.social', progress: Math.floor(Math.random() * goal) },
      ],
    }
    setChallenges((prev) => [...prev, full])

    // PDS dual-write
    if (auth?.isAuthenticated && auth.agent && auth.did) {
      writeChallenge(auth.agent, auth.did, { ...full, rkey: id }).catch(() => {})
    }
  }, [auth])

  const removeChallenge = useCallback((id) => {
    setChallenges((prev) => prev.filter((c) => c.id !== id))

    // PDS dual-write
    if (auth?.isAuthenticated && auth.agent && auth.did) {
      pdsDeleteChallenge(auth.agent, auth.did, id).catch(() => {})
    }
  }, [auth])

  const getChallengeProgress = useCallback((challenge, books) => {
    return books.filter(
      (b) =>
        b.shelf === 'read' &&
        b.addedAt &&
        b.addedAt >= challenge.startDate &&
        b.addedAt <= challenge.endDate,
    ).length
  }, [])

  return (
    <ChallengesContext.Provider value={{ challenges, addChallenge, removeChallenge, getChallengeProgress }}>
      {children}
    </ChallengesContext.Provider>
  )
}

export default function useChallenges() {
  return useContext(ChallengesContext)
}
