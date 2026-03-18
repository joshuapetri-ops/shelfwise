import { useState, useMemo } from 'react';
import Modal from './ui/Modal';
import BookCover from './ui/BookCover';
import Stars from './ui/Stars';
import Slider from './ui/Slider';
import Pill from './ui/Pill';
import Button from './ui/Button';
import { computeComposite, formatComposite, compositeColor, compositeBg } from '../lib/compositeScore';
import { buildAcquireLinks } from '../lib/purchaseLinks';
import useBooks from '../hooks/useBooks';
import useAuth from '../hooks/useAuth';
import useChallenges from '../hooks/useChallenges';
import { deleteBook as pdsDeleteBook, writeBook as pdsWriteBook } from '../lib/pdsSync';
import useToast from './Toast';
import useLikes from '../hooks/useLikes';
import { ExternalLink, Trash2, Plus, Share2, Lock, Send, Heart } from 'lucide-react';

const SHELVES = [
  { key: 'reading', label: 'Reading' },
  { key: 'wantToRead', label: 'Want to Read' },
  { key: 'read', label: 'Read' },
  { key: 'dnf', label: "Couldn't Finish" },
  { key: 'private', label: '🔒 Private' },
];

export default function BookDetail({ book, isOpen, onClose, onUpdate, onRemove, criteria, libraryCode }) {
  const [notes, setNotes] = useState(book.notes ?? '');
  const [newTag, setNewTag] = useState('');
  const [showRecommend, setShowRecommend] = useState(false);
  const [recommendHandle, setRecommendHandle] = useState('');
  const { agent, did, isAuthenticated } = useAuth();
  const toastCtx = useToast();
  const addToast = toastCtx?.addToast || (() => {});
  const likesCtx = useLikes();
  const { likeBook, unlikeBook, isLiked } = likesCtx || {};
  const bookLikeKey = `self|${book.title}|${book.author}`;
  const bookIsLiked = isLiked?.(bookLikeKey) ?? false;
  const { books, addBook } = useBooks();
  const { challenges } = useChallenges();

  const bookExistsInLibrary = books.some((b) => b.key === book.key);

  const matchingChallenge = useMemo(() => {
    if (book.shelf !== 'read' || !book.addedAt) return null;
    const today = new Date().toISOString().split('T')[0];
    return challenges.find(
      (c) => c.endDate >= today && book.addedAt >= c.startDate && book.addedAt <= c.endDate,
    ) ?? null;
  }, [book.shelf, book.addedAt, challenges]);

  /* ── Shelf ── */
  function handleShelfChange(shelfKey) {
    const today = new Date().toISOString().split('T')[0]
    const updates = { shelf: shelfKey }

    // Auto-set dates based on shelf change
    if (shelfKey === 'reading' && !book.startedAt) {
      updates.startedAt = today
    }
    if (shelfKey === 'read' && !book.finishedAt) {
      updates.finishedAt = today
      if (!book.startedAt) updates.startedAt = today
    }

    if (isAuthenticated && agent && did) {
      if (shelfKey === 'private') {
        // Moving to private: delete from PDS (book stays in localStorage only)
        pdsDeleteBook(agent, did, book).catch(() => {})
      } else if (book.shelf === 'private') {
        // Moving FROM private to public shelf: re-sync to PDS
        pdsWriteBook(agent, did, { ...book, ...updates }).catch(() => {})
      }
    }

    if (bookExistsInLibrary) {
      onUpdate(book.key, updates);
    } else {
      addBook({ ...book, ...updates });
      onUpdate(book.key, updates);
    }

    const shelfNames = { reading: 'Reading', read: 'Read', wantToRead: 'Want to Read', dnf: "Couldn't Finish", private: '🔒 Private' }
    addToast(`Moved to ${shelfNames[shelfKey] || shelfKey}`, 'success')
  }

  /* ── Dates ── */
  function handleDateChange(field, value) {
    onUpdate(book.key, { [field]: value || null });
  }

  /* ── Ratings ── */
  function handleRatingChange(criterionId, value) {
    onUpdate(book.key, { ratings: { ...(book.ratings || {}), [criterionId]: value } });
  }

  /* ── Notes ── */
  function handleNotesBlur(e) {
    onUpdate(book.key, { notes: e.target.value });
  }

  /* ── Tags ── */
  function handleRemoveTag(tag) {
    onUpdate(book.key, { tags: (book.tags || []).filter((t) => t !== tag) });
  }

  function handleAddTag() {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    onUpdate(book.key, { tags: [...(book.tags || []), trimmed] });
    setNewTag('');
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }

  /* ── Remove ── */
  function handleRemove() {
    onRemove(book.key);
    onClose();
  }

  /* ── Composite score ── */
  const composite = criteria && criteria.length > 0
    ? computeComposite(book.ratings, criteria)
    : null;

  /* ── Acquire links ── */
  const acquireLinks = buildAcquireLinks(book, libraryCode);

  return (
    <Modal title={book.title} isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6">
        {/* ── Top section: cover + info ── */}
        <div className="flex gap-5">
          <BookCover
            coverId={book.coverId}
            isbn={book.isbn}
            coverUrl={book.coverUrl}
            title={book.title}
            size="L"
          />
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {book.title}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">{book.author}</p>
            {book.year && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{book.year}</p>
            )}
            {book.isbn && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                ISBN {book.isbn}
              </p>
            )}
          </div>
        </div>

        {/* ── Shelf selector ── */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Shelf
          </h3>
          <div className="flex flex-wrap gap-2">
            {SHELVES.map(({ key, label }) => {
              const isActive = book.shelf === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleShelfChange(key)}
                  className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {book.shelf === 'private' && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Private books are only visible to you and are never shared on your profile or activity feed.
            </p>
          )}
          {matchingChallenge && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                Counts toward {matchingChallenge.title}
              </span>
            </div>
          )}
        </div>

        {/* ── Reading dates ── */}
        {(book.shelf === 'reading' || book.shelf === 'read' || book.shelf === 'dnf') && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Reading Dates
            </h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Started</label>
                <input
                  type="date"
                  value={book.startedAt || ''}
                  onChange={(e) => handleDateChange('startedAt', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-400 focus:outline-none"
                />
              </div>
              {(book.shelf === 'read' || book.shelf === 'dnf') && (
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Finished</label>
                  <input
                    type="date"
                    value={book.finishedAt || ''}
                    onChange={(e) => handleDateChange('finishedAt', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Rating criteria ── */}
        {criteria && criteria.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Ratings
            </h3>
            <div className="space-y-3">
              {criteria.map((c) => {
                const value = book.ratings?.[c.id] ?? 0;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-sm text-gray-700 dark:text-gray-300">
                      {c.emoji && <span className="mr-1">{c.emoji}</span>}
                      {c.name}
                    </span>
                    {c.type === 'stars' ? (
                      <Stars
                        value={value}
                        onChange={(v) => handleRatingChange(c.id, v)}
                      />
                    ) : (
                      <Slider
                        value={value}
                        onChange={(v) => handleRatingChange(c.id, v)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Composite score */}
            {composite !== null && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 p-3 dark:border-gray-700">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Composite Score
                  </span>
                  <span className={`text-2xl font-bold ${compositeColor(composite)}`}>
                    {formatComposite(composite)}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full rounded-full transition-all ${composite >= 80 ? 'bg-emerald-500' : composite >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, Math.max(0, composite))}%` }}
                    />
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${compositeColor(composite)} ${compositeBg(composite)}`}>
                    {formatComposite(composite)} / 100
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Get this book ── */}
        {acquireLinks && acquireLinks.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Get this book
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {acquireLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {link.name}
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Notes
          </h3>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add notes about this book..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500"
          />
        </div>

        {/* ── Tags ── */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Tags
          </h3>
          {book.tags && book.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {book.tags.map((tag) => (
                <Pill
                  key={tag}
                  onRemove={() => handleRemoveTag(tag)}
                >
                  {tag}
                </Pill>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="New tag"
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        </div>

        {/* ── Diversity tags ── */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Diversity &amp; Representation
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {[
              { tag: 'diversity:bipoc-author', label: 'BIPOC Author' },
              { tag: 'diversity:translated', label: 'Translated Work' },
              { tag: 'diversity:lgbtq', label: 'LGBTQ+' },
              { tag: 'diversity:own-voices', label: 'Own Voices' },
              { tag: 'diversity:disability-rep', label: 'Disability Rep' },
              { tag: 'diversity:indigenous-author', label: 'Indigenous Author' },
            ].map(({ tag, label }) => {
              const isActive = (book.tags || []).includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => {
                    if (isActive) {
                      onUpdate(book.key, { tags: (book.tags || []).filter((t) => t !== tag) });
                    } else {
                      onUpdate(book.key, { tags: [...(book.tags || []), tag] });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'border border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-purple-600 dark:hover:text-purple-400'
                  }`}
                >
                  {isActive ? '✓ ' : '+ '}{label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Footer: Like + Share + Remove ── */}
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700 flex flex-wrap gap-3">
          <button
            onClick={() => bookIsLiked ? unlikeBook?.(bookLikeKey) : likeBook?.(bookLikeKey)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              bookIsLiked
                ? 'text-red-500 bg-red-50 dark:bg-red-950 dark:text-red-400'
                : 'text-gray-600 bg-gray-100 hover:text-red-500 hover:bg-red-50 dark:text-gray-400 dark:bg-gray-700 dark:hover:text-red-400 dark:hover:bg-red-950'
            }`}
          >
            <Heart size={14} className={bookIsLiked ? 'fill-current' : ''} />
            {bookIsLiked ? 'Liked' : 'Like'}
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const text = book.shelf === 'read'
                ? `Just finished "${book.title}" by ${book.author} on Shelfwise 📖`
                : book.shelf === 'reading'
                  ? `Currently reading "${book.title}" by ${book.author} 📖`
                  : `Added "${book.title}" by ${book.author} to my reading list 📖`;
              window.open(
                'https://bsky.app/intent/compose?text=' + encodeURIComponent(text + '\nhttps://www.shelfwise.xyz'),
                '_blank'
              );
            }}
          >
            <Share2 size={14} />
            Share on Bluesky
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowRecommend(!showRecommend)}
          >
            <Send size={14} />
            Recommend
          </Button>
          <Button
            onClick={handleRemove}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
          >
            <Trash2 size={16} />
            Remove
          </Button>
        </div>

        {/* Recommend form */}
        {showRecommend && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={recommendHandle}
              onChange={(e) => setRecommendHandle(e.target.value)}
              placeholder="@friend.bsky.social"
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && recommendHandle.trim()) {
                  const mention = recommendHandle.trim().startsWith('@') ? recommendHandle.trim() : `@${recommendHandle.trim()}`
                  window.open(
                    'https://bsky.app/intent/compose?text=' + encodeURIComponent(
                      `${mention} you should check out "${book.title || 'this book'}" by ${book.author || 'Unknown'} 📖\nhttps://www.shelfwise.xyz`
                    ), '_blank'
                  )
                  setShowRecommend(false)
                  setRecommendHandle('')
                }
                if (e.key === 'Escape') {
                  setShowRecommend(false)
                  setRecommendHandle('')
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => {
                if (!recommendHandle.trim()) return
                const mention = recommendHandle.trim().startsWith('@') ? recommendHandle.trim() : `@${recommendHandle.trim()}`
                window.open(
                  'https://bsky.app/intent/compose?text=' + encodeURIComponent(
                    `${mention} you should check out "${book.title || 'this book'}" by ${book.author || 'Unknown'} 📖\nhttps://www.shelfwise.xyz`
                  ), '_blank'
                )
                setShowRecommend(false)
                setRecommendHandle('')
              }}
              disabled={!recommendHandle.trim()}
            >
              <Send size={14} />
              Send
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
