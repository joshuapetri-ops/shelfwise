import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'shelfwise-books'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

export default function useBooks() {
  const [books, setBooks] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
  }, [books])

  const addBook = useCallback((book) => {
    setBooks((prev) => {
      if (prev.some((b) => b.key === book.key)) return prev
      return [...prev, { ...book, addedAt: book.addedAt ?? new Date().toISOString() }]
    })
  }, [])

  const updateBook = useCallback((key, updates) => {
    setBooks((prev) => prev.map((b) => (b.key === key ? { ...b, ...updates } : b)))
  }, [])

  const removeBook = useCallback((key) => {
    setBooks((prev) => prev.filter((b) => b.key !== key))
  }, [])

  const getBooksByShelf = useCallback(
    (shelf) => books.filter((b) => b.shelf === shelf),
    [books],
  )

  const importBooks = useCallback((newBooks) => {
    setBooks((prev) => {
      const existingKeys = new Set(prev.map((b) => b.key))
      const unique = newBooks.filter((b) => !existingKeys.has(b.key))
      return [...prev, ...unique]
    })
  }, [])

  return { books, addBook, updateBook, removeBook, getBooksByShelf, importBooks }
}
