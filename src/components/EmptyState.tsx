import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="mb-4 text-[var(--color-text-muted)]">{icon}</div>
      <p className="font-semibold text-[var(--color-text)]">{title}</p>
      {description && <p className="mt-1 text-sm text-[var(--color-text-muted)] max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
