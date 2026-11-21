import type { ReactNode } from 'react'
import { Sheet } from './Sheet'

export interface ActionItem {
  key: string
  label: string
  icon: ReactNode
  danger?: boolean
  onSelect: () => void
}

export function ActionSheet({
  open,
  title,
  actions,
  onClose,
}: {
  open: boolean
  title: string
  actions: ActionItem[]
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-1 -mx-1">
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={() => {
              a.onSelect()
              onClose()
            }}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-[var(--color-surface-muted)] ${
              a.danger ? 'text-red-500' : 'text-[var(--color-text)]'
            }`}
          >
            {a.icon}
            <span className="font-medium">{a.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
