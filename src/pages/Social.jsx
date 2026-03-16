import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/ui/Avatar'
import BookCover from '../components/ui/BookCover'
import Pill from '../components/ui/Pill'
import Button from '../components/ui/Button'
import useBooks from '../hooks/useBooks'
import useAuth from '../hooks/useAuth'
import useSocialFeed from '../hooks/useSocialFeed'
import { Users, BookOpen, Loader2, Wifi, Search } from 'lucide-react'

const FILTERS = [
  { label: 'All', match: null },
  { label: 'Reading', match: 'started reading' },
  { label: 'Finished', match: 'finished' },
  { label: 'Want to Read', match: 'wants to read' },
]

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

export default function Social() {
  const { books, addBook } = useBooks()
  const { isAuthenticated } = useAuth()
  const { events: liveEvents, loading: feedLoading, isLive } = useSocialFeed()
  const [activeFilter, setActiveFilter] = useState('All')
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState([])
  const [searching, setSearching] = useState(false)

  const handleUserSearch = async () => {
    if (!userSearch.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(userSearch)}&limit=8`
      )
      const data = await res.json()
      setUserResults((data.actors || []).map((a) => ({
        did: a.did,
        handle: a.handle,
        displayName: a.displayName || a.handle,
        avatar: a.avatar || null,
        description: a.description || '',
      })))
    } catch {
      setUserResults([])
    } finally {
      setSearching(false)
    }
  }

  // Use live feed when authenticated
  const activity = isLive ? liveEvents : []

  const filtered =
    activeFilter === 'All'
      ? activity
      : activity.filter(
          (a) => a.action === FILTERS.find((f) => f.label === activeFilter)?.match,
        )

  const findInLibrary = (book) =>
    books.find(
      (b) =>
        b.title?.toLowerCase() === book.title?.toLowerCase() &&
        b.author?.toLowerCase() === book.author?.toLowerCase(),
    )

  const handleAddBook = (book) => {
    addBook({
      key: `social-${book.title}-${book.author}-${crypto.randomUUID()}`,
      title: book.title,
      author: book.author,
      coverId: book.coverId,
      shelf: 'wantToRead',
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Social</h1>
        {isLive && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <Wifi size={10} />
            Live
          </span>
        )}
        {feedLoading && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>

      {/* User search */}
      {isAuthenticated && (
        <div className="mb-6">
          <form onSubmit={(e) => { e.preventDefault(); handleUserSearch(); }} className="flex gap-2 mb-3">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Find readers by name or handle..."
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
            />
            <Button size="sm" type="submit" disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </form>

          {userResults.length > 0 && (
            <ul className="space-y-2 mb-4">
              {userResults.map((user) => (
                <li key={user.did}>
                  <Link
                    to={`/profile/${user.handle}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                  >
                    <Avatar name={user.displayName} src={user.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user.displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.handle}</p>
                      {user.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{user.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 shrink-0">View books</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setActiveFilter(f.label)}
            className={`rounded-full px-3.5 py-1 text-sm font-medium transition-colors ${
              activeFilter === f.label
                ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Not authenticated prompt */}
      {!isAuthenticated && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Sign in to see what your friends are reading.
          </p>
        </div>
      )}

      {/* Authenticated empty state */}
      {isAuthenticated && !feedLoading && activity.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            No activity yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            Share Shelfwise with friends so you can see what they are reading!
          </p>
        </div>
      )}

      {/* Activity feed */}
      <div className="space-y-4">
        {isAuthenticated && activity.length > 0 && filtered.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">
            No activity to show for this filter.
          </p>
        )}

        {filtered.map((item, idx) => {
          const existing = findInLibrary(item.book)

          return (
            <div
              key={idx}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm"
            >
              {/* User row */}
              <div className="flex items-center gap-3 mb-3">
                <Link to={`/profile/${item.user.handle}`}>
                  <Avatar name={item.user.name} src={item.user.avatar} size="sm" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/profile/${item.user.handle}`} className="hover:underline">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {item.user.name}
                    </p>
                  </Link>
                  <Link to={`/profile/${item.user.handle}`} className="hover:underline">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{item.user.handle}
                    </p>
                  </Link>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  {item.timestamp}
                </span>
              </div>

              {/* Action text */}
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                <span className="font-medium">{item.user.name.split(' ')[0]}</span>{' '}
                {item.action}
              </p>

              {/* Book info */}
              <div className="flex items-start gap-3">
                <BookCover
                  coverId={item.book.coverId}
                  title={item.book.title}
                  size="S"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                    {item.book.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.book.author}
                  </p>

                  <div className="mt-2">
                    {existing ? (
                      <Pill color={SHELF_COLORS[existing.shelf] ?? 'gray'}>
                        {SHELF_LABELS[existing.shelf] ?? existing.shelf}
                      </Pill>
                    ) : (
                      <button
                        onClick={() => handleAddBook(item.book)}
                        className="px-3 py-2.5 text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors min-h-[44px] flex items-center"
                      >
                        + Want to Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
