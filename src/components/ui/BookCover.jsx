import { getCoverUrl, getCoverByIsbn } from '../../api/openLibrary'

const sizeClasses = { S: 'w-10 h-14', M: 'w-24 h-36', L: 'w-40 h-60' }

export default function BookCover({ coverId, isbn, title = '', size = 'M' }) {
  const url = getCoverUrl(coverId, size) || getCoverByIsbn(isbn, size)

  return url ? (
    <img
      src={url}
      alt={title}
      className={`${sizeClasses[size]} object-cover rounded shadow`}
      loading="lazy"
    />
  ) : (
    <div
      className={`${sizeClasses[size]} rounded shadow bg-gray-200 dark:bg-gray-700 flex items-center justify-center p-1`}
    >
      <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight line-clamp-3">
        {title}
      </span>
    </div>
  )
}
