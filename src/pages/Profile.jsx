import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Avatar from '../components/ui/Avatar'
import BookCover from '../components/ui/BookCover'
import Pill from '../components/ui/Pill'
import Button from '../components/ui/Button'
import useBooks from '../hooks/useBooks'
import useAuth from '../hooks/useAuth'
import { ArrowLeft, BookOpen, Loader2, Share2 } from 'lucide-react'

const SHELF_LABELS = {
  wantToRead: 'Want to Read',
  reading: 'Reading',
  read: 'Read',
  dnf: "Couldn't Finish",
}

const SHELF_COLORS = {
  wantToRead: 'indigo',
  reading: 'amber',
  read: 'green',
  dnf: 'red',
}

const SHELF_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'reading', label: 'Reading' },
  { key: 'read', label: 'Read' },
  { key: 'wantToRead', label: 'Want to Read' },
]

export default function Profile() {
  const { handle } = useParams()
  const { did: myDid } = useAuth()
  const { addBook, books: myBooks } = useBooks()
  const [profile, setProfile] = useState(null)
  const [userBooks, setUserBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    if (!handle) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        // Fetch profile
        const profileRes = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`
        )
        if (!profileRes.ok) throw new Error('User not found')
        const profileData = await profileRes.json()

        if (cancelled) return
        setProfile({
          did: profileData.did,
          handle: profileData.handle,
          displayName: profileData.displayName || profileData.handle,
          avatar: profileData.avatar || null,
          description: profileData.description || '',
          followersCount: profileData.followersCount || 0,
          followsCount: profileData.followsCount || 0,
        })

        // Fetch their shelfwise books
        try {
          const booksRes = await fetch(
            `https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(profileData.did)}&collection=app.shelfwise.book&limit=100`
          )
          if (booksRes.ok) {
            const booksData = await booksRes.json()
            if (!cancelled) {
              setUserBooks((booksData.records || []).map((r) => ({
                key: r.value.openLibraryKey || r.uri,
                title: r.value.title || 'Unknown',
                author: r.value.author || '',
                isbn: r.value.isbn || null,
                coverId: r.value.coverId || null,
                shelf: r.value.shelf || '',
                notes: r.value.notes || '',
                ratings: r.value.ratings ? (typeof r.value.ratings === 'string' ? JSON.parse(r.value.ratings) : r.value.ratings) : {},
                addedAt: r.value.createdAt,
              })))
            }
          }
        } catch {
          // No shelfwise books — that's fine
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [handle])

  const filteredBooks = activeFilter === 'all'
    ? userBooks
    : userBooks.filter((b) => b.shelf === activeFilter)

  const shelfCounts = { all: userBooks.length, reading: 0, read: 0, wantToRead: 0 }
  for (const b of userBooks) {
    if (shelfCounts[b.shelf] !== undefined) shelfCounts[b.shelf]++
  }

  const findInMyLibrary = (book) =>
    myBooks.find(
      (b) =>
        b.title?.toLowerCase() === book.title?.toLowerCase() &&
        b.author?.toLowerCase() === book.author?.toLowerCase(),
    )

  const isMe = profile?.did === myDid

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error || 'User not found'}</p>
        <Link to="/social" className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline">
          Back to Social
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        to="/social"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      {/* Profile header */}
      <div className="flex items-start gap-4 mb-8">
        <Avatar name={profile.displayName} src={profile.avatar} size="lg" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {profile.displayName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            @{profile.handle}
          </p>
          {profile.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-3">
              {profile.description}
            </p>
          )}
          <div className="flex gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span><strong className="text-gray-700 dark:text-gray-300">{profile.followersCount}</strong> followers</span>
            <span><strong className="text-gray-700 dark:text-gray-300">{profile.followsCount}</strong> following</span>
            <span><strong className="text-gray-700 dark:text-gray-300">{userBooks.length}</strong> books</span>
          </div>
        </div>
      </div>

      {/* Shelf filters */}
      {userBooks.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {SHELF_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`rounded-full px-3.5 py-1 text-sm font-medium transition-colors ${
                activeFilter === f.key
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {f.label} ({shelfCounts[f.key] ?? 0})
            </button>
          ))}
        </div>
      )}

      {/* Books */}
      {userBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {isMe ? "You haven't added any books yet." : `@${profile.handle} hasn't added any books to Shelfwise yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBooks.map((book) => {
            const inMyLibrary = !isMe && findInMyLibrary(book)
            return (
              <div
                key={book.key}
                className="flex items-start gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm"
              >
                <BookCover coverId={book.coverId} isbn={book.isbn} title={book.title} size="S" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                    {book.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{book.author}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {book.shelf && (
                      <Pill color={SHELF_COLORS[book.shelf] ?? 'gray'}>
                        {SHELF_LABELS[book.shelf] ?? book.shelf}
                      </Pill>
                    )}
                    {book.ratings?.overall && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        {'★'.repeat(book.ratings.overall)}{'☆'.repeat(Math.max(0, 5 - book.ratings.overall))}
                      </span>
                    )}
                  </div>
                  {!isMe && !inMyLibrary && (
                    <button
                      onClick={() => addBook({ ...book, shelf: 'wantToRead' })}
                      className="mt-2 px-3 py-2 text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors min-h-[44px] flex items-center"
                    >
                      + Want to Read
                    </button>
                  )}
                  {!isMe && inMyLibrary && (
                    <Pill color={SHELF_COLORS[inMyLibrary.shelf] ?? 'gray'}>
                      On your shelf: {SHELF_LABELS[inMyLibrary.shelf] ?? inMyLibrary.shelf}
                    </Pill>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
