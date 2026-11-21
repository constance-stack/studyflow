import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from './Sheet'
import { db } from '../db/schema'
import { combineDateTime, toDateInputValue, toTimeInputValue } from '../lib/dates'
import type { Chapter, Exam } from '../db/types'

const IMPORTANCE_OPTIONS: { value: Exam['importance']; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
]

export interface ExamFormValues {
  subjectId: string
  name: string
  date: number
  chapterIds: string[]
  examType: string
  importance: Exam['importance']
  goalGrade: string
  notes: string
}

export function ExamFormSheet({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (values: ExamFormValues) => void
  initial?: Exam | null
}) {
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray()) ?? []
  const [subjectId, setSubjectId] = useState('')
  const [name, setName] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [timeStr, setTimeStr] = useState('09:00')
  const [chapterIds, setChapterIds] = useState<string[]>([])
  const [examType, setExamType] = useState('')
  const [importance, setImportance] = useState<Exam['importance']>('medium')
  const [goalGrade, setGoalGrade] = useState('')
  const [notes, setNotes] = useState('')

  const chapters =
    useLiveQuery(
      () => (subjectId ? db.chapters.where('subjectId').equals(subjectId).toArray() : Promise.resolve<Chapter[]>([])),
      [subjectId],
    ) ?? []

  useEffect(() => {
    if (!open) return
    const now = Date.now()
    setSubjectId(initial?.subjectId ?? subjects[0]?.id ?? '')
    setName(initial?.name ?? '')
    setDateStr(toDateInputValue(initial?.date ?? now + 7 * 86400000))
    setTimeStr(toTimeInputValue(initial?.date ?? now))
    setChapterIds(initial?.chapterIds ?? [])
    setExamType(initial?.examType ?? '')
    setImportance(initial?.importance ?? 'medium')
    setGoalGrade(initial?.goalGrade ?? '')
    setNotes(initial?.notes ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  function toggleChapter(id: string) {
    setChapterIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  function handleSubmit() {
    if (!subjectId || !name.trim()) return
    onSubmit({
      subjectId,
      name: name.trim(),
      date: combineDateTime(dateStr, timeStr),
      chapterIds,
      examType: examType.trim(),
      importance,
      goalGrade: goalGrade.trim(),
      notes: notes.trim(),
    })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? "Modifier l'examen" : 'Nouvel examen'}
      footer={
        <button
          onClick={handleSubmit}
          disabled={!subjectId || !name.trim()}
          className="w-full rounded-xl py-3 font-medium text-white bg-[var(--color-primary)] disabled:opacity-40"
        >
          {initial ? 'Enregistrer' : "Ajouter à l'agenda"}
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Matière</label>
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value)
              setChapterIds([])
            }}
            className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-sm outline-none"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Nom de l'examen</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contrôle intégrales et probabilités"
            className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Date</label>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-sm outline-none"
            />
          </div>
          <div className="w-28">
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Heure</label>
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-sm outline-none"
            />
          </div>
        </div>

        {chapters.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">
              Chapitres concernés
            </label>
            <div className="flex flex-wrap gap-1.5">
              {chapters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleChapter(c.id)}
                  className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                    chapterIds.includes(c.id) ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Type d'épreuve</label>
          <input
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            placeholder="Contrôle, bac blanc, oral..."
            className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Importance</label>
          <div className="flex gap-2">
            {IMPORTANCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setImportance(opt.value)}
                className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                  importance === opt.value ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">
            Objectif de note (facultatif)
          </label>
          <input
            value={goalGrade}
            onChange={(e) => setGoalGrade(e.target.value)}
            placeholder="16/20"
            className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">
            Notes (facultatif)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[70px] rounded-xl p-3.5 bg-[var(--color-surface-muted)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
          />
        </div>
      </div>
    </Sheet>
  )
}
