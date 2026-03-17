import { useLocation, Link } from 'react-router-dom'
import { BookOpen, Search, Users, BarChart3, Settings } from 'lucide-react'
import clsx from 'clsx'

const TABS = [
  { to: '/', label: 'Shelves', icon: BookOpen },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/social', label: 'Social', icon: Users },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function NavBar() {
  const { pathname } = useLocation()

  function isActive(to) {
    if (to === '/') return pathname === '/'
    return pathname.startsWith(to)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex">
        {TABS.map(({ to, label, icon: Icon }) => { // eslint-disable-line no-unused-vars
          const active = isActive(to)
          return (
            <li key={to} className="flex-1 min-w-0">
              <Link
                to={to}
                className={clsx(
                  'flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition w-full',
                  active
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
                <span className="truncate max-w-full px-1">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
