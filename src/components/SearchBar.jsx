import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import useDebounce from '../hooks/useDebounce'
import { autocomplete } from '../api/openLibrary'
import BookCover from './ui/BookCover'

export default function SearchBar({ onSearch, onSelect }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const fetchIdRef = useRef(0)

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    const id = ++fetchIdRef.current
    autocomplete(debouncedQuery).then((results) => {
      if (id === fetchIdRef.current) {
        setSuggestions(results ?? [])
        setOpen(true)
      }
    })
  }, [debouncedQuery])

  function handleSubmit(e) {
    e?.preventDefault()
    setOpen(false)
    onSearch?.(query)
  }

  function handleSelect(item) {
    setQuery(item.title ?? '')
    setOpen(false)
    onSelect?.(item)
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => setOpen(false)}
            placeholder="Search books..."
            data-1p-ignore
            autoComplete="off"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-3 pr-3 text-sm focus:border-indigo-400 focus:outline-none dark:text-gray-100"
          />

          {open && suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
              {suggestions.map((item, idx) => (
                <li
                  key={idx}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(item)
                  }}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <BookCover coverId={item.coverId} title={item.title} size="S" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                      {item.title}
                    </p>
                    {item.author && (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {item.author}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 active:scale-95"
        >
          <Search size={16} />
          <span>Search</span>
        </button>
      </div>
    </form>
  )
}
