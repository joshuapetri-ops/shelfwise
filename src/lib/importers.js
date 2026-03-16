import Papa from 'papaparse';
import { lookupByIsbn } from '../api/openLibrary';

/**
 * Strip Goodreads ISBN formatting: ="0123456789012" → 0123456789012
 */
function stripIsbnWrapper(raw) {
  if (!raw) return '';
  return raw.replace(/^="?|"?$/g, '').trim();
}

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Map a Goodreads "Exclusive Shelf" value to a unified shelf name.
 */
function mapGoodreadsShelf(shelf) {
  if (!shelf) return '';
  const normalized = shelf.trim().toLowerCase();
  if (normalized === 'read') return 'read';
  if (normalized === 'currently-reading') return 'reading';
  if (normalized === 'to-read') return 'wantToRead';
  return normalized;
}

/**
 * Parse a CSV/TSV string with papaparse, returning rows as objects.
 */
function parseCsvContent(content, delimiter) {
  const result = Papa.parse(content.trim(), {
    header: true,
    skipEmptyLines: true,
    delimiter: delimiter || undefined,
  });
  return result.data;
}

/**
 * Parse a Goodreads CSV export.
 *
 * Expected columns: Title, Author, ISBN13, My Rating, Exclusive Shelf,
 * Bookshelves, My Review, Date Added
 */
export function parseGoodreads(content) {
  const rows = parseCsvContent(content);
  return rows.map((row) => ({
    key: crypto.randomUUID(),
    title: (row['Title'] || '').trim(),
    author: (row['Author'] || '').trim(),
    isbn: stripIsbnWrapper(row['ISBN13']),
    coverId: null,
    year: null,
    shelf: mapGoodreadsShelf(row['Exclusive Shelf']),
    ratings: row['My Rating'] && Number(row['My Rating']) > 0 ? { overall: Number(row['My Rating']) } : {},
    notes: (row['My Review'] || '').trim(),
    addedAt: row['Date Added'] ? new Date(row['Date Added']).toISOString() : null,
    tags: row['Bookshelves']
      ? row['Bookshelves'].split(',').map((t) => t.trim()).filter(Boolean)
      : [],
    source: 'goodreads',
  }));
}

/**
 * Parse a StoryGraph CSV export.
 *
 * Expected columns: Title, Authors, ISBN/UID, Star Rating, Read Status,
 * Moods, Pace, Format
 */
export function parseStoryGraph(content) {
  const rows = parseCsvContent(content);
  return rows.map((row) => {
    const moods = row['Moods']
      ? row['Moods'].split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    const pace = row['Pace'] ? [row['Pace'].trim()] : [];
    const format = row['Format'] ? [row['Format'].trim()] : [];

    return {
      key: crypto.randomUUID(),
      title: (row['Title'] || '').trim(),
      author: (row['Authors'] || '').trim(),
      isbn: (row['ISBN/UID'] || '').trim(),
      coverId: null,
      year: null,
      shelf: mapGoodreadsShelf(row['Read Status']),
      ratings: row['Star Rating'] && parseFloat(row['Star Rating']) > 0 ? { overall: Math.round(parseFloat(row['Star Rating'])) } : {},
      notes: '',
      addedAt: null,
      tags: [...moods, ...pace, ...format],
      source: 'storygraph',
    };
  });
}

/**
 * Parse a LibraryThing export (auto-detects TSV vs CSV).
 *
 * Expected columns: title, author, ISBNs, stars, collections, your tags, review
 */
export function parseLibraryThing(content) {
  const isTsv = content.indexOf('\t') !== -1;
  const rows = parseCsvContent(content, isTsv ? '\t' : ',');

  // LibraryThing columns are case-insensitive; build a column lookup.
  function col(row, name) {
    const lower = name.toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === lower) return (row[key] || '').trim();
    }
    return '';
  }

  return rows.map((row) => {
    const rawAuthor = col(row, 'author');
    // If author is in "Last, First" format, flip it.
    const author = rawAuthor.includes(',')
      ? rawAuthor.split(',').map((p) => p.trim()).reverse().join(' ')
      : rawAuthor;

    const rawIsbns = col(row, 'ISBNs');
    const isbn = rawIsbns
      ? rawIsbns.split(',').map((i) => i.trim()).filter(Boolean)[0] || ''
      : '';

    const collections = col(row, 'collections');
    const yourTags = col(row, 'your tags');
    const tags = [
      ...(collections ? collections.split(',').map((t) => t.trim()).filter(Boolean) : []),
      ...(yourTags ? yourTags.split(',').map((t) => t.trim()).filter(Boolean) : []),
    ];

    return {
      key: crypto.randomUUID(),
      title: col(row, 'title'),
      author,
      isbn,
      coverId: null,
      year: null,
      shelf: '',
      ratings: col(row, 'stars') && Number(col(row, 'stars')) > 0 ? { overall: Number(col(row, 'stars')) } : {},
      notes: col(row, 'review'),
      addedAt: null,
      tags,
      source: 'librarything',
    };
  });
}

/**
 * Parse an Open Library CSV export.
 *
 * Expected columns: title, authors, isbn_13, bookshelf, rating, work_key
 */
export function parseOpenLibrary(content) {
  const rows = parseCsvContent(content);
  return rows.map((row) => ({
    key: crypto.randomUUID(),
    title: (row['title'] || '').trim(),
    author: (row['authors'] || '').trim(),
    isbn: (row['isbn_13'] || '').trim(),
    coverId: null,
    year: null,
    shelf: (row['bookshelf'] || '').trim().toLowerCase(),
    ratings: row['rating'] && Number(row['rating']) > 0 ? { overall: Number(row['rating']) } : {},
    notes: '',
    addedAt: null,
    tags: [],
    source: 'openlibrary',
  }));
}

/**
 * Parse a Calibre CSV export.
 *
 * Expected columns: title, authors, isbn, rating (0–10, divide by 2), tags,
 * comments (HTML stripped), pubdate, identifiers, series, series_index
 */
export function parseCalibre(content) {
  const rows = parseCsvContent(content);
  return rows.map((row) => {
    const rawTags = row['tags']
      ? row['tags'].split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    const series = (row['series'] || '').trim();
    const seriesIndex = (row['series_index'] || '').trim();
    if (series) {
      rawTags.push(seriesIndex ? `${series} #${seriesIndex}` : series);
    }

    let year = null;
    if (row['pubdate']) {
      const parsed = new Date(row['pubdate']);
      if (!isNaN(parsed.getTime())) {
        year = parsed.getFullYear();
      }
    }

    return {
      key: crypto.randomUUID(),
      title: (row['title'] || '').trim(),
      author: (row['authors'] || '').trim(),
      isbn: (row['isbn'] || '').trim(),
      coverId: null,
      year,
      shelf: '',
      ratings: row['rating'] && Number(row['rating']) > 0 ? { overall: Math.round(Number(row['rating']) / 2) } : {},
      notes: stripHtml(row['comments']),
      addedAt: null,
      tags: rawTags,
      source: 'calibre',
    };
  });
}

/**
 * Auto-detect the import platform from a File object, parse it, and return
 * a promise that resolves to an array of unified book objects.
 */
export function autoImport(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = reader.result;
        const firstLine = content.split(/\r?\n/)[0];
        const headersLower = firstLine.toLowerCase();

        let books;
        if (headersLower.includes('exclusive shelf') || headersLower.includes('bookshelves')) {
          books = parseGoodreads(content);
        } else if (headersLower.includes('isbn/uid') || headersLower.includes('read status')) {
          books = parseStoryGraph(content);
        } else if (headersLower.includes('work_key') || headersLower.includes('isbn_13')) {
          books = parseOpenLibrary(content);
        } else if (headersLower.includes('identifiers') || headersLower.includes('series_index')) {
          books = parseCalibre(content);
        } else if (
          firstLine.indexOf('\t') !== -1 ||
          headersLower.includes('your tags') ||
          headersLower.includes('collections')
        ) {
          books = parseLibraryThing(content);
        } else {
          // Fallback: attempt Goodreads as the most common format.
          books = parseGoodreads(content);
        }

        resolve(books);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Batch-enrich books with cover IDs via Open Library ISBN lookup.
 *
 * @param {Array} books - Array of unified book objects.
 * @param {Function} onProgress - Callback receiving (completed, total).
 * @returns {Promise<Array>} Books with coverId backfilled where possible.
 */
export async function enrichCovers(books, onProgress) {
  const booksNeedingCovers = books.filter((b) => !b.coverId && b.isbn);
  const total = booksNeedingCovers.length;
  let completed = 0;

  const BATCH_SIZE = 5;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = booksNeedingCovers.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((book) =>
        lookupByIsbn(book.isbn).then((data) => {
          const coverId = data?.covers?.[0] ?? data?.coverId;
          if (coverId) {
            book.coverId = coverId;
          }
        })
      )
    );

    completed += batch.length;
    if (onProgress) {
      onProgress(completed, total);
    }
  }

  return books;
}

/**
 * Export an array of books to a Shelfwise CSV string.
 *
 * @param {Array} books - Array of unified book objects.
 * @param {Object} criteria - Optional filter/sort criteria (reserved for future use).
 * @returns {string} CSV string.
 */
export function exportShelfwiseCSV(books, criteria) {
  const exportData = books.map((book) => ({
    key: book.key || '',
    title: book.title || '',
    author: book.author || '',
    isbn: book.isbn || '',
    coverId: book.coverId || '',
    year: book.year != null ? book.year : '',
    shelf: book.shelf || '',
    ratings: book.ratings ? JSON.stringify(book.ratings) : '',
    notes: book.notes || '',
    addedAt: book.addedAt || '',
    tags: Array.isArray(book.tags) ? book.tags.join(', ') : book.tags || '',
    source: book.source || '',
  }));

  return Papa.unparse(exportData);
}
