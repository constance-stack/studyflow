import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sparkles, Loader2, Check, Trash2, Plus } from 'lucide-react'
import { Sheet } from './Sheet'
import { db } from '../db/schema'
import { generateRevisionPlan } from '../ai/generate'
import { deleteRevisionPlanItem, setRevisionPlan, toggleRevisionPlanItem } from '../db/queries'
import { daysBetween, formatDateShort } from '../lib/dates'
import { newId } from '../lib/ids'
import type { Exam, RevisionPlanItem } from '../db/types'

function dateToInputValue(timestamp: number) {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function RevisionPlanSheet({ open, onClose, exam }: { open: boolean; onClose: () => void; exam: Exam }) {
  const chapters = useLiveQuery(() => db.chapters.where('subjectId').equals(exam.subjectId).toArray()) ?? []
  const scopedChapters = exam.chapterIds.length > 0 ? chapters.filter((c) => exam.chapterIds.includes(c.id)) : chapters
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [instructions, setInstructions] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addDescription, setAddDescription] = useState('')
  const [addDate, setAddDate] = useState(() => dateToInputValue(Date.now()))

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const daysRemaining = Math.max(0, daysBetween(Date.now(), exam.date))
      const docs =
        scopedChapters.length > 0
          ? await db.documents.where('chapterId').anyOf(scopedChapters.map((c) => c.id)).toArray()
          : []
      const content = docs
        .map((d) => d.textContent || d.extractedText || '')
        .filter(Boolean)
        .join('\n\n')
        .slice(0, 20000)
      const suggestions = await generateRevisionPlan(
        exam.name,
        daysRemaining,
        scopedChapters.map((c) => c.name),
        content,
        instructions,
      )
      if (suggestions.length === 0) throw new Error("L'IA n'a proposé aucun planning.")
      const items: RevisionPlanItem[] = suggestions.map((s) => ({
        id: newId(),
        date: Date.now() + s.dayOffset * 86400000,
        description: s.description,
        chapterIds: scopedChapters.filter((c) => s.chapterNames.some((n) => c.name.includes(n) || n.includes(c.name))).map((c) => c.id),
        done: false,
      }))
      await setRevisionPlan(exam.id, items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération du planning.')
    } finally {
      setGenerating(false)
    }
  }

  function openAddItem() {
    setAddDescription('')
    setAddDate(dateToInputValue(Date.now()))
    setAddOpen(true)
  }

  function submitAddItem() {
    if (!addDescription.trim()) return
    const item: RevisionPlanItem = {
      id: newId(),
      date: new Date(addDate).getTime(),
      description: addDescription.trim(),
      chapterIds: [],
      done: false,
    }
    setRevisionPlan(exam.id, [...exam.revisionPlan, item])
    setAddOpen(false)
  }

  const sortedPlan = [...exam.revisionPlan].sort((a, b) => a.date - b.date)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Planning de révision"
      footer={
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-medium text-white bg-[var(--color-primary)] disabled:opacity-50"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? 'Génération...' : exam.revisionPlan.length > 0 ? 'Régénérer avec l\'IA' : "Générer avec l'IA"}
        </button>
      }
    >
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      {scopedChapters.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)] mb-3">
          Associe des chapitres à cet examen pour un planning précis par chapitre, ou génère quand même un planning
          générique.
        </p>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">
          Contraintes / préférences (facultatif)
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder='Ex : "30 min par jour max", "rien le week-end", "insiste sur les exercices"...'
          className="w-full min-h-[60px] rounded-xl p-3 bg-[var(--color-surface-muted)] text-sm outline-none resize-none"
        />
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          L'IA s'appuie aussi sur le contenu analysé des documents liés à ces chapitres pour proposer des tâches
          précises, pas seulement les noms de chapitres.
        </p>
      </div>

      {sortedPlan.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">Aucun planning pour l'instant.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-3">
          {sortedPlan.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-xl bg-[var(--color-surface-muted)] p-3">
              <button
                onClick={() => toggleRevisionPlanItem(exam.id, item.id, !item.done)}
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  item.done ? 'bg-green-500 text-white' : 'border-2 border-[var(--color-text-muted)]'
                }`}
              >
                {item.done && <Check size={14} />}
              </button>
              <div className="min-w-0 grow">
                <p className="text-xs text-[var(--color-text-muted)] mb-0.5">{formatDateShort(item.date)}</p>
                <p className={`text-sm ${item.done ? 'line-through text-[var(--color-text-muted)]' : ''}`}>
                  {item.description}
                </p>
              </div>
              <button
                onClick={() => deleteRevisionPlanItem(exam.id, item.id)}
                className="p-1 text-[var(--color-text-muted)] shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={openAddItem}
        className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium"
      >
        <Plus size={15} /> Ajouter une tâche manuellement
      </button>

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Nouvelle tâche de révision"
        footer={
          <button
            onClick={submitAddItem}
            disabled={!addDescription.trim()}
            className="w-full rounded-xl py-3 font-medium text-white bg-[var(--color-primary)] disabled:opacity-40"
          >
            Ajouter
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Tâche</label>
            <input
              autoFocus
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitAddItem()}
              placeholder="Réviser le chapitre 3"
              className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Date</label>
            <input
              type="date"
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>
      </Sheet>
    </Sheet>
  )
}
