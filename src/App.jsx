import { useState, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import BookDetail from './components/BookDetail'
import Shelves from './pages/Shelves'
import Search from './pages/Search'
import Social from './pages/Social'
import ForYou from './pages/ForYou'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'
import useBooks from './hooks/useBooks'
import useCriteria from './hooks/useCriteria'
import useSettings from './hooks/useSettings'

function isOnboarded() {
  return localStorage.getItem('shelfwise-onboarded') === 'true'
}

export default function App() {
  const { updateBook, removeBook, importBooks } = useBooks()
  const { criteria } = useCriteria()
  const { settings } = useSettings()
  const [detailBook, setDetailBook] = useState(null)
  const [onboarded, setOnboarded] = useState(isOnboarded)

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

  if (!onboarded) {
    return (
      <Onboarding
        onComplete={() => setOnboarded(true)}
        importBooks={importBooks}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 pb-20" data-1p-ignore>
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-indigo-600 dark:text-indigo-400">Shelf</span>wise
        </h1>
      </header>

      <main className="max-w-5xl mx-auto">
        <Routes>
          <Route
            path="/"
            element={<Shelves onBookClick={openDetail} libraryCode={settings.libraryCode} />}
          />
          <Route path="/search" element={<Search />} />
          <Route path="/social" element={<Social />} />
          <Route path="/for-you" element={<ForYou />} />
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
