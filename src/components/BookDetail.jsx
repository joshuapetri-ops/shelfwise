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
import useChallenges from '../hooks/useChallenges';
import { ExternalLink, Trash2, Plus } from 'lucide-react';

const SHELVES = [
  { key: 'reading', label: 'Reading' },
  { key: 'wantToRead', label: 'Want to Read' },
  { key: 'read', label: 'Read' },
  { key: 'dnf', label: "Couldn't Finish" },
];

export default function BookDetail({ book, isOpen, onClose, onUpdate, onRemove, criteria, libraryCode }) {
  const [notes, setNotes] = useState(book.notes ?? '');
  const [newTag, setNewTag] = useState('');
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
    if (bookExistsInLibrary) {
      onUpdate(book.key, { shelf: shelfKey });
    } else {
      addBook({ ...book, shelf: shelfKey });
    }
  }

  /* ── Ratings ── */
  function handleRatingChange(criterionId, value) {
    onUpdate(book.key, { ratings: { ...book.ratings, [criterionId]: value } });
  }

  /* ── Notes ── */
  function handleNotesBlur(e) {
    onUpdate(book.key, { notes: e.target.value });
  }

  /* ── Tags ── */
  function handleRemoveTag(tag) {
    onUpdate(book.key, { tags: book.tags.filter((t) => t !== tag) });
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
          <div className="flex gap-2">
            {SHELVES.map(({ key, label }) => {
              const isActive = book.shelf === key;
              return (
                <button
                  key={key}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleShelfChange(key)
                  }}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
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
          {matchingChallenge && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                Counts toward {matchingChallenge.title}
              </span>
            </div>
          )}
        </div>

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
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
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

        {/* ── Footer: Remove ── */}
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button
            onClick={handleRemove}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
          >
            <Trash2 size={16} />
            Remove from Library
          </Button>
        </div>
      </div>
    </Modal>
  );
}
