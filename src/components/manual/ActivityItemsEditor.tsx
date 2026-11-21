import { useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { ItemDraftForm } from './ItemDraftForm'
import { emptyDraft, summarizeItem } from './itemFormConfig'
import type { ActivityType } from '../../db/types'

export function ActivityItemsEditor({
  type,
  items,
  onChange,
}: {
  type: ActivityType
  items: unknown[]
  onChange: (items: unknown[]) => void
}) {
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  function startAdd() {
    setDraft(emptyDraft(type))
    setEditingIndex(null)
  }

  function startEdit(index: number) {
    setDraft({ ...(items[index] as Record<string, unknown>) })
    setEditingIndex(index)
  }

  function saveDraft() {
    if (!draft) return
    if (editingIndex !== null) {
      onChange(items.map((it, i) => (i === editingIndex ? draft : it)))
    } else {
      let next = draft
      if (type === 'timeline') next = { ...draft, order: items.length }
      onChange([...items, next])
    }
    setDraft(null)
    setEditingIndex(null)
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {items.map((item, i) => {
            const { title, subtitle } = summarizeItem(type, item)
            return (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-muted)] px-3 py-2.5">
                <div className="min-w-0 grow">
                  <p className="text-sm font-medium truncate">{title || '(vide)'}</p>
                  {subtitle && <p className="text-xs text-[var(--color-text-muted)] truncate">{subtitle}</p>}
                </div>
                <button onClick={() => startEdit(i)} className="p-1.5 text-[var(--color-text-muted)] shrink-0">
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(i)} className="p-1.5 text-red-500 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {draft ? (
        <div className="rounded-xl bg-[var(--color-surface-muted)]/60 border border-[var(--color-border)] p-3.5 flex flex-col gap-3">
          <ItemDraftForm type={type} draft={draft} onChange={setDraft} />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setDraft(null)
                setEditingIndex(null)
              }}
              className="flex-1 rounded-lg py-2 text-sm font-medium bg-[var(--color-surface-muted)]"
            >
              Annuler
            </button>
            <button onClick={saveDraft} className="flex-1 rounded-lg py-2 text-sm font-medium text-white bg-[var(--color-primary)]">
              {editingIndex !== null ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startAdd}
          className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium bg-[var(--color-surface-muted)] text-[var(--color-primary)]"
        >
          <Plus size={15} /> Ajouter un élément
        </button>
      )}
    </div>
  )
}
