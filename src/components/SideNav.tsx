import { NavLink } from 'react-router-dom'
import { Home, Library, Zap, GraduationCap, CalendarDays, BarChart3, Bot, Moon, Sun, Laptop } from 'lucide-react'
import { useThemeStore } from '../store/theme'

const items = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/library', label: 'Mes cours', icon: Library },
  { to: '/review', label: 'Réviser', icon: Zap },
  { to: '/exams', label: 'Examens', icon: GraduationCap },
  { to: '/calendar', label: 'Calendrier', icon: CalendarDays },
  { to: '/stats', label: 'Statistiques', icon: BarChart3 },
  { to: '/assistant', label: 'Assistant IA', icon: Bot },
]

export function SideNav() {
  const { theme, setTheme } = useThemeStore()

  return (
    <aside className="hidden sm:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2 px-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-white font-bold">
          S
        </div>
        <span className="font-semibold text-lg">StudyFlow</span>
      </div>
      <nav className="flex flex-col gap-1 grow">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-surface-muted)]">
        {([
          ['light', Sun],
          ['dark', Moon],
          ['system', Laptop],
        ] as const).map(([value, Icon]) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-lg ${
              theme === value ? 'bg-[var(--color-surface)] shadow-sm' : ''
            }`}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
    </aside>
  )
}
