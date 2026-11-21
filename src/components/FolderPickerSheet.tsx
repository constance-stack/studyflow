import { useEffect, useState } from 'react'
import { Folder as FolderIcon } from 'lucide-react'
import { Sheet } from './Sheet'
import { flattenFolders, type FlatFolder } from '../db/folderTree'

export function FolderPickerSheet({
  open,
  subjectId,
  excludeSubtreeRoot,
  currentFolderId,
  onClose,
  onPick,
}: {
  open: boolean
  subjectId: string
  excludeSubtreeRoot?: string
  currentFolderId?: string
  onClose: () => void
  onPick: (folderId: string) => void
}) {
  const [folders, setFolders] = useState<FlatFolder[]>([])

  useEffect(() => {
    if (open) flattenFolders(subjectId, excludeSubtreeRoot).then(setFolders)
  }, [open, subjectId, excludeSubtreeRoot])

  return (
    <Sheet open={open} onClose={onClose} title="Choisir un dossier">
      {folders.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] py-4">Aucun autre dossier disponible.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                onPick(f.id)
                onClose()
              }}
              disabled={f.id === currentFolderId}
              style={{ paddingLeft: `${12 + f.depth * 16}px` }}
              className="flex items-center gap-2.5 py-2.5 pr-3 rounded-xl text-left hover:bg-[var(--color-surface-muted)] disabled:opacity-40"
            >
              <FolderIcon size={16} className="text-[var(--color-text-muted)] shrink-0" />
              <span className="font-medium text-sm truncate">{f.name}</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
