import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { ColorPicker, IconPicker } from './ColorIconPicker'
import { SUBJECT_COLORS, SUBJECT_ICONS } from '../lib/palette'
import type { Subject } from '../db/types'

interface SubjectFormSheetProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { name: string; color: string; icon: string }) => void
  initial?: Subject | null
}

export function SubjectFormSheet({ open, onClose, onSubmit, initial }: SubjectFormSheetProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(SUBJECT_COLORS[0])
  const [icon, setIcon] = useState<string>(SUBJECT_ICONS[0])

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setColor(initial?.color ?? SUBJECT_COLORS[0])
      setIcon(initial?.icon ?? SUBJECT_ICONS[0])
    }
  }, [open, initial])

  function handleSubmit() {
    if (!name.trim()) return
    onSubmit({ name: name.trim(), color, icon })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? 'Modifier la matière' : 'Nouvelle matière'}
      footer={
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="w-full rounded-xl py-3 font-medium text-white bg-[var(--color-primary)] disabled:opacity-40"
        >
          {initial ? 'Enregistrer' : 'Créer la matière'}
        </button>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Nom</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mathématiques"
            className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Couleur</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Icône</label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
      </div>
    </Sheet>
  )
}
