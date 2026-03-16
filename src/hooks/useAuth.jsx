/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getOAuthClient, createAgent } from '../lib/atproto'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [agent, setAgent] = useState(null)
  const [did, setDid] = useState(null)
  const [handle, setHandle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // On mount: check for existing session or complete OAuth callback
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const client = await getOAuthClient()
        const result = await client.init()

        if (!cancelled && result?.session) {
          const sess = result.session
          setSession(sess)
          setDid(sess.did)
          setAgent(await createAgent(sess))

          // Resolve handle from DID if the session doesn't include it
          let resolvedHandle = sess.handle
          if (!resolvedHandle || resolvedHandle === sess.did) {
            try {
              const res = await fetch(
                `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(sess.did)}`
              )
              if (!res.ok) {
                // Try reverse: resolve DID to handle via plc directory
                const plcRes = await fetch(`https://plc.directory/${sess.did}`)
                if (plcRes.ok) {
                  const plcData = await plcRes.json()
                  resolvedHandle = plcData.alsoKnownAs?.[0]?.replace('at://', '') || sess.did
                }
              } else {
                const data = await res.json()
                resolvedHandle = data.handle || sess.did
              }
            } catch {
              resolvedHandle = sess.did
            }
          }
          setHandle(resolvedHandle)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('OAuth init error:', err)
          setError(err.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  // Start the OAuth sign-in flow (redirects the browser)
  const signIn = useCallback(async (userHandle) => {
    setError(null)
    try {
      const client = await getOAuthClient()
      await client.signIn(userHandle.replace(/^@/, '').trim(), {
        scope: 'atproto transition:generic',
      })
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  // Sign out — clear session and reload
  const signOut = useCallback(async () => {
    try {
      if (session?.revoke) {
        await session.revoke()
      }
    } catch {
      // Revocation failure is non-fatal
    }
    setSession(null)
    setAgent(null)
    setDid(null)
    setHandle(null)
    try {
      const client = await getOAuthClient()
      if (client.dispose) await client.dispose()
    } catch { /* ignore */ }
    window.location.reload()
  }, [session])

  const isAuthenticated = !!session && !!agent

  return (
    <AuthContext.Provider value={{
      session,
      agent,
      did,
      handle,
      loading,
      error,
      isAuthenticated,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export default function useAuth() {
  return useContext(AuthContext)
}
