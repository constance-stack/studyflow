import { SUBJECT_COLORS, SUBJECT_ICONS } from '../lib/palette'
import { SubjectIcon } from '../lib/iconMap'
import { Check } from 'lucide-react'

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {SUBJECT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{ backgroundColor: color }}
          aria-label={color}
        >
          {value === color && <Check size={16} className="text-white" />}
        </button>
      ))}
    </div>
  )
}

export function IconPicker({ value, onChange }: { value: string; onChange: (i: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2.5">
      {SUBJECT_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(icon)}
          className={`aspect-square rounded-xl flex items-center justify-center transition-colors ${
            value === icon
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'
          }`}
        >
          <SubjectIcon name={icon} size={20} />
        </button>
      ))}
    </div>
  )
}
