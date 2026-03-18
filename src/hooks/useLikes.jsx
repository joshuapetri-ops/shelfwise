/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import useAuth from './useAuth'

const STORAGE_KEY = 'shelfwise-likes'
const LIKE_COLLECTION = 'app.shelfwise.like'
const LikesContext = createContext()

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

/**
 * Likes context provider.
 * Stores likes as a map: { [bookUri]: { rkey, createdAt } }
 * bookUri is constructed as "did|title|author" for matching across sources.
 */
export function LikesProvider({ children }) {
  const [likes, setLikes] = useState(load) // { bookKey: { rkey, uri, createdAt } }
  const auth = useAuth()
  const hasSynced = useRef(false)

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(likes))
  }, [likes])

  // Sync from PDS on auth
  useEffect(() => {
    if (!auth?.isAuthenticated || !auth.agent || !auth.did || hasSynced.current) return
    hasSynced.current = true

    async function sync() {
      try {
        const res = await auth.agent.com.atproto.repo.listRecords({
          repo: auth.did,
          collection: LIKE_COLLECTION,
          limit: 100,
        })
        if (res.data.records.length > 0) {
          const pdsLikes = {}
          for (const r of res.data.records) {
            // Use the subject URI as the key
            const subjectUri = r.value.subject?.uri || ''
            if (subjectUri) {
              pdsLikes[subjectUri] = {
                rkey: r.uri.split('/').pop(),
                uri: r.uri,
                createdAt: r.value.createdAt,
              }
            }
          }
          setLikes((prev) => ({ ...prev, ...pdsLikes }))
        }
      } catch { /* non-fatal */ }
    }
    sync()
  }, [auth])

  /**
   * Like a book. bookKey is a unique identifier for the book.
   * subjectUri is the AT URI of the book record (at://did/collection/rkey).
   * subjectCid is the CID of the record.
   */
  const likeBook = useCallback(async (bookKey, subjectUri, subjectCid) => {
    // Optimistic update
    const createdAt = new Date().toISOString()
    setLikes((prev) => ({
      ...prev,
      [bookKey]: { rkey: null, uri: null, createdAt },
    }))

    // PDS write
    if (auth?.isAuthenticated && auth.agent && auth.did) {
      try {
        const res = await auth.agent.com.atproto.repo.createRecord({
          repo: auth.did,
          collection: LIKE_COLLECTION,
          record: {
            $type: LIKE_COLLECTION,
            subject: {
              uri: subjectUri || bookKey,
              cid: subjectCid || '',
            },
            createdAt,
          },
        })
        setLikes((prev) => ({
          ...prev,
          [bookKey]: { rkey: res.data.uri.split('/').pop(), uri: res.data.uri, createdAt },
        }))
      } catch { /* keep optimistic update */ }
    }
  }, [auth])

  /**
   * Unlike a book.
   */
  const unlikeBook = useCallback(async (bookKey) => {
    const like = likes[bookKey]

    // Optimistic update
    setLikes((prev) => {
      const next = { ...prev }
      delete next[bookKey]
      return next
    })

    // PDS delete
    if (like?.rkey && auth?.isAuthenticated && auth.agent && auth.did) {
      try {
        await auth.agent.com.atproto.repo.deleteRecord({
          repo: auth.did,
          collection: LIKE_COLLECTION,
          rkey: like.rkey,
        })
      } catch { /* keep optimistic update */ }
    }
  }, [auth, likes])

  /**
   * Check if a book is liked.
   */
  const isLiked = useCallback((bookKey) => !!likes[bookKey], [likes])

  return (
    <LikesContext.Provider value={{ likes, likeBook, unlikeBook, isLiked }}>
      {children}
    </LikesContext.Provider>
  )
}

export default function useLikes() {
  return useContext(LikesContext)
}
