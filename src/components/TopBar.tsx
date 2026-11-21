import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function TopBar({ title }: { title: string }) {
  const navigate = useNavigate()
  return (
    <header
      className="sm:hidden sticky top-0 z-30 flex items-center justify-between px-4 bg-[var(--color-bg)]/95 backdrop-blur"
      style={{ paddingTop: 'calc(var(--safe-top) + 10px)', paddingBottom: '10px' }}
    >
      <h1 className="text-xl font-bold text-[var(--color-text)]">{title}</h1>
      <button
        onClick={() => navigate('/search')}
        className="p-2 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
        aria-label="Rechercher"
      >
        <Search size={18} />
      </button>
    </header>
  )
}
