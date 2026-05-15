const BASE_URL = "https://openlibrary.org";
const COVERS_URL = "https://covers.openlibrary.org";

// Map 2-letter setting codes to 3-letter Open Library language codes
const LANG_MAP = {
  en: 'eng', es: 'spa', fr: 'fre', de: 'ger',
  pt: 'por', it: 'ita', ja: 'jpn', zh: 'chi',
  ko: 'kor', ru: 'rus', ar: 'ara', hi: 'hin',
  nl: 'dut', sv: 'swe', pl: 'pol',
};

function toOlLang(lang) {
  if (!lang) return 'eng';
  // Already a 3-letter code
  if (lang.length === 3) return lang;
  return LANG_MAP[lang] || 'eng';
}

function deduplicateResults(results) {
  const seenKeys = new Set();
  const seenTitleAuthor = new Set();
  return results.filter((book) => {
    // Deduplicate by OL key
    if (book.key && seenKeys.has(book.key)) return false;
    if (book.key) seenKeys.add(book.key);
    // Deduplicate by normalized title + author
    const ta = `${book.title.toLowerCase().trim()}|${book.author.toLowerCase().trim()}`;
    if (seenTitleAuthor.has(ta)) return false;
    seenTitleAuthor.add(ta);
    return true;
  });
}

function mapDocs(docs) {
  return (docs || []).map((doc) => ({
    key: doc.key || null,
    title: doc.title || "Unknown Title",
    author: Array.isArray(doc.author_name)
      ? doc.author_name[0]
      : doc.author_name || "Unknown Author",
    year: doc.first_publish_year ?? null,
    coverId: doc.cover_i ?? null,
    isbn: Array.isArray(doc.isbn) ? doc.isbn[0] : doc.isbn || null,
    subjects: Array.isArray(doc.subject) ? doc.subject.slice(0, 10) : [],
  }));
}

/**
 * Search for books using the Open Library Search API.
 * Falls back to Claude API when Open Library returns no results.
 *
 * @param {string} query - Search query string.
 * @param {Object} [options]
 * @param {number} [options.limit=20] - Maximum number of results to return.
 * @param {string} [options.language] - 2-letter or 3-letter language code.
 * @returns {Promise<Array>}
 */
export async function searchBooks(query, { limit = 20, language, onProgress } = {}) {
  if (!query || !query.trim()) {
    return [];
  }

  const olLang = toOlLang(language);

  try {
    // Try with language filter first
    let results = await searchOL(query, limit, olLang);

    // If language-filtered search returned nothing, try without the filter
    if (results.length === 0) {
      results = await searchOL(query, limit, null);
    }

    if (results.length > 0) return results;
  } catch { /* continue to fallbacks */ }

  // Fallback 1: ask Claude for book info from training knowledge
  onProgress?.('Not found in Open Library. Searching deeper...');
  try {
    const claudeResults = await searchWithClaude(query, limit);
    if (claudeResults.length > 0) return claudeResults;
  } catch { /* continue to next fallback */ }

  // Fallback 2: Claude with web search for very recent books
  onProgress?.('Searching the web for recent releases...');
  try {
    const webResults = await searchWithClaudeWeb(query);
    if (webResults.length > 0) return webResults;
  } catch { /* all fallbacks exhausted */ }

  return [];
}

async function searchOL(query, limit, langCode) {
  const q = langCode
    ? `${query.trim()} language:${langCode}`
    : query.trim();

  const url = `${BASE_URL}/search.json?` + new URLSearchParams({
    q,
    limit: String(limit),
    fields: "key,title,author_name,first_publish_year,cover_i,isbn,subject",
  }).toString();

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OL returned ${response.status}`);
  }

  const data = await response.json();
  return deduplicateResults(mapDocs(data.docs));
}

async function enrichWithCovers(results) {
  return Promise.all(results.map(async (book) => {
    if (!book.isbn) return book;

    // Try Open Library first
    try {
      const olRes = await fetch(
        `${BASE_URL}/search.json?isbn=${book.isbn}&fields=key,cover_i&limit=1`
      );
      const olData = await olRes.json();
      if (olData.docs?.[0]?.cover_i) {
        return {
          ...book,
          coverId: olData.docs[0].cover_i,
          key: olData.docs[0].key || book.key,
        };
      }
    } catch { /* ignore */ }

    // Fallback: Google Books for cover
    try {
      const gbRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${book.isbn}&fields=items(volumeInfo/imageLinks)`
      );
      const gbData = await gbRes.json();
      const thumbnail = gbData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
      if (thumbnail) {
        return {
          ...book,
          coverUrl: thumbnail.replace('http://', 'https://'),
        };
      }
    } catch { /* ignore */ }

    return book;
  }));
}

async function searchWithClaude(query, limit) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', query, limit }),
    });
    if (!res.ok) return [];

    const parsed = await res.json();
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    const mapped = parsed.map((b, i) => ({
      key: '/works/ai_' + encodeURIComponent(b.title).slice(0, 20) + '_' + i,
      title: b.title,
      author: b.author || 'Unknown',
      year: b.year || null,
      coverId: null,
      isbn: b.isbn || null,
      subjects: [],
    }));

    return enrichWithCovers(mapped);
  } catch {
    return [];
  }
}

async function searchWithClaudeWeb(query) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search-web', query }),
    });
    if (!res.ok) return [];

    const parsed = await res.json();
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    if (arr.length === 0) return [];

    const mapped = arr.map((b, i) => ({
      key: '/works/web_' + encodeURIComponent(b.title || query).slice(0, 20) + '_' + i,
      title: b.title || query,
      author: b.author || 'Unknown',
      year: b.year || null,
      coverId: null,
      isbn: b.isbn || null,
      subjects: [],
    }));

    return enrichWithCovers(mapped);
  } catch {
    return [];
  }
}

/**
 * Lightweight autocomplete search for type-ahead suggestions.
 *
 * @param {string} query - Partial search query.
 * @param {number} [limit=5] - Maximum number of suggestions.
 * @param {string} [language] - 2-letter or 3-letter language code.
 * @returns {Promise<Array<{title: string, author: string, coverId: number|null}>>}
 */
export async function autocomplete(query, limit = 5) {
  if (!query || !query.trim()) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query.trim(),
      limit: String(limit),
      fields: "key,title,author_name,cover_i,first_publish_year,isbn",
    });

    const response = await fetch(`${BASE_URL}/search.json?${params}`);

    if (!response.ok) return [];

    const data = await response.json();

    return (data.docs || []).map((doc) => ({
      key: doc.key || null,
      title: doc.title || "Unknown Title",
      author: Array.isArray(doc.author_name)
        ? doc.author_name[0]
        : doc.author_name || "Unknown Author",
      coverId: doc.cover_i ?? null,
      year: doc.first_publish_year ?? null,
      isbn: Array.isArray(doc.isbn) ? doc.isbn[0] : doc.isbn || null,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch full work details by Open Library work key.
 *
 * @param {string} key - The work key (e.g. "OL45804W"). Do not include the "/works/" prefix.
 * @returns {Promise<Object>} The raw work object from Open Library.
 */
export async function getWork(key) {
  if (!key) {
    throw new Error("A work key is required");
  }

  const cleanKey = key.replace(/^\/works\//, "");
  const response = await fetch(`${BASE_URL}/works/${cleanKey}.json`);

  if (!response.ok) {
    throw new Error(
      `Open Library work fetch failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Look up a book by ISBN for enrichment data.
 *
 * @param {string} isbn - ISBN-10 or ISBN-13.
 * @returns {Promise<Object>} The raw edition object from Open Library.
 */
export async function lookupByIsbn(isbn) {
  if (!isbn) {
    throw new Error("An ISBN is required");
  }

  const cleanIsbn = isbn.replace(/[-\s]/g, "");
  const response = await fetch(`${BASE_URL}/isbn/${cleanIsbn}.json`);

  if (!response.ok) {
    throw new Error(
      `Open Library ISBN lookup failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Build a cover image URL from an Open Library cover ID.
 *
 * @param {number|string} coverId - The Open Library cover ID.
 * @param {"S"|"M"|"L"} [size="M"] - Image size: S (small), M (medium), L (large).
 * @returns {string} The cover image URL.
 */
export function getCoverUrl(coverId, size = "M") {
  if (!coverId) {
    return "";
  }

  const validSize = ["S", "M", "L"].includes(size) ? size : "M";
  return `${COVERS_URL}/b/id/${coverId}-${validSize}.jpg`;
}

/**
 * Build a cover image URL from an ISBN (fallback when no cover ID is available).
 *
 * @param {string} isbn - ISBN-10 or ISBN-13.
 * @param {"S"|"M"|"L"} [size="M"] - Image size: S (small), M (medium), L (large).
 * @returns {string} The cover image URL.
 */
export function getCoverByIsbn(isbn, size = "M") {
  if (!isbn) {
    return "";
  }

  const cleanIsbn = isbn.replace(/[-\s]/g, "");
  const validSize = ["S", "M", "L"].includes(size) ? size : "M";
  return `${COVERS_URL}/b/isbn/${cleanIsbn}-${validSize}.jpg`;
}
