import { Sheet } from './Sheet'
import { ColorPicker } from './ColorIconPicker'

export function ColorPickerSheet({
  open,
  onClose,
  title,
  value,
  defaultLabel,
  onChange,
}: {
  open: boolean
  onClose: () => void
  title: string
  value: string | null | undefined
  defaultLabel: string
  onChange: (color: string | null) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <button
          onClick={() => {
            onChange(null)
            onClose()
          }}
          className={`text-left rounded-xl px-3.5 py-2.5 text-sm font-medium ${
            !value ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface-muted)]'
          }`}
        >
          {defaultLabel}
        </button>
        <ColorPicker
          value={value ?? ''}
          onChange={(color) => {
            onChange(color)
            onClose()
          }}
        />
      </div>
    </Sheet>
  )
}
