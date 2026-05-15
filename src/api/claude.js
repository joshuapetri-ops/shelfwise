/**
 * Get book recommendations from Claude (proxied through /api/claude on the server).
 *
 * @param {string} prompt - The user's request or preference description.
 * @param {Array<{title: string, author: string}>} books - The user's current library.
 * @param {string} [language='en'] - Preferred language code.
 * @returns {Promise<Array<{title: string, author: string, reason: string}>>} Recommended books.
 */
export async function getRecommendations(prompt, books = [], language = 'en') {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'recommendations', prompt, books, language }),
  });

  if (res.status === 429) {
    throw new Error('Too many recommendation requests. Please wait a moment and try again.');
  }
  if (!res.ok) {
    throw new Error(`Recommendations request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('Recommendations response was not a JSON array');
  }
  return data;
}
