import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/ui/Avatar'
import BookCover from '../components/ui/BookCover'
import Pill from '../components/ui/Pill'
import useToast from '../components/Toast'
import Button from '../components/ui/Button'
import useBooks from '../hooks/useBooks'
import useAuth from '../hooks/useAuth'
import useFollow from '../hooks/useFollow'
import useSocialFeed from '../hooks/useSocialFeed'
import useLikes from '../hooks/useLikes'
import { Users, BookOpen, Loader2, Search, UserPlus, UserCheck, Rss, Compass, Share2, Send, Heart, MessageCircle } from 'lucide-react'

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

const SOCIAL_TABS = [
  { key: 'feed', label: 'Feed', icon: Rss },
  { key: 'discover', label: 'Discover', icon: Compass },
  { key: 'following', label: 'Following', icon: Users },
]

export default function Social() {
  const { books, addBook } = useBooks()
  const { isAuthenticated, did, agent } = useAuth()
  const { events: liveEvents, loading: feedLoading, isLive } = useSocialFeed()
  const toast = useToast()
  const addToast = toast?.addToast || (() => {})
  const { likeBook, unlikeBook, isLiked } = useLikes()
  const [activeTab, setActiveTab] = useState('feed')
  const [activeFilter, setActiveFilter] = useState('All')
  const { follow, isLoading: isFollowLoading } = useFollow()
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [followedDids, setFollowedDids] = useState(new Set())
  const [myFollows, setMyFollows] = useState([])
  const [followsLoading, setFollowsLoading] = useState(false)
  const [recommendBook, setRecommendBook] = useState(null) // book being recommended
  const [recommendHandle, setRecommendHandle] = useState('')

  // Load people I follow
  useEffect(() => {
    if (!isAuthenticated || !did) return
    let cancelled = false

    async function loadFollows() {
      setFollowsLoading(true)
      try {
        const data = agent
          ? (await agent.app.bsky.graph.getFollows({ actor: did, limit: 50 })).data
          : await (await fetch(`https://public.api.bsky.app/xrpc/app.bsky.graph.getFollows?actor=${encodeURIComponent(did)}&limit=50`)).json()

        if (!cancelled) {
          setMyFollows((data.follows || []).map((f) => ({
            did: f.did,
            handle: f.handle,
            displayName: f.displayName || f.handle,
            avatar: f.avatar || null,
            description: f.description || '',
          })))
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setFollowsLoading(false) }
    }
    loadFollows()
    return () => { cancelled = true }
  }, [isAuthenticated, did, agent])

  // Autocomplete search — debounced
  useEffect(() => {
    if (!userSearch.trim() || userSearch.trim().length < 2) {
      setUserResults([])
      return
    }
    const timer = setTimeout(async () => {
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
          isFollowing: !!a.viewer?.following,
        })))
      } catch {
        setUserResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [userSearch])

  // Feed data
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
        b.title?.toLowerCase() === book?.title?.toLowerCase() &&
        b.author?.toLowerCase() === book?.author?.toLowerCase(),
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

  const handleShare = (book) => {
    const text = `"${book.title}" by ${book.author} 📖\nhttps://www.shelfwise.xyz`
    window.open(
      'https://bsky.app/intent/compose?text=' + encodeURIComponent(text),
      '_blank'
    )
  }

  const handleRecommend = (book, handle) => {
    const mention = handle.startsWith('@') ? handle : `@${handle}`
    const text = `${mention} you should check out "${book.title || 'this book'}" by ${book.author || 'Unknown'} 📖\nhttps://www.shelfwise.xyz`
    window.open(
      'https://bsky.app/intent/compose?text=' + encodeURIComponent(text),
      '_blank'
    )
    setRecommendBook(null)
    setRecommendHandle('')
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Social</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Sign in to see what your friends are reading.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Social</h1>
        {feedLoading && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {SOCIAL_TABS.map(({ key, label, icon: Icon }) => ( // eslint-disable-line no-unused-vars
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ═══════ FEED TAB ═══════ */}
      {activeTab === 'feed' && (
        <div>
          {/* Activity filter pills */}
          {activity.length > 0 && (
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
          )}

          {/* Empty feed */}
          {!feedLoading && activity.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Rss className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                Your feed is building...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                Add books to your shelves and follow readers to see activity here.
              </p>
              <div className="flex gap-3">
                <Link
                  to="/search"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Search Books
                </Link>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Find Readers
                </button>
              </div>
            </div>
          )}

          {/* Filtered empty */}
          {activity.length > 0 && filtered.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-12">
              No activity for this filter.
            </p>
          )}

          {/* Feed cards */}
          <div className="space-y-4">
            {filtered.map((item, idx) => {
              const existing = findInLibrary(item.book)
              return (
                <div
                  key={`${item.user?.handle}-${item.book?.title}-${idx}`}
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
                    <span className="font-medium">{(item.user.name || '').split(' ')[0]}</span>{' '}
                    {item.action}
                    {item.book?.ratings?.overall > 0 && (
                      <span className="ml-2 text-amber-500">
                        {'★'.repeat(item.book.ratings.overall)}{'☆'.repeat(Math.max(0, 5 - item.book.ratings.overall))}
                      </span>
                    )}
                  </p>

                  {/* Book info */}
                  {item.book && (
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
                        {/* Shelf status */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {existing ? (
                            <Pill color={SHELF_COLORS[existing.shelf] ?? 'gray'}>
                              {SHELF_LABELS[existing.shelf] ?? existing.shelf}
                            </Pill>
                          ) : (
                            <button
                              onClick={() => handleAddBook(item.book)}
                              className="px-3 py-2 text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors min-h-[44px] flex items-center"
                            >
                              + Want to Read
                            </button>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="mt-3 flex items-center gap-1 border-t border-gray-100 dark:border-gray-800 pt-2">
                          {/* Like */}
                          {(() => {
                            const bookKey = `${(item.book.title || '').toLowerCase()}|${(item.book.author || '').toLowerCase()}`
                            const liked = isLiked(bookKey)
                            return (
                              <button
                                onClick={() => liked ? unlikeBook(bookKey) : likeBook(bookKey)}
                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                  liked
                                    ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                              >
                                <Heart size={14} className={liked ? 'fill-current' : ''} />
                                {liked ? 'Liked' : 'Like'}
                              </button>
                            )
                          })()}
                          {/* Reply on Bluesky */}
                          <button
                            onClick={() => {
                              const text = `Re: "${item.book.title || 'this book'}" by ${item.book.author || 'Unknown'} — `
                              window.open(
                                'https://bsky.app/intent/compose?text=' + encodeURIComponent(text),
                                '_blank'
                              )
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                            title="Reply on Bluesky"
                          >
                            <MessageCircle size={13} />
                            Reply
                          </button>
                          {/* Share */}
                          <button
                            onClick={() => handleShare(item.book)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                            title="Share on Bluesky"
                          >
                            <Share2 size={13} />
                            Share
                          </button>
                          {/* Recommend */}
                          <button
                            onClick={() => setRecommendBook(
                              recommendBook?.title === item.book.title && recommendBook?.author === item.book.author ? null : item.book
                            )}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                            title="Recommend to a friend"
                          >
                            <Send size={13} />
                            Recommend
                          </button>
                        </div>

                        {/* Recommend inline form */}
                        {recommendBook?.title === item.book.title && recommendBook?.author === item.book.author && (
                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              value={recommendHandle}
                              onChange={(e) => setRecommendHandle(e.target.value)}
                              placeholder="@friend.bsky.social"
                              autoComplete="off"
                              data-1p-ignore="true"
                              data-lpignore="true"
                              data-form-type="other"
                              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && recommendHandle.trim()) {
                                  handleRecommend(item.book, recommendHandle.trim())
                                }
                                if (e.key === 'Escape') {
                                  setRecommendBook(null)
                                  setRecommendHandle('')
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                if (recommendHandle.trim()) handleRecommend(item.book, recommendHandle.trim())
                              }}
                              disabled={!recommendHandle.trim()}
                            >
                              Send
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══════ DISCOVER TAB ═══════ */}
      {activeTab === 'discover' && (
        <div>
          {/* Search */}
          <div className="relative mb-6">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Find readers by name or handle..."
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-9 pr-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
                />
                {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
              </div>
            </div>
          </div>

          {/* Search results */}
          {userResults.length > 0 && (
            <ul className="space-y-2 mb-6">
              {userResults.map((user) => {
                const alreadyFollowing = user.isFollowing || followedDids.has(user.did) || myFollows.some((f) => f.did === user.did)
                return (
                  <li key={user.did} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <Link to={`/profile/${user.handle}`}>
                      <Avatar name={user.displayName} src={user.avatar} size="sm" />
                    </Link>
                    <Link to={`/profile/${user.handle}`} className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user.displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.handle}</p>
                      {user.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{user.description}</p>
                      )}
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      {alreadyFollowing ? (
                        <Link
                          to={`/profile/${user.handle}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30"
                        >
                          <UserCheck size={14} />
                          Following
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          onClick={async () => {
                            const uri = await follow(user.did)
                            if (uri) {
                              setFollowedDids((prev) => new Set([...prev, user.did]))
                              setMyFollows((prev) => [...prev, user])
                              addToast(`Now following @${user.handle}`, 'success')
                            }
                          }}
                          disabled={isFollowLoading(user.did)}
                        >
                          {isFollowLoading(user.did) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <UserPlus size={14} />
                          )}
                          Follow
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Discovery prompt when not searching */}
          {!userSearch.trim() && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Compass className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                Discover readers
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Search for people you know on Bluesky by name or handle. Follow them to see their reading activity in your feed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════ FOLLOWING TAB ═══════ */}
      {activeTab === 'following' && (
        <div>
          {followsLoading && (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          )}

          {!followsLoading && myFollows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                Not following anyone yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                Find readers to follow and see what they&apos;re reading.
              </p>
              <button
                onClick={() => setActiveTab('discover')}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                <Search size={16} />
                Find Readers
              </button>
            </div>
          )}

          {!followsLoading && myFollows.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                {myFollows.length} following
              </h3>
              <div className="space-y-2">
                {myFollows.map((user) => (
                  <Link
                    key={user.did}
                    to={`/profile/${user.handle}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                  >
                    <Avatar name={user.displayName} src={user.avatar} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user.displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.handle}</p>
                      {user.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{user.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 shrink-0">View</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
