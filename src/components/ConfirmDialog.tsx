import { Sheet } from './Sheet'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">{description}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl py-2.5 font-medium bg-[var(--color-surface-muted)] text-[var(--color-text)]"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 rounded-xl py-2.5 font-medium text-white ${
            danger ? 'bg-red-500' : 'bg-[var(--color-primary)]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
