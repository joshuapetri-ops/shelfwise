/**
 * Build an array of acquisition/purchase links for a given book.
 *
 * @param {Object} book - A unified book object with title, author, and isbn fields.
 * @param {string} [libraryCode] - Optional library code for Libby links.
 * @returns {Array<{name: string, url: string}>} Array of link objects.
 */
export function buildAcquireLinks(book, libraryCode) {
  const links = [];
  const title = book.title || '';
  const author = book.author || '';
  const isbn = book.isbn || '';
  const titleAndAuthor = `${title} ${author}`.trim();
  const encodedTitleAuthor = encodeURIComponent(titleAndAuthor);
  const encodedTitle = encodeURIComponent(title);

  // Libby — only if a library code is provided
  if (libraryCode) {
    const libbyQuery = encodeURIComponent(titleAndAuthor);
    links.push({
      name: 'Libby',
      url: `https://libbyapp.com/library/${encodeURIComponent(libraryCode)}/search/query-${libbyQuery}/page-1`,
    });
  }

  // Bookshop.org — search by title + author
  links.push({
    name: 'Bookshop.org',
    url: `https://bookshop.org/beta-search?query=${encodedTitleAuthor}`,
  });

  // Powell's — search by title
  links.push({
    name: "Powell's",
    url: `https://www.powells.com/searchresults?keyword=${encodedTitle}`,
  });

  // Amazon — by ISBN if available, else search by title + author
  if (isbn) {
    links.push({
      name: 'Amazon',
      url: `https://www.amazon.com/dp/${encodeURIComponent(isbn)}`,
    });
  } else {
    links.push({
      name: 'Amazon',
      url: `https://www.amazon.com/s?k=${encodedTitleAuthor}`,
    });
  }

  // Kindle — same logic as Amazon but filtered to Kindle store
  if (isbn) {
    links.push({
      name: 'Kindle',
      url: `https://www.amazon.com/dp/${encodeURIComponent(isbn)}?binding=kindle`,
    });
  } else {
    links.push({
      name: 'Kindle',
      url: `https://www.amazon.com/s?k=${encodedTitleAuthor}&i=digital-text`,
    });
  }

  return links;
}
