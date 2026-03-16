/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, createContext, useContext } from 'react'

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(challenges))
  }, [challenges])

  const addChallenge = useCallback((challenge) => {
    const goal = challenge.goal || 10
    setChallenges((prev) => [
      ...prev,
      {
        ...challenge,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        participants: [
          { name: 'Alice', handle: 'alice.bsky.social', progress: Math.floor(Math.random() * goal) },
          { name: 'Bob', handle: 'bob.bsky.social', progress: Math.floor(Math.random() * goal) },
        ],
      },
    ])
  }, [])

  const removeChallenge = useCallback((id) => {
    setChallenges((prev) => prev.filter((c) => c.id !== id))
  }, [])

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
