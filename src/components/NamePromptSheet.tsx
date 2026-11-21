import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'

interface NamePromptSheetProps {
  open: boolean
  title: string
  label: string
  placeholder?: string
  initialValue?: string
  submitLabel?: string
  onClose: () => void
  onSubmit: (value: string) => void
}

export function NamePromptSheet({
  open,
  title,
  label,
  placeholder,
  initialValue = '',
  submitLabel = 'Créer',
  onClose,
  onSubmit,
}: NamePromptSheetProps) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (open) setValue(initialValue)
  }, [open, initialValue])

  function handleSubmit() {
    if (!value.trim()) return
    onSubmit(value.trim())
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="w-full rounded-xl py-3 font-medium text-white bg-[var(--color-primary)] disabled:opacity-40"
        >
          {submitLabel}
        </button>
      }
    >
      <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">{label}</label>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder={placeholder}
        className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      />
    </Sheet>
  )
}
