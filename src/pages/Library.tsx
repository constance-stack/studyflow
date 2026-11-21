import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Plus, MoreVertical, Pencil, Copy, Archive, ArchiveRestore, Trash2, Library as LibraryIcon } from 'lucide-react'
import { db } from '../db/schema'
import { archiveSubject, createSubject, deleteSubject, duplicateSubject, getSubjectStats, updateSubject } from '../db/queries'
import { TopBar } from '../components/TopBar'
import { SubjectIcon } from '../lib/iconMap'
import { SubjectFormSheet } from '../components/SubjectFormSheet'
import { ActionSheet } from '../components/ActionSheet'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import type { Subject } from '../db/types'

function SubjectStatsRow({ subjectId }: { subjectId: string }) {
  const stats = useLiveQuery(() => getSubjectStats(subjectId), [subjectId])
  if (!stats) return null
  return (
    <p className="text-xs text-[var(--color-text-muted)]">
      {stats.chapters} chapitre{stats.chapters === 1 ? '' : 's'} · {stats.documents} document
      {stats.documents === 1 ? '' : 's'}
    </p>
  )
}

export function Library() {
  const navigate = useNavigate()
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray()) ?? []
  const [showArchived, setShowArchived] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [actionsFor, setActionsFor] = useState<Subject | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Subject | null>(null)

  const visible = subjects.filter((s) => s.archived === showArchived)

  return (
    <div>
      <TopBar title="Mes cours" />
      <div className="px-4 sm:px-8 sm:pt-8 max-w-3xl mx-auto">
        <div className="hidden sm:flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Mes cours</h1>
          <button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 bg-[var(--color-primary)] text-white font-medium text-sm"
          >
            <Plus size={16} /> Nouvelle matière
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${
              !showArchived ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
            }`}
          >
            Actives
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${
              showArchived ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
            }`}
          >
            Archivées
          </button>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={<LibraryIcon size={32} />}
            title={showArchived ? 'Aucune matière archivée' : 'Aucune matière'}
            description={!showArchived ? 'Crée une matière pour commencer à organiser tes cours.' : undefined}
            action={
              !showArchived && (
                <button
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                  className="rounded-xl px-5 py-2.5 bg-[var(--color-primary)] text-white font-medium text-sm"
                >
                  Créer une matière
                </button>
              )
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5 pb-4">
            {visible.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-3.5 cursor-pointer"
                onClick={() => navigate(`/library/${s.id}`)}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: s.color + '26', color: s.color }}
                >
                  <SubjectIcon name={s.icon} size={20} />
                </div>
                <div className="min-w-0 grow">
                  <p className="font-medium truncate">{s.name}</p>
                  <SubjectStatsRow subjectId={s.id} />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActionsFor(s)
                  }}
                  className="p-2 rounded-full text-[var(--color-text-muted)] shrink-0"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          setEditing(null)
          setFormOpen(true)
        }}
        className="sm:hidden fixed right-5 bottom-24 z-40 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg active:scale-95"
        aria-label="Nouvelle matière"
      >
        <Plus size={24} />
      </button>

      <SubjectFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSubmit={({ name, color, icon }) => {
          if (editing) updateSubject(editing.id, { name, color, icon })
          else createSubject(name, color, icon)
        }}
      />

      <ActionSheet
        open={!!actionsFor}
        title={actionsFor?.name ?? ''}
        onClose={() => setActionsFor(null)}
        actions={
          actionsFor
            ? [
                {
                  key: 'edit',
                  label: 'Modifier',
                  icon: <Pencil size={18} />,
                  onSelect: () => {
                    setEditing(actionsFor)
                    setFormOpen(true)
                  },
                },
                {
                  key: 'duplicate',
                  label: 'Dupliquer',
                  icon: <Copy size={18} />,
                  onSelect: () => duplicateSubject(actionsFor.id),
                },
                {
                  key: 'archive',
                  label: actionsFor.archived ? 'Désarchiver' : 'Archiver',
                  icon: actionsFor.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />,
                  onSelect: () => archiveSubject(actionsFor.id, !actionsFor.archived),
                },
                {
                  key: 'delete',
                  label: 'Supprimer',
                  icon: <Trash2 size={18} />,
                  danger: true,
                  onSelect: () => setConfirmDelete(actionsFor),
                },
              ]
            : []
        }
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer la matière ?"
        description={`"${confirmDelete?.name}" et tous ses dossiers, chapitres et documents seront définitivement supprimés.`}
        confirmLabel="Supprimer"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) deleteSubject(confirmDelete.id)
          setConfirmDelete(null)
        }}
      />
    </div>
  )
}
