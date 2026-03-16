import { useState } from 'react'
import { getRecommendations } from '../api/claude'
import useBooks from '../hooks/useBooks'
import useSettings from '../hooks/useSettings'
import BookCover from '../components/ui/BookCover'
import Button from '../components/ui/Button'
import { Sparkles, Plus, Loader2 } from 'lucide-react'

export default function ForYou() {
  const { books, addBook } = useBooks()
  const { settings } = useSettings()
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [addedSet, setAddedSet] = useState(new Set())

  const apiKeySet = Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY)

  const handleGetRecommendations = async () => {
    setLoading(true)
    setError(null)
    setAddedSet(new Set())

    try {
      const recs = await getRecommendations(customPrompt || 'Recommend some books for me.', books, settings.language)
      setRecommendations(recs)
    } catch {
      setError('Failed to get recommendations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBook = (rec, index) => {
    addBook({
      key: `rec-${rec.title}-${rec.author}-${crypto.randomUUID()}`,
      title: rec.title,
      author: rec.author,
      shelf: 'wantToRead',
    })
    setAddedSet((prev) => new Set([...prev, index]))
  }

  if (!apiKeySet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Sparkles className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          For You
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          AI-powered recommendations require an Anthropic API key. Add{' '}
          <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
            VITE_ANTHROPIC_API_KEY
          </code>{' '}
          to your{' '}
          <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
            .env.local
          </code>{' '}
          file, then configure it in Settings.
        </p>
        <a
          href="/settings"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          Go to Settings
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          For You
        </h1>
      </div>

      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Get personalized book recommendations based on your library.
      </p>

      {/* Custom prompt input */}
      <form onSubmit={(e) => { e.preventDefault(); handleGetRecommendations() }} className="mb-8">
        <div className="mb-4">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder='e.g. "I want something like Project Hail Mary"'
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
        >
          <Sparkles size={16} />
          {loading ? 'Getting Recommendations...' : 'Get Recommendations'}
        </Button>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analyzing your library...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-8">
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <Button variant="secondary" onClick={handleGetRecommendations}>
            Retry
          </Button>
        </div>
      )}

      {/* Results */}
      {!loading && recommendations.length > 0 && (
        <ul className="space-y-4">
          {recommendations.map((rec, index) => (
            <li
              key={index}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {rec.title}
                  </h3>
                  {rec.author && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      by {rec.author}
                    </p>
                  )}
                  {rec.reason && (
                    <p className="mt-2 text-sm italic text-gray-600 dark:text-gray-300">
                      {rec.reason}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex flex-col gap-1.5">
                  {addedSet.has(index) ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                      Added!
                    </span>
                  ) : (
                    <>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAddBook(rec, index)
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                      >
                        + Want to Read
                      </button>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          addBook({
                            key: `rec-${rec.title}-${rec.author}-${crypto.randomUUID()}`,
                            title: rec.title,
                            author: rec.author,
                            shelf: 'reading',
                          })
                          setAddedSet((prev) => new Set([...prev, index]))
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        + Reading
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
