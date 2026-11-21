import type { ReactNode } from 'react'
import { TopBar } from './TopBar'

export function ComingSoon({
  title,
  icon,
  phase,
  description,
}: {
  title: string
  icon: ReactNode
  phase: string
  description: string
}) {
  return (
    <div>
      <TopBar title={title} />
      <div className="px-4 sm:px-8 sm:pt-8 max-w-2xl mx-auto">
        <h1 className="hidden sm:block text-2xl font-bold mb-6">{title}</h1>
        <div className="flex flex-col items-center text-center py-16 px-6 rounded-2xl bg-[var(--color-surface)]">
          <div className="mb-4 text-[var(--color-primary)]">{icon}</div>
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-full px-2.5 py-1 mb-3">
            {phase}
          </span>
          <p className="font-semibold mb-1">Pas encore disponible</p>
          <p className="text-sm text-[var(--color-text-muted)] max-w-sm">{description}</p>
        </div>
      </div>
    </div>
  )
}
