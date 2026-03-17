import { useState, useMemo, useEffect } from 'react'
import { Target, ChevronDown, ChevronUp, CheckCircle, Trash2, Copy, Plus } from 'lucide-react'
import useBooks from '../hooks/useBooks'
import useChallenges from '../hooks/useChallenges'
import useToast from '../components/Toast'
import BookCover from '../components/ui/BookCover'
import Button from '../components/ui/Button'

function encodeChallenge(challenge) {
  return btoa(JSON.stringify({
    title: challenge.title,
    goal: challenge.goal,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
  }))
}

function decodeChallenge(code) {
  try {
    return JSON.parse(atob(code))
  } catch {
    return null
  }
}

export default function Challenges() {
  const { books } = useBooks()
  const { challenges, addChallenge, removeChallenge, getChallengeProgress } = useChallenges()
  const toastCtx = useToast()
  const addToast = useMemo(() => toastCtx?.addToast || (() => {}), [toastCtx])

  const [celebratedIds] = useState(() => new Set(JSON.parse(localStorage.getItem('shelfwise-celebrated') || '[]')))
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState(10)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [importCode, setImportCode] = useState('')
  const [importError, setImportError] = useState('')

  // Check for newly completed challenges and celebrate
  useEffect(() => {
    for (const c of challenges) {
      const progress = getChallengeProgress(c, books)
      if (progress >= c.goal && !celebratedIds.has(c.id)) {
        celebratedIds.add(c.id)
        localStorage.setItem('shelfwise-celebrated', JSON.stringify([...celebratedIds]))
        addToast(`🎉 You completed "${c.title}"!`, 'success')
      }
    }
  }, [challenges, books, getChallengeProgress, celebratedIds, addToast])

  function handleCreate() {
    if (!title.trim() || !endDate) return
    addChallenge({
      title: title.trim(),
      goal: Number(goal) || 10,
      startDate,
      endDate,
    })
    setTitle('')
    setGoal(10)
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate('')
    setShowForm(false)
    addToast(`Challenge "${title.trim()}" created!`, 'success')
  }

  function handleDelete(id) {
    removeChallenge(id)
    setConfirmDeleteId(null)
  }

  function handleCopy(challenge) {
    const code = encodeChallenge(challenge)
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(challenge.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function handleImport() {
    setImportError('')
    const decoded = decodeChallenge(importCode.trim())
    if (!decoded || !decoded.title || !decoded.goal || !decoded.startDate || !decoded.endDate) {
      setImportError('Invalid challenge code. Please try again.')
      return
    }
    addChallenge(decoded)
    setImportCode('')
  }

  function getDaysRemaining(endDateStr) {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const end = new Date(endDateStr)
    end.setHours(0, 0, 0, 0)
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  }

  function getBooksForChallenge(challenge) {
    return books.filter(
      (b) =>
        b.shelf === 'read' &&
        b.addedAt &&
        b.addedAt >= challenge.startDate &&
        b.addedAt <= challenge.endDate,
    )
  }

  // Build leaderboard with just the user's progress
  const leaderboards = useMemo(() => {
    const map = {}
    for (const c of challenges) {
      const progress = getChallengeProgress(c, books)
      map[c.id] = [{ name: 'You', handle: 'you', progress }]
    }
    return map
  }, [challenges, books, getChallengeProgress])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Target className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Challenges</h1>
      </div>

      {/* Create Challenge toggle */}
      <div className="mb-6">
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          {showForm ? 'Cancel' : 'Create Challenge'}
        </Button>

        {showForm && (
          <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 10 Books in 10 Weeks"
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500"
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Goal (books)</label>
                <input
                  type="number"
                  min="1"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-indigo-500"
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!title.trim() || !endDate}>
              Create
            </Button>
          </div>
        )}
      </div>

      {/* Challenge cards */}
      {challenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No challenges yet. Create one to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {challenges.map((challenge) => {
            const booksRead = getChallengeProgress(challenge, books)
            const pct = Math.min(100, Math.round((booksRead / challenge.goal) * 100))
            const daysLeft = getDaysRemaining(challenge.endDate)
            const completed = booksRead >= challenge.goal
            const isExpanded = expandedId === challenge.id
            const challengeBooks = isExpanded ? getBooksForChallenge(challenge) : []
            const leaderboard = leaderboards[challenge.id] || []
            const participantCount = 1

            return (
              <div
                key={challenge.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm"
              >
                {/* Title + toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : challenge.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {challenge.title}
                  </h3>
                  {isExpanded ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </button>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">
                      {booksRead} / {challenge.goal} books
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full rounded-full transition-all ${completed ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Status row */}
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {participantCount} participant
                  </span>
                  {completed ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle size={16} />
                      Completed!
                    </span>
                  ) : daysLeft === 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Ends today</span>
                  ) : daysLeft > 0 ? (
                    <span className="text-gray-500 dark:text-gray-400">{daysLeft} days left</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">Ended</span>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                    {/* Books that count */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Books counting toward this challenge
                      </h4>
                      {challengeBooks.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500">No books yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {challengeBooks.map((b) => (
                            <div key={b.key} className="flex items-center gap-2">
                              <BookCover coverId={b.coverId} isbn={b.isbn} coverUrl={b.coverUrl} title={b.title} size="S" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{b.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{b.author}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Leaderboard */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Leaderboard
                      </h4>
                      <div className="space-y-1">
                        {leaderboard.map((entry, i) => (
                          <div
                            key={entry.handle}
                            className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm"
                          >
                            <span className={`font-medium ${entry.name === 'You' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              {i + 1}. {entry.name}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {entry.progress} / {challenge.goal}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Share */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Share
                      </h4>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopy(challenge)}
                      >
                        <Copy size={14} />
                        {copiedId === challenge.id ? 'Copied!' : 'Copy challenge code'}
                      </Button>
                    </div>

                    {/* Delete */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      {confirmDeleteId === challenge.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-red-600 dark:text-red-400">Delete this challenge?</span>
                          <Button
                            size="sm"
                            className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                            onClick={() => handleDelete(challenge.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(challenge.id)}
                        >
                          <Trash2 size={14} />
                          Delete challenge
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Import challenge */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Create from template
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Paste a friend&apos;s challenge code to create your own version of their challenge.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={importCode}
            onChange={(e) => { setImportCode(e.target.value); setImportError('') }}
            placeholder="Paste a friend's challenge code"
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500"
          />
          <Button onClick={handleImport} disabled={!importCode.trim()}>
            Create Challenge
          </Button>
        </div>
        {importError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{importError}</p>
        )}
      </div>
    </div>
  )
}
