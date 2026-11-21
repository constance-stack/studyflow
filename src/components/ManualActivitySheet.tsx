import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { ActivityItemsEditor } from './manual/ActivityItemsEditor'
import { flatItemsToContent } from './manual/contentShape'
import { createActivity } from '../db/queries'
import type { ActivityType } from '../db/types'

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'flashcard', label: 'Flashcards' },
  { value: 'qcm', label: 'QCM' },
  { value: 'truefalse', label: 'Vrai / Faux' },
  { value: 'blank', label: 'Textes à trous' },
  { value: 'open', label: 'Questions ouvertes' },
  { value: 'vocab', label: 'Vocabulaire' },
  { value: 'minilesson', label: 'Mini-leçons' },
  { value: 'reflection', label: 'Réflexion' },
  { value: 'miniexercise', label: 'Mini-exercices' },
  { value: 'exercise', label: 'Exercices complets' },
  { value: 'match', label: 'Associations' },
  { value: 'timeline', label: 'Chronologie' },
]

export function ManualActivitySheet({
  open,
  onClose,
  chapterId,
  subjectId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  chapterId: string
  subjectId: string
  onCreated: () => void
}) {
  const [type, setType] = useState<ActivityType>('flashcard')
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<unknown[]>([])

  useEffect(() => {
    if (open) {
      setType('flashcard')
      setTitle('')
      setItems([])
    }
  }, [open])

  async function handleSave() {
    if (!title.trim() || items.length === 0) return
    await createActivity({
      subjectIds: [subjectId],
      chapterIds: [chapterId],
      type,
      title: title.trim(),
      source: 'manual',
      config: {},
      content: flatItemsToContent(type, items),
    })
    onCreated()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Créer manuellement"
      footer={
        <button
          onClick={handleSave}
          disabled={!title.trim() || items.length === 0}
          className="w-full rounded-xl py-3 font-medium text-white bg-[var(--color-primary)] disabled:opacity-40"
        >
          Enregistrer la collection
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Titre</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mes flashcards de vocabulaire"
            className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as ActivityType)
              setItems([])
            }}
            className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-sm outline-none"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <ActivityItemsEditor type={type} items={items} onChange={setItems} />
      </div>
    </Sheet>
  )
}
