const BASE_URL = "https://openlibrary.org";
const COVERS_URL = "https://covers.openlibrary.org";

/**
 * Search for books using the Open Library Search API.
 *
 * @param {string} query - Search query string.
 * @param {Object} [options]
 * @param {number} [options.limit=20] - Maximum number of results to return.
 * @returns {Promise<Array<{title: string, author: string, year: number|null, coverId: number|null, isbn: string|null, subjects: string[]}>>}
 */
export async function searchBooks(query, { limit = 20 } = {}) {
  if (!query || !query.trim()) {
    return [];
  }

  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
    fields:
      "title,author_name,first_publish_year,cover_i,isbn,subject",
  });

  const response = await fetch(`${BASE_URL}/search.json?${params}`);

  if (!response.ok) {
    throw new Error(
      `Open Library search failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  const results = (data.docs || []).map((doc) => ({
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

  // Deduplicate by normalized title + author, keeping the first (most relevant) entry
  const seen = new Set();
  return results.filter((book) => {
    const key = `${book.title.toLowerCase().trim()}|${book.author.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Lightweight autocomplete search for type-ahead suggestions.
 *
 * @param {string} query - Partial search query.
 * @param {number} [limit=5] - Maximum number of suggestions.
 * @returns {Promise<Array<{title: string, author: string, coverId: number|null}>>}
 */
export async function autocomplete(query, limit = 5) {
  if (!query || !query.trim()) {
    return [];
  }

  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
    fields: "key,title,author_name,cover_i,first_publish_year,isbn",
  });

  const response = await fetch(`${BASE_URL}/search.json?${params}`);

  if (!response.ok) {
    throw new Error(
      `Open Library autocomplete failed: ${response.status} ${response.statusText}`
    );
  }

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
