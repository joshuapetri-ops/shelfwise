/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import useAuth from './useAuth'

const FOLLOW_COLLECTION = 'app.shelfwise.follow'
const STORAGE_KEY = 'shelfwise-follows'
const FollowContext = createContext()

function loadFollows() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

/**
 * Shelfwise-specific follow system.
 * Separate from Bluesky follows — following someone on Shelfwise
 * does NOT follow them on Bluesky.
 */
export function FollowProvider({ children }) {
  const [follows, setFollows] = useState(loadFollows) // [{ did, handle, displayName, avatar, rkey }]
  const [loadingDids, setLoadingDids] = useState(new Set())
  const auth = useAuth()
  const hasSynced = useRef(false)

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(follows))
  }, [follows])

  // Sync from PDS on auth
  useEffect(() => {
    if (!auth?.isAuthenticated || !auth.agent || !auth.did || hasSynced.current) return
    hasSynced.current = true

    async function sync() {
      try {
        const res = await auth.agent.com.atproto.repo.listRecords({
          repo: auth.did,
          collection: FOLLOW_COLLECTION,
          limit: 100,
        })

        // Get all follow records, then resolve profiles
        const records = res.data.records || []
        if (records.length === 0) return

        const pdsFollows = []
        // Batch resolve profiles
        for (const r of records) {
          const subjectDid = r.value.subject
          const rkey = r.uri.split('/').pop()
          try {
            const profileRes = await fetch(
              `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(subjectDid)}`
            )
            if (profileRes.ok) {
              const p = await profileRes.json()
              pdsFollows.push({
                did: subjectDid,
                handle: p.handle,
                displayName: p.displayName || p.handle,
                avatar: p.avatar || null,
                rkey,
              })
            }
          } catch { /* skip unresolvable */ }
        }

        setFollows(pdsFollows)
      } catch { /* non-fatal */ }
    }
    sync()
  }, [auth])

  const isFollowing = useCallback(
    (targetDid) => follows.some((f) => f.did === targetDid),
    [follows],
  )

  const isLoading = useCallback(
    (targetDid) => loadingDids.has(targetDid),
    [loadingDids],
  )

  const follow = useCallback(async (targetDid, profile) => {
    if (!auth?.isAuthenticated || !auth.agent || !auth.did || !targetDid) return false
    if (follows.some((f) => f.did === targetDid)) return true // already following

    setLoadingDids((prev) => new Set([...prev, targetDid]))

    const followData = {
      did: targetDid,
      handle: profile?.handle || targetDid,
      displayName: profile?.displayName || profile?.handle || targetDid,
      avatar: profile?.avatar || null,
      rkey: null,
    }

    // Optimistic update
    setFollows((prev) => [...prev, followData])

    try {
      const res = await auth.agent.com.atproto.repo.createRecord({
        repo: auth.did,
        collection: FOLLOW_COLLECTION,
        record: {
          $type: FOLLOW_COLLECTION,
          subject: targetDid,
          createdAt: new Date().toISOString(),
        },
      })
      const rkey = res.data.uri.split('/').pop()
      setFollows((prev) =>
        prev.map((f) => f.did === targetDid ? { ...f, rkey } : f)
      )
      return true
    } catch {
      // Revert optimistic update
      setFollows((prev) => prev.filter((f) => f.did !== targetDid))
      return false
    } finally {
      setLoadingDids((prev) => {
        const next = new Set(prev)
        next.delete(targetDid)
        return next
      })
    }
  }, [auth, follows])

  const unfollow = useCallback(async (targetDid) => {
    if (!auth?.isAuthenticated || !auth.agent || !auth.did) return false

    const existing = follows.find((f) => f.did === targetDid)
    if (!existing) return false

    setLoadingDids((prev) => new Set([...prev, targetDid]))

    // Optimistic update
    setFollows((prev) => prev.filter((f) => f.did !== targetDid))

    try {
      if (existing.rkey) {
        await auth.agent.com.atproto.repo.deleteRecord({
          repo: auth.did,
          collection: FOLLOW_COLLECTION,
          rkey: existing.rkey,
        })
      }
      return true
    } catch {
      // Revert
      setFollows((prev) => [...prev, existing])
      return false
    } finally {
      setLoadingDids((prev) => {
        const next = new Set(prev)
        next.delete(targetDid)
        return next
      })
    }
  }, [auth, follows])

  return (
    <FollowContext.Provider value={{ follows, follow, unfollow, isFollowing, isLoading }}>
      {children}
    </FollowContext.Provider>
  )
}

export default function useFollow() {
  return useContext(FollowContext)
}
