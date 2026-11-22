import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Upload,
  FileText,
  Image as ImageIcon,
  StickyNote,
  MoreVertical,
  Pencil,
  Trash2,
  Bot,
  Sparkles,
  Layers,
  ListChecks,
  Lightbulb,
  MessageCircleQuestion,
  Star,
  CheckCircle2,
  SquareDashedBottom,
  Shuffle,
  Languages,
  History,
  MessageSquareQuote,
  Calculator,
  PenSquare,
  FileSpreadsheet,
  Zap,
  Play,
  Archive,
  Plus,
  Loader2,
} from 'lucide-react'
import { db } from '../db/schema'
import {
  createDocument,
  deleteActivity,
  deleteDocument,
  deleteRevisionSheet,
  toggleActivityArchived,
  toggleActivityFavorite,
  updateChapter,
  updateDocument,
} from '../db/queries'
import { TopBar } from '../components/TopBar'
import { ActionSheet } from '../components/ActionSheet'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { NamePromptSheet } from '../components/NamePromptSheet'
import { EmptyState } from '../components/EmptyState'
import { Sheet } from '../components/Sheet'
import { GenerateActivitySheet } from '../components/GenerateActivitySheet'
import { ManualActivitySheet } from '../components/ManualActivitySheet'
import { EditActivityContentSheet } from '../components/EditActivityContentSheet'
import { GenerateRevisionSheetSheet } from '../components/GenerateRevisionSheetSheet'
import { ActivityPreview } from '../components/ActivityPreview'
import { getAIConfig } from '../ai/settings'
import { getCardStatesForActivities } from '../srs/cardState'
import { buildDeck } from '../srs/deck'
import type { Activity, DocumentRecord, RevisionSheet } from '../db/types'
import type { SessionConfig } from './StudySession'

function docIcon(type: DocumentRecord['type']) {
  if (type === 'pdf') return <FileText size={18} />
  if (type === 'image') return <ImageIcon size={18} />
  return <StickyNote size={18} />
}

function activityIcon(type: Activity['type']) {
  switch (type) {
    case 'flashcard':
      return <Layers size={18} />
    case 'qcm':
      return <ListChecks size={18} />
    case 'open':
      return <MessageCircleQuestion size={18} />
    case 'truefalse':
      return <CheckCircle2 size={18} />
    case 'blank':
      return <SquareDashedBottom size={18} />
    case 'match':
      return <Shuffle size={18} />
    case 'vocab':
      return <Languages size={18} />
    case 'timeline':
      return <History size={18} />
    case 'reflection':
      return <MessageSquareQuote size={18} />
    case 'miniexercise':
    case 'exercise':
      return <Calculator size={18} />
    default:
      return <Lightbulb size={18} />
  }
}

function activityItemCount(activity: Activity): number {
  if (!Array.isArray(activity.content)) return 0
  if (activity.type === 'match') return (activity.content[0] as { pairs?: unknown[] })?.pairs?.length ?? 0
  if (activity.type === 'timeline') return (activity.content[0] as { events?: unknown[] })?.events?.length ?? 0
  return activity.content.length
}

export function ChapterView() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const chapter = useLiveQuery(() => db.chapters.get(chapterId!), [chapterId])
  const subject = useLiveQuery(() => (chapter ? db.subjects.get(chapter.subjectId) : undefined), [chapter])
  const documents = useLiveQuery(() => db.documents.where('chapterId').equals(chapterId!).sortBy('order'), [chapterId]) ?? []
  const activities =
    useLiveQuery(
      () => db.activities.where('chapterIds').equals(chapterId!).sortBy('createdAt').then((a) => a.reverse()),
      [chapterId],
    ) ?? []
  const aiConfig = useLiveQuery(() => getAIConfig())
  const sheets =
    useLiveQuery(() => db.revisionSheets.where('chapterIds').equals(chapterId!).sortBy('createdAt'), [chapterId]) ?? []

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [docActionsFor, setDocActionsFor] = useState<DocumentRecord | null>(null)
  const [renameDocTarget, setRenameDocTarget] = useState<DocumentRecord | null>(null)
  const [deleteDocTarget, setDeleteDocTarget] = useState<DocumentRecord | null>(null)
  const [importing, setImporting] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [fabMenuOpen, setFabMenuOpen] = useState(false)
  const [previewActivity, setPreviewActivity] = useState<Activity | null>(null)
  const [activityActionsFor, setActivityActionsFor] = useState<Activity | null>(null)
  const [deleteActivityTarget, setDeleteActivityTarget] = useState<Activity | null>(null)
  const [editContentActivity, setEditContentActivity] = useState<Activity | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteSheetTarget, setDeleteSheetTarget] = useState<RevisionSheet | null>(null)

  if (!chapter || !subject) return null

  async function launchRevision(forActivities: Activity[], title: string) {
    const states = await getCardStatesForActivities(forActivities.map((a) => a.id))
    const deck = buildDeck(forActivities, 'all', states)
    if (deck.length === 0) return
    const config: SessionConfig = {
      activityIds: forActivities.map((a) => a.id),
      filter: 'all',
      untilMastered: false,
      title,
    }
    navigate('/review/session', { state: config })
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setImporting(true)
    try {
      for (const file of Array.from(files)) {
        const type: DocumentRecord['type'] = file.type === 'application/pdf' ? 'pdf' : 'image'
        await createDocument({
          chapterId: chapter!.id,
          subjectId: subject!.id,
          name: file.name,
          type,
          mimeType: file.type,
          blob: file,
        })
      }
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <TopBar title={chapter.name} />
      <div className="px-4 sm:px-8 sm:pt-8 max-w-3xl mx-auto">
        <div className="hidden sm:flex items-center justify-between mb-5">
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">{subject.name}</p>
            <h1 className="text-2xl font-bold">{chapter.name}</h1>
          </div>
          <button
            onClick={() => setRenameOpen(true)}
            className="p-2 rounded-xl text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
          >
            <Pencil size={18} />
          </button>
        </div>

        {!aiConfig && (
          <div className="rounded-2xl bg-[var(--color-surface-muted)] p-3.5 mb-5 flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <Bot size={18} className="shrink-0" />
            <span>
              Configure l'IA (gratuite) dans l'onglet Assistant pour analyser tes documents et générer des
              flashcards, QCM ou mini-leçons.
            </span>
          </div>
        )}

        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          Documents
        </p>
        {documents.length === 0 ? (
          <EmptyState
            icon={<Upload size={32} />}
            title="Aucun document"
            description="Importe un PDF, une photo de cours ou crée une note."
          />
        ) : (
          <div className="flex flex-col gap-2 pb-6">
            {documents.map((d) => (
              <div
                key={d.id}
                onClick={() => navigate(`/document/${d.id}`)}
                className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-3.5 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] shrink-0">
                  {docIcon(d.type)}
                </div>
                <div className="min-w-0 grow">
                  <p className="font-medium truncate">{d.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {d.type === 'pdf' ? 'PDF' : d.type === 'image' ? 'Image' : 'Note'} ·{' '}
                    {(d.size / 1024).toFixed(0)} Ko
                    {d.extractedText ? ' · analysé' : ''}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDocActionsFor(d)
                  }}
                  className="p-2 rounded-full text-[var(--color-text-muted)] shrink-0"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Activités générées
          </p>
          {activities.some((a) => !a.archived) && (
            <button
              onClick={() => launchRevision(activities.filter((a) => !a.archived), `Réviser — ${chapter.name}`)}
              className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)]"
            >
              <Zap size={13} /> Réviser ce chapitre
            </button>
          )}
        </div>
        {activities.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={32} />}
            title="Aucune activité"
            description="Génère une activité avec l'IA à partir de ce chapitre, ou crée-la toi-même sans IA."
          />
        ) : (
          <div className="flex flex-col gap-2 pb-4">
            {activities.map((a) => (
              <div
                key={a.id}
                onClick={() => setPreviewActivity(a)}
                className={`flex items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-3.5 cursor-pointer ${
                  a.archived ? 'opacity-50' : ''
                }`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: subject.color + '26', color: subject.color }}
                >
                  {activityIcon(a.type)}
                </div>
                <div className="min-w-0 grow">
                  <p className="font-medium truncate">{a.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {activityItemCount(a)} élément(s){a.archived ? ' · Archivé' : ''}
                  </p>
                </div>
                {a.favorite && <Star size={16} className="text-yellow-500 fill-yellow-500 shrink-0" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    launchRevision([a], a.title)
                  }}
                  className="p-2 rounded-full text-[var(--color-primary)] shrink-0"
                  aria-label="Réviser"
                >
                  <Play size={17} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActivityActionsFor(a)
                  }}
                  className="p-2 rounded-full text-[var(--color-text-muted)] shrink-0"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Fiches de révision
          </p>
          <button
            onClick={() => (aiConfig ? setSheetOpen(true) : navigate('/assistant'))}
            className="text-xs font-medium text-[var(--color-primary)]"
          >
            + Nouvelle fiche
          </button>
        </div>
        {sheets.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] pb-4">Aucune fiche pour ce chapitre.</p>
        ) : (
          <div className="flex flex-col gap-2 pb-4">
            {sheets.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/fiche/${s.id}`)}
                className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-3.5 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] shrink-0">
                  <FileSpreadsheet size={17} />
                </div>
                <div className="min-w-0 grow">
                  <p className="font-medium truncate">{s.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{s.sections.length} section(s)</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteSheetTarget(s)
                  }}
                  className="p-2 rounded-full text-[var(--color-text-muted)] shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <button
        onClick={() => setFabMenuOpen(true)}
        disabled={importing}
        className="fixed right-5 bottom-24 sm:bottom-8 z-40 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center active:scale-95 disabled:opacity-60"
        aria-label="Ajouter"
      >
        {importing ? <Loader2 size={22} className="animate-spin" /> : <Plus size={24} />}
      </button>

      <ActionSheet
        open={fabMenuOpen}
        title="Ajouter"
        onClose={() => setFabMenuOpen(false)}
        actions={[
          {
            key: 'generate',
            label: 'Générer avec l\'IA',
            icon: <Sparkles size={18} />,
            onSelect: () => (aiConfig ? setGenerateOpen(true) : navigate('/assistant')),
          },
          {
            key: 'create',
            label: 'Créer manuellement',
            icon: <PenSquare size={18} />,
            onSelect: () => setManualOpen(true),
          },
          {
            key: 'note',
            label: 'Nouvelle note',
            icon: <StickyNote size={18} />,
            onSelect: () => setNoteOpen(true),
          },
          {
            key: 'import',
            label: 'Importer un document',
            icon: <Upload size={18} />,
            onSelect: () => fileInputRef.current?.click(),
          },
        ]}
      />

      <NamePromptSheet
        open={noteOpen}
        title="Nouvelle note"
        label="Titre de la note"
        placeholder="Résumé du chapitre"
        onClose={() => setNoteOpen(false)}
        onSubmit={(name) =>
          createDocument({
            chapterId: chapter.id,
            subjectId: subject.id,
            name,
            type: 'note',
            mimeType: 'text/plain',
            textContent: '',
          }).then((doc) => navigate(`/document/${doc.id}`))
        }
      />
      <NamePromptSheet
        open={renameOpen}
        title="Renommer le chapitre"
        label="Nom du chapitre"
        initialValue={chapter.name}
        submitLabel="Enregistrer"
        onClose={() => setRenameOpen(false)}
        onSubmit={(name) => updateChapter(chapter.id, { name })}
      />

      <GenerateActivitySheet
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        chapterId={chapter.id}
        subjectId={subject.id}
        chapterName={chapter.name}
        onGenerated={() => {}}
      />
      <ManualActivitySheet
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        chapterId={chapter.id}
        subjectId={subject.id}
        onCreated={() => {}}
      />
      <EditActivityContentSheet
        open={!!editContentActivity}
        onClose={() => setEditContentActivity(null)}
        activity={editContentActivity}
      />
      <GenerateRevisionSheetSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        chapterId={chapter.id}
        subjectId={subject.id}
      />
      <ConfirmDialog
        open={!!deleteSheetTarget}
        title="Supprimer cette fiche ?"
        description={`"${deleteSheetTarget?.title}" sera définitivement supprimée.`}
        confirmLabel="Supprimer"
        danger
        onCancel={() => setDeleteSheetTarget(null)}
        onConfirm={() => {
          if (deleteSheetTarget) deleteRevisionSheet(deleteSheetTarget.id)
          setDeleteSheetTarget(null)
        }}
      />

      <Sheet
        open={!!previewActivity}
        onClose={() => setPreviewActivity(null)}
        title={previewActivity?.title ?? ''}
        footer={
          previewActivity && (
            <button
              onClick={() => {
                const a = previewActivity
                setPreviewActivity(null)
                launchRevision([a], a.title)
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-medium text-white bg-[var(--color-primary)]"
            >
              <Zap size={16} /> Réviser
            </button>
          )
        }
      >
        {previewActivity && <ActivityPreview activity={previewActivity} />}
      </Sheet>

      <ActionSheet
        open={!!activityActionsFor}
        title={activityActionsFor?.title ?? ''}
        onClose={() => setActivityActionsFor(null)}
        actions={
          activityActionsFor
            ? [
                {
                  key: 'favorite',
                  label: activityActionsFor.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris',
                  icon: <Star size={18} />,
                  onSelect: () => toggleActivityFavorite(activityActionsFor.id, !activityActionsFor.favorite),
                },
                {
                  key: 'edit-content',
                  label: 'Modifier le contenu',
                  icon: <PenSquare size={18} />,
                  onSelect: () => setEditContentActivity(activityActionsFor),
                },
                {
                  key: 'archive',
                  label: activityActionsFor.archived
                    ? 'Désarchiver (inclure dans les révisions)'
                    : 'Archiver (exclure des révisions aléatoires)',
                  icon: <Archive size={18} />,
                  onSelect: () => toggleActivityArchived(activityActionsFor.id, !activityActionsFor.archived),
                },
                {
                  key: 'delete',
                  label: 'Supprimer',
                  icon: <Trash2 size={18} />,
                  danger: true,
                  onSelect: () => setDeleteActivityTarget(activityActionsFor),
                },
              ]
            : []
        }
      />
      <ConfirmDialog
        open={!!deleteActivityTarget}
        title="Supprimer cette activité ?"
        description={`"${deleteActivityTarget?.title}" sera définitivement supprimée.`}
        confirmLabel="Supprimer"
        danger
        onCancel={() => setDeleteActivityTarget(null)}
        onConfirm={() => {
          if (deleteActivityTarget) deleteActivity(deleteActivityTarget.id)
          setDeleteActivityTarget(null)
        }}
      />

      <ActionSheet
        open={!!docActionsFor}
        title={docActionsFor?.name ?? ''}
        onClose={() => setDocActionsFor(null)}
        actions={
          docActionsFor
            ? [
                {
                  key: 'rename',
                  label: 'Renommer',
                  icon: <Pencil size={18} />,
                  onSelect: () => setRenameDocTarget(docActionsFor),
                },
                {
                  key: 'delete',
                  label: 'Supprimer',
                  icon: <Trash2 size={18} />,
                  danger: true,
                  onSelect: () => setDeleteDocTarget(docActionsFor),
                },
              ]
            : []
        }
      />
      <NamePromptSheet
        open={!!renameDocTarget}
        title="Renommer le document"
        label="Nom"
        initialValue={renameDocTarget?.name}
        submitLabel="Enregistrer"
        onClose={() => setRenameDocTarget(null)}
        onSubmit={(name) => renameDocTarget && updateDocument(renameDocTarget.id, { name })}
      />
      <ConfirmDialog
        open={!!deleteDocTarget}
        title="Supprimer le document ?"
        description={`"${deleteDocTarget?.name}" sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        danger
        onCancel={() => setDeleteDocTarget(null)}
        onConfirm={() => {
          if (deleteDocTarget) deleteDocument(deleteDocTarget.id)
          setDeleteDocTarget(null)
        }}
      />
    </div>
  )
}
