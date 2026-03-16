import { X } from 'lucide-react'
import clsx from 'clsx'

export default function Pill({ children, color = 'gray', onRemove }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  }

  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', colors[color] ?? colors.gray)}>
      {children}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70">
          <X size={12} />
        </button>
      )}
    </span>
  )
}
