const LIBBY_BASE_URL = "https://libbyapp.com";

/**
 * Check library availability for a book by ISBN.
 *
 * This is a placeholder that returns mock data. The real OverDrive/Libby API
 * requires partner authentication and is not publicly accessible.
 *
 * @param {string} isbn - ISBN-10 or ISBN-13.
 * @param {string} libraryCode - The OverDrive library code (e.g. "lapl", "nypl").
 * @returns {Promise<{available: boolean, waitlistPosition: number|null, estimatedWaitDays: number|null, formats: string[]}>}
 */
export async function checkAvailability(isbn, libraryCode) {
  if (!isbn || !libraryCode) {
    throw new Error("Both isbn and libraryCode are required");
  }

  // Simulated network delay for realistic integration testing.
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Mock response — replace with real OverDrive API integration when auth is available.
  return {
    available: Math.random() > 0.5,
    waitlistPosition: Math.random() > 0.5 ? Math.floor(Math.random() * 20) + 1 : null,
    estimatedWaitDays: Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 1 : null,
    formats: ["ebook", "audiobook"],
  };
}

/**
 * Build a Libby URL to open a book's page in the Libby app or website.
 *
 * @param {string} isbn - ISBN-10 or ISBN-13.
 * @param {string} libraryCode - The OverDrive library code (e.g. "lapl", "nypl").
 * @returns {string} A URL that opens the book in Libby for the given library.
 */
export function buildLibbyUrl(isbn, libraryCode) {
  if (!isbn || !libraryCode) {
    throw new Error("Both isbn and libraryCode are required");
  }

  const cleanIsbn = isbn.replace(/[-\s]/g, "");
  return `${LIBBY_BASE_URL}/library/${encodeURIComponent(libraryCode)}/search/query-${cleanIsbn}`;
}
