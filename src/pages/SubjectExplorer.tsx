import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronRight,
  Folder as FolderIcon,
  FolderPlus,
  BookOpen,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  FolderInput,
  ArrowUp,
  ArrowDown,
  Settings2,
} from 'lucide-react'
import { db } from '../db/schema'
import {
  createChapter,
  createFolder,
  deleteChapter,
  deleteFolder,
  duplicateChapter,
  moveChapter,
  reorderChapters,
  updateChapter,
  updateFolder,
} from '../db/queries'
import { getBreadcrumb } from '../db/folderTree'
import { TopBar } from '../components/TopBar'
import { SubjectIcon } from '../lib/iconMap'
import { NamePromptSheet } from '../components/NamePromptSheet'
import { ActionSheet } from '../components/ActionSheet'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FolderPickerSheet } from '../components/FolderPickerSheet'
import { EmptyState } from '../components/EmptyState'
import { SubjectFormSheet } from '../components/SubjectFormSheet'
import type { Chapter, Folder } from '../db/types'

export function SubjectExplorer() {
  const { subjectId, folderId } = useParams<{ subjectId: string; folderId?: string }>()
  const navigate = useNavigate()
  const subject = useLiveQuery(() => db.subjects.get(subjectId!), [subjectId])
  const subfolders =
    useLiveQuery(
      () => db.folders.where('subjectId').equals(subjectId!).sortBy('order'),
      [subjectId],
    )?.filter((f) => f.parentFolderId === (folderId ?? null)) ?? []
  const chapters: Chapter[] =
    useLiveQuery(
      () => (folderId ? db.chapters.where('folderId').equals(folderId).sortBy('order') : Promise.resolve<Chapter[]>([])),
      [folderId],
    ) ?? []
  const [breadcrumb, setBreadcrumb] = useState<Folder[]>([])

  useEffect(() => {
    getBreadcrumb(folderId ?? null).then(setBreadcrumb)
  }, [folderId])

  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newChapterOpen, setNewChapterOpen] = useState(false)
  const [editSubjectOpen, setEditSubjectOpen] = useState(false)
  const [folderActionsFor, setFolderActionsFor] = useState<Folder | null>(null)
  const [renameFolderTarget, setRenameFolderTarget] = useState<Folder | null>(null)
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null)
  const [chapterActionsFor, setChapterActionsFor] = useState<Chapter | null>(null)
  const [renameChapterTarget, setRenameChapterTarget] = useState<Chapter | null>(null)
  const [deleteChapterTarget, setDeleteChapterTarget] = useState<Chapter | null>(null)
  const [moveChapterTarget, setMoveChapterTarget] = useState<Chapter | null>(null)

  if (!subject) return null

  async function moveChapterOrder(chapter: Chapter, direction: -1 | 1) {
    const idx = chapters.findIndex((c) => c.id === chapter.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= chapters.length) return
    const ids = chapters.map((c) => c.id)
    ;[ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]]
    await reorderChapters(ids)
  }

  return (
    <div>
      <TopBar title={subject.name} />
      <div className="px-4 sm:px-8 sm:pt-8 max-w-3xl mx-auto">
        <div className="hidden sm:flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: subject.color + '26', color: subject.color }}
            >
              <SubjectIcon name={subject.icon} size={20} />
            </div>
            <h1 className="text-2xl font-bold">{subject.name}</h1>
          </div>
          <button
            onClick={() => setEditSubjectOpen(true)}
            className="p-2 rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
          >
            <Settings2 size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] mb-4 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button onClick={() => navigate(`/library/${subjectId}`)} className="font-medium shrink-0">
            {subject.name}
          </button>
          {breadcrumb.map((f) => (
            <span key={f.id} className="flex items-center gap-1 shrink-0">
              <ChevronRight size={14} />
              <button onClick={() => navigate(`/library/${subjectId}/folder/${f.id}`)} className="font-medium">
                {f.name}
              </button>
            </span>
          ))}
        </div>

        {subfolders.length === 0 && chapters.length === 0 ? (
          <EmptyState
            icon={<FolderIcon size={32} />}
            title="Vide pour l'instant"
            description={
              folderId
                ? 'Ajoute un sous-dossier ou un chapitre.'
                : 'Commence par créer un dossier (ex : Analyse, Grammaire...).'
            }
          />
        ) : (
          <div className="flex flex-col gap-2 pb-4">
            {subfolders.map((f) => (
              <div
                key={f.id}
                onClick={() => navigate(`/library/${subjectId}/folder/${f.id}`)}
                className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-3.5 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] shrink-0">
                  <FolderIcon size={18} />
                </div>
                <p className="font-medium grow truncate">{f.name}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFolderActionsFor(f)
                  }}
                  className="p-2 rounded-full text-[var(--color-text-muted)] shrink-0"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            ))}
            {chapters.map((c, idx) => (
              <div
                key={c.id}
                onClick={() => navigate(`/chapter/${c.id}`)}
                className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-3.5 cursor-pointer"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: subject.color + '26', color: subject.color }}
                >
                  <BookOpen size={17} />
                </div>
                <p className="font-medium grow truncate">{c.name}</p>
                <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => moveChapterOrder(c, -1)}
                    disabled={idx === 0}
                    className="p-1.5 text-[var(--color-text-muted)] disabled:opacity-25"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    onClick={() => moveChapterOrder(c, 1)}
                    disabled={idx === chapters.length - 1}
                    className="p-1.5 text-[var(--color-text-muted)] disabled:opacity-25"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    onClick={() => setChapterActionsFor(c)}
                    className="p-1.5 text-[var(--color-text-muted)]"
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed right-5 bottom-24 sm:bottom-8 z-40 flex flex-col gap-2.5 items-end">
        {folderId && (
          <button
            onClick={() => setNewChapterOpen(true)}
            className="flex items-center gap-2 rounded-full pl-4 pr-5 h-12 bg-[var(--color-surface)] shadow-lg font-medium text-sm active:scale-95"
          >
            <BookOpen size={17} /> Chapitre
          </button>
        )}
        <button
          onClick={() => setNewFolderOpen(true)}
          className="flex items-center gap-2 rounded-full pl-4 pr-5 h-12 bg-[var(--color-primary)] text-white shadow-lg font-medium text-sm active:scale-95"
        >
          <FolderPlus size={18} /> Dossier
        </button>
      </div>

      <NamePromptSheet
        open={newFolderOpen}
        title="Nouveau dossier"
        label="Nom du dossier"
        placeholder="Analyse"
        onClose={() => setNewFolderOpen(false)}
        onSubmit={(name) => createFolder(subjectId!, name, folderId ?? null)}
      />
      <NamePromptSheet
        open={newChapterOpen}
        title="Nouveau chapitre"
        label="Nom du chapitre"
        placeholder="Limites"
        onClose={() => setNewChapterOpen(false)}
        onSubmit={(name) => folderId && createChapter(subjectId!, folderId, name)}
      />

      <SubjectFormSheet
        open={editSubjectOpen}
        initial={subject}
        onClose={() => setEditSubjectOpen(false)}
        onSubmit={({ name, color, icon }) => db.subjects.update(subject.id, { name, color, icon, updatedAt: Date.now() })}
      />

      <ActionSheet
        open={!!folderActionsFor}
        title={folderActionsFor?.name ?? ''}
        onClose={() => setFolderActionsFor(null)}
        actions={
          folderActionsFor
            ? [
                {
                  key: 'rename',
                  label: 'Renommer',
                  icon: <Pencil size={18} />,
                  onSelect: () => setRenameFolderTarget(folderActionsFor),
                },
                {
                  key: 'delete',
                  label: 'Supprimer',
                  icon: <Trash2 size={18} />,
                  danger: true,
                  onSelect: () => setDeleteFolderTarget(folderActionsFor),
                },
              ]
            : []
        }
      />
      <NamePromptSheet
        open={!!renameFolderTarget}
        title="Renommer le dossier"
        label="Nom du dossier"
        initialValue={renameFolderTarget?.name}
        submitLabel="Enregistrer"
        onClose={() => setRenameFolderTarget(null)}
        onSubmit={(name) => renameFolderTarget && updateFolder(renameFolderTarget.id, { name })}
      />
      <ConfirmDialog
        open={!!deleteFolderTarget}
        title="Supprimer le dossier ?"
        description={`"${deleteFolderTarget?.name}" et tout son contenu (sous-dossiers, chapitres, documents) seront supprimés.`}
        confirmLabel="Supprimer"
        danger
        onCancel={() => setDeleteFolderTarget(null)}
        onConfirm={() => {
          if (deleteFolderTarget) deleteFolder(deleteFolderTarget.id)
          setDeleteFolderTarget(null)
        }}
      />

      <ActionSheet
        open={!!chapterActionsFor}
        title={chapterActionsFor?.name ?? ''}
        onClose={() => setChapterActionsFor(null)}
        actions={
          chapterActionsFor
            ? [
                {
                  key: 'rename',
                  label: 'Renommer',
                  icon: <Pencil size={18} />,
                  onSelect: () => setRenameChapterTarget(chapterActionsFor),
                },
                {
                  key: 'duplicate',
                  label: 'Dupliquer',
                  icon: <Copy size={18} />,
                  onSelect: () => duplicateChapter(chapterActionsFor.id),
                },
                {
                  key: 'move',
                  label: 'Déplacer vers...',
                  icon: <FolderInput size={18} />,
                  onSelect: () => setMoveChapterTarget(chapterActionsFor),
                },
                {
                  key: 'delete',
                  label: 'Supprimer',
                  icon: <Trash2 size={18} />,
                  danger: true,
                  onSelect: () => setDeleteChapterTarget(chapterActionsFor),
                },
              ]
            : []
        }
      />
      <NamePromptSheet
        open={!!renameChapterTarget}
        title="Renommer le chapitre"
        label="Nom du chapitre"
        initialValue={renameChapterTarget?.name}
        submitLabel="Enregistrer"
        onClose={() => setRenameChapterTarget(null)}
        onSubmit={(name) => renameChapterTarget && updateChapter(renameChapterTarget.id, { name })}
      />
      {moveChapterTarget && (
        <FolderPickerSheet
          open={!!moveChapterTarget}
          subjectId={subjectId!}
          currentFolderId={moveChapterTarget.folderId}
          onClose={() => setMoveChapterTarget(null)}
          onPick={(targetFolderId) => moveChapter(moveChapterTarget.id, targetFolderId)}
        />
      )}
      <ConfirmDialog
        open={!!deleteChapterTarget}
        title="Supprimer le chapitre ?"
        description={`"${deleteChapterTarget?.name}" et ses documents seront supprimés.`}
        confirmLabel="Supprimer"
        danger
        onCancel={() => setDeleteChapterTarget(null)}
        onConfirm={() => {
          if (deleteChapterTarget) deleteChapter(deleteChapterTarget.id)
          setDeleteChapterTarget(null)
        }}
      />
    </div>
  )
}
