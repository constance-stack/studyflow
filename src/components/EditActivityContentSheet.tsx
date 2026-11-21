import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { ActivityItemsEditor } from './manual/ActivityItemsEditor'
import { contentToFlatItems, flatItemsToContent } from './manual/contentShape'
import { updateActivityContent, updateActivityTitle } from '../db/queries'
import type { Activity } from '../db/types'

export function EditActivityContentSheet({
  open,
  onClose,
  activity,
}: {
  open: boolean
  onClose: () => void
  activity: Activity | null
}) {
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<unknown[]>([])

  useEffect(() => {
    if (open && activity) {
      setTitle(activity.title)
      setItems(contentToFlatItems(activity.type, activity.content))
    }
  }, [open, activity])

  async function handleSave() {
    if (!activity) return
    await updateActivityTitle(activity.id, title.trim() || activity.title)
    await updateActivityContent(activity.id, flatItemsToContent(activity.type, items))
    onClose()
  }

  if (!activity) return null

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Modifier le contenu"
      footer={
        <button
          onClick={handleSave}
          disabled={items.length === 0}
          className="w-full rounded-xl py-3 font-medium text-white bg-[var(--color-primary)] disabled:opacity-40"
        >
          Enregistrer
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Titre</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <ActivityItemsEditor type={activity.type} items={items} onChange={setItems} />
      </div>
    </Sheet>
  )
}
