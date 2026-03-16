import { useState } from 'react'
import Avatar from '../components/ui/Avatar'
import BookCover from '../components/ui/BookCover'
import Pill from '../components/ui/Pill'
import { mockActivity } from '../lib/mockData'
import useBooks from '../hooks/useBooks'
import useSocialFeed from '../hooks/useSocialFeed'
import { Users, BookOpen, Loader2, Wifi } from 'lucide-react'

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
  const { events: liveEvents, loading: feedLoading, isLive } = useSocialFeed()
  const [activeFilter, setActiveFilter] = useState('All')

  // Use live feed when available, fall back to mock data
  const activity = isLive && liveEvents.length > 0 ? liveEvents : mockActivity

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

      {/* Activity feed */}
      <div className="space-y-4">
        {filtered.length === 0 && (
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
                <Avatar name={item.user.name} src={item.user.avatar} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {item.user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{item.user.handle}
                  </p>
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
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAddBook(item.book)
                        }}
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
