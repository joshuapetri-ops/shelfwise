/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Agent } from '@atproto/api'
import { getOAuthClient } from '../lib/atproto'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)      // OAuthSession
  const [agent, setAgent] = useState(null)           // AT Proto Agent
  const [did, setDid] = useState(null)               // user's DID
  const [handle, setHandle] = useState(null)         // user's handle
  const [loading, setLoading] = useState(true)       // true while checking for existing session
  const [error, setError] = useState(null)

  // On mount: check for existing session or complete OAuth callback
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const client = getOAuthClient()
        const result = await client.init()

        if (!cancelled && result?.session) {
          const sess = result.session
          setSession(sess)
          setDid(sess.did)
          setHandle(sess.handle ?? sess.did)
          setAgent(new Agent(sess))
        }
      } catch (err) {
        if (!cancelled) {
          // If init fails, it's not fatal — user just isn't logged in
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
      const client = getOAuthClient()
      await client.signIn(userHandle.replace(/^@/, '').trim(), {
        scope: 'atproto transition:generic',
      })
      // Browser will redirect; this line won't execute
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
    // Clear the OAuth client's IndexedDB state
    const client = getOAuthClient()
    if (client.dispose) await client.dispose()
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
