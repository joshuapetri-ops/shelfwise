import { useState, useCallback } from 'react'
import useAuth from './useAuth'

/**
 * Hook for following/unfollowing AT Protocol users.
 * Returns { follow, unfollow, isFollowLoading } plus a helper
 * to check follow state from a profile's viewer object.
 */
export default function useFollow() {
  const { agent, did, isAuthenticated } = useAuth()
  const [loadingDids, setLoadingDids] = useState(new Set())

  const isLoading = useCallback((targetDid) => loadingDids.has(targetDid), [loadingDids])

  const follow = useCallback(async (targetDid) => {
    if (!isAuthenticated || !agent || !did || !targetDid) return null

    setLoadingDids((prev) => new Set([...prev, targetDid]))
    try {
      const res = await agent.com.atproto.repo.createRecord({
        repo: did,
        collection: 'app.bsky.graph.follow',
        record: {
          $type: 'app.bsky.graph.follow',
          subject: targetDid,
          createdAt: new Date().toISOString(),
        },
      })
      return res.data.uri // the follow record URI, needed for unfollow
    } catch {
      return null
    } finally {
      setLoadingDids((prev) => {
        const next = new Set(prev)
        next.delete(targetDid)
        return next
      })
    }
  }, [agent, did, isAuthenticated])

  const unfollow = useCallback(async (followUri) => {
    if (!isAuthenticated || !agent || !did || !followUri) return false

    // Extract rkey from the follow URI: at://did:plc:.../app.bsky.graph.follow/rkey
    const parts = followUri.split('/')
    const rkey = parts[parts.length - 1]

    setLoadingDids((prev) => new Set([...prev, followUri]))
    try {
      await agent.com.atproto.repo.deleteRecord({
        repo: did,
        collection: 'app.bsky.graph.follow',
        rkey,
      })
      return true
    } catch {
      return false
    } finally {
      setLoadingDids((prev) => {
        const next = new Set(prev)
        next.delete(followUri)
        return next
      })
    }
  }, [agent, did, isAuthenticated])

  return { follow, unfollow, isLoading, isAuthenticated }
}
