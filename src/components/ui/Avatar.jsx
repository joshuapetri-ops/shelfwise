import clsx from 'clsx'

const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' }

export default function Avatar({ name = '', src, size = 'md' }) {
  const initials = name.charAt(0).toUpperCase()

  return src ? (
    <img
      src={src}
      alt={name}
      className={clsx('rounded-full object-cover', sizes[size])}
    />
  ) : (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center bg-indigo-100 text-indigo-700 font-semibold dark:bg-indigo-900 dark:text-indigo-300',
        sizes[size],
      )}
    >
      {initials}
    </div>
  )
}
