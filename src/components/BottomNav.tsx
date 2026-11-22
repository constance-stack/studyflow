import { NavLink } from 'react-router-dom'
import { Home, Library, Zap, Bot, CalendarDays, Menu } from 'lucide-react'

const items = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/library', label: 'Cours', icon: Library },
  { to: '/review', label: 'Réviser', icon: Zap },
  { to: '/assistant', label: 'IA', icon: Bot },
  { to: '/calendar', label: 'Calendrier', icon: CalendarDays },
  { to: '/more', label: 'Plus', icon: Menu },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur border-t flex sm:hidden"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
              isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
