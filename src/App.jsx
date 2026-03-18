import { useState, useCallback, useEffect } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import NavBar from './components/NavBar'
import NotificationBell from './components/NotificationBell'
import BookDetail from './components/BookDetail'
import Shelves from './pages/Shelves'
import Search from './pages/Search'
import Social from './pages/Social'
import Challenges from './pages/Challenges'
import ForYou from './pages/ForYou'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'
import OAuthCallback from './pages/OAuthCallback'
import Profile from './pages/Profile'
import Stats from './pages/Stats'
import YearInReview from './pages/YearInReview'
import useBooks from './hooks/useBooks'
import useCriteria from './hooks/useCriteria'
import useSettings from './hooks/useSettings'
import useAuth from './hooks/useAuth'

export default function App() {
  const { updateBook, removeBook, importBooks } = useBooks()
  const { criteria } = useCriteria()
  const { settings } = useSettings()
  const { loading: authLoading, isAuthenticated } = useAuth()
  const [detailBook, setDetailBook] = useState(null)
  const [onboarded, setOnboarded] = useState(() => {
    return localStorage.getItem('shelfwise-onboarded') === 'true'
  })

  // Derive: if authenticated, always treat as onboarded
  const effectivelyOnboarded = onboarded || isAuthenticated

  // Persist the onboarded flag when auth confirms it (side effect only, no state change)
  useEffect(() => {
    if (isAuthenticated && !onboarded) {
      localStorage.setItem('shelfwise-onboarded', 'true')
    }
  }, [isAuthenticated, onboarded])

  const openDetail = useCallback((book) => setDetailBook(book), [])
  const closeDetail = useCallback(() => setDetailBook(null), [])

  const handleUpdate = useCallback((key, updates) => {
    updateBook(key, updates)
    setDetailBook((prev) => (prev?.key === key ? { ...prev, ...updates } : prev))
  }, [updateBook])

  const handleRemove = useCallback((key) => {
    removeBook(key)
    setDetailBook(null)
  }, [removeBook])

  // Show loading while auth is initializing (handles OAuth callback)
  if (authLoading) {
    return (
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        } />
      </Routes>
    )
  }

  if (!effectivelyOnboarded) {
    return (
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="*" element={
          <Onboarding
            onComplete={() => setOnboarded(true)}
            importBooks={importBooks}
          />
        } />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100" data-1p-ignore
      style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <Link to="/social" className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
          <span className="text-indigo-600 dark:text-indigo-400">Shelf</span>wise
        </Link>
        <NotificationBell />
      </header>

      <main className="max-w-5xl mx-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/social" replace />} />
          <Route
            path="/shelves"
            element={<Shelves onBookClick={openDetail} libraryCode={settings.libraryCode} />}
          />
          <Route path="/search" element={<Search onBookClick={openDetail} />} />
          <Route path="/social" element={<Social onBookClick={openDetail} />} />
          <Route path="/profile/:handle" element={<Profile />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/for-you" element={<ForYou />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/year-in-review" element={<YearInReview />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/settings" element={<Settings onLogout={() => setOnboarded(false)} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <NavBar />

      {detailBook && (
        <BookDetail
          book={detailBook}
          isOpen={!!detailBook}
          onClose={closeDetail}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          criteria={criteria}
          libraryCode={settings.libraryCode}
        />
      )}
    </div>
  )
}
