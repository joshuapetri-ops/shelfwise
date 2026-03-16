import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

/**
 * OAuth callback page. The BrowserOAuthClient.init() in useAuth
 * handles the actual token exchange. This page just waits for
 * auth to finish loading, then redirects to home.
 */
export default function OAuthCallback() {
  const { loading, isAuthenticated, error } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // Auth succeeded — mark onboarded and go home
        localStorage.setItem('shelfwise-onboarded', 'true')
        navigate('/', { replace: true })
      } else if (error) {
        // Auth failed — go back to onboarding
        navigate('/', { replace: true })
      }
    }
  }, [loading, isAuthenticated, error, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {error ? 'Authentication failed. Redirecting...' : 'Completing sign in...'}
        </p>
      </div>
    </div>
  )
}
