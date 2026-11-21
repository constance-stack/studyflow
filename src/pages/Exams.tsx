import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap, Sparkles } from 'lucide-react'
import { db } from '../db/schema'
import { TopBar } from '../components/TopBar'
import { EmptyState } from '../components/EmptyState'
import { getAIConfig } from '../ai/settings'
import { formatDateShort } from '../lib/dates'
import type { ExamSetupConfig } from '../exam/types'
import type { Chapter, ExamAttempt } from '../db/types'

const DIFFICULTIES = ['facile', 'moyen', 'difficile']

export function Exams() {
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state as { subjectId?: string; chapterIds?: string[] } | null

  const aiConfig = useLiveQuery(() => getAIConfig())
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray()) ?? []
  const attempts = useLiveQuery(() => db.examAttempts.orderBy('createdAt').reverse().toArray()) ?? []
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])

  const [subjectId, setSubjectId] = useState('')
  const [chapterIds, setChapterIds] = useState<string[]>([])
  const [examType, setExamType] = useState('Contrôle')
  const [difficulty, setDifficulty] = useState('moyen')
  const [questionCount, setQuestionCount] = useState(6)
  const [barème, setBarème] = useState(20)
  const [durationMinutes, setDurationMinutes] = useState(45)
  const [instructions, setInstructions] = useState('')

  const chapters =
    useLiveQuery(
      () => (subjectId ? db.chapters.where('subjectId').equals(subjectId).toArray() : Promise.resolve<Chapter[]>([])),
      [subjectId],
    ) ?? []

  useEffect(() => {
    if (subjects.length > 0 && !subjectId) setSubjectId(navState?.subjectId ?? subjects[0].id)
    if (navState?.chapterIds) setChapterIds(navState.chapterIds)
  }, [subjects, navState, subjectId])

  function toggleChapter(id: string) {
    setChapterIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  function launch() {
    const subject = subjectMap.get(subjectId)
    const config: ExamSetupConfig = {
      subjectId,
      chapterIds,
      name: examType && subject ? `${examType} — ${subject.name}` : 'Examen blanc',
      examType,
      difficulty,
      questionCount,
      barème,
      durationMinutes,
      instructions,
      examId: null,
    }
    navigate('/exams/take', { state: config })
  }

  return (
    <div>
      <TopBar title="Examens" />
      <div className="px-4 sm:px-8 sm:pt-8 max-w-2xl mx-auto">
        <h1 className="hidden sm:block text-2xl font-bold mb-6">Examens blancs</h1>

        {!aiConfig && (
          <div className="rounded-2xl bg-[var(--color-surface-muted)] p-3.5 mb-5 text-sm text-[var(--color-text-muted)]">
            Configure l'IA (onglet Assistant) pour générer des examens blancs à partir de tes cours.
          </div>
        )}

        {subjects.length === 0 ? (
          <EmptyState
            icon={<GraduationCap size={32} />}
            title="Aucune matière"
            description="Crée une matière avec des documents pour pouvoir générer un examen blanc."
          />
        ) : (
          <div className="rounded-2xl bg-[var(--color-surface)] p-4 flex flex-col gap-4 mb-8">
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

            {chapters.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">
                  Chapitres (aucun = toute la matière)
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
                placeholder="Contrôle, bac blanc..."
                className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-sm outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Questions</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="w-full rounded-xl px-3 py-2 bg-[var(--color-surface-muted)] text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Durée (min)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(5, Math.min(240, Number(e.target.value) || 5)))}
                  className="w-full rounded-xl px-3 py-2 bg-[var(--color-surface-muted)] text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Barème</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={barème}
                  onChange={(e) => setBarème(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-full rounded-xl px-3 py-2 bg-[var(--color-surface-muted)] text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Difficulté</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                      difficulty === d ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">
                Instructions (facultatif)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder='Ex : "privilégie les exercices de calcul"'
                className="w-full min-h-[60px] rounded-xl p-3 bg-[var(--color-surface-muted)] text-sm outline-none resize-none"
              />
            </div>

            <button
              onClick={launch}
              disabled={!aiConfig || !subjectId}
              className="flex items-center justify-center gap-2 rounded-xl py-3 font-medium text-white bg-[var(--color-primary)] disabled:opacity-40"
            >
              <Sparkles size={16} /> Générer l'examen
            </button>
          </div>
        )}

        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          Historique
        </p>
        {attempts.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] pb-8">Aucun examen blanc passé pour l'instant.</p>
        ) : (
          <div className="flex flex-col gap-2 pb-8">
            {attempts.map((a: ExamAttempt) => {
              const subject = subjectMap.get(a.subjectId)
              const pct = a.maxScore ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/exams/review/${a.id}`)}
                  className="w-full flex items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-3.5 text-left"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                    style={{ backgroundColor: (subject?.color ?? '#999') + '26', color: subject?.color ?? '#999' }}
                  >
                    {a.score}/{a.maxScore}
                  </div>
                  <div className="min-w-0 grow">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {subject?.name} · {formatDateShort(a.createdAt)} · {pct}%
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
