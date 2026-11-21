import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2, Timer, X, Check } from 'lucide-react'
import { generateMockExam, gradeExamOpenQuestion, type MockExamQuestion } from '../ai/generate'
import { createExamAttempt } from '../db/queries'
import { getActiveProvider } from '../ai/client'
import { db } from '../db/schema'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ExamReview } from '../components/ExamReview'
import { DictateButton } from '../components/DictateButton'
import { MathText } from '../components/MathText'
import type { ExamSetupConfig, StoredExamAnswer } from '../exam/types'

function formatClock(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60)
  const s = Math.max(0, seconds) % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ExamTaking() {
  const location = useLocation()
  const navigate = useNavigate()
  const config = location.state as ExamSetupConfig | null

  const [phase, setPhase] = useState<'generating' | 'taking' | 'grading' | 'results'>('generating')
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<MockExamQuestion[]>([])
  const [qcmAnswers, setQcmAnswers] = useState<Record<number, Set<number>>>({})
  const [openAnswers, setOpenAnswers] = useState<Record<number, string>>({})
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [exitConfirm, setExitConfirm] = useState(false)
  const [result, setResult] = useState<StoredExamAnswer[]>([])
  const startedAtRef = useRef(0)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!config || initializedRef.current) return
    initializedRef.current = true

    ;(async () => {
      try {
        const chapterIds = config.chapterIds.length > 0 ? config.chapterIds : (await db.chapters.where('subjectId').equals(config.subjectId).toArray()).map((c) => c.id)
        const docs = (
          await Promise.all(chapterIds.map((id) => db.documents.where('chapterId').equals(id).toArray()))
        ).flat()
        const content = docs
          .map((d) => d.textContent || d.extractedText || '')
          .filter(Boolean)
          .join('\n\n')
          .slice(0, 20000)

        if (!content.trim()) {
          throw new Error(
            "Aucun contenu disponible pour cette matière/ces chapitres. Importe et analyse des documents d'abord.",
          )
        }

        const qs = await generateMockExam({
          content,
          examType: config.examType,
          questionCount: config.questionCount,
          difficulty: config.difficulty,
          barème: config.barème,
          durationMinutes: config.durationMinutes,
          instructions: config.instructions,
        })
        setQuestions(qs)
        setRemainingSeconds(config.durationMinutes * 60)
        startedAtRef.current = Date.now()
        setPhase('taking')
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur lors de la génération de l'examen.")
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  useEffect(() => {
    if (phase !== 'taking') return
    const interval = setInterval(() => {
      setRemainingSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval)
          handleSubmit()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function toggleQcmChoice(qIndex: number, choiceIndex: number, multiple: boolean) {
    setQcmAnswers((prev) => {
      const next = { ...prev }
      const current = new Set(multiple ? prev[qIndex] : [])
      if (current.has(choiceIndex)) current.delete(choiceIndex)
      else current.add(choiceIndex)
      next[qIndex] = current
      return next
    })
  }

  async function handleSubmit() {
    if (phase !== 'taking') return
    setPhase('grading')
    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000)
    const provider = await getActiveProvider()

    const graded: StoredExamAnswer[] = []
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (q.type === 'qcm') {
        const selected = [...(qcmAnswers[i] ?? [])]
        const correct = new Set(q.correctIndices)
        const exact = correct.size === selected.length && selected.every((s) => correct.has(s))
        const partialCorrectCount = selected.filter((s) => correct.has(s)).length
        const hasWrong = selected.some((s) => !correct.has(s))
        const earnedPoints = exact ? q.points : hasWrong ? 0 : Math.round((partialCorrectCount / correct.size) * q.points)
        graded.push({ question: q, userSelected: selected, userText: null, earnedPoints, feedback: null, graded: true })
      } else {
        const userText = openAnswers[i] ?? ''
        if (provider) {
          try {
            const { score, feedback } = await gradeExamOpenQuestion(q.question, q.expectedAnswer, userText, q.points)
            graded.push({ question: q, userSelected: null, userText, earnedPoints: score, feedback, graded: true })
          } catch {
            graded.push({ question: q, userSelected: null, userText, earnedPoints: 0, feedback: null, graded: false })
          }
        } else {
          graded.push({ question: q, userSelected: null, userText, earnedPoints: 0, feedback: null, graded: false })
        }
      }
    }

    const totalScore = graded.reduce((sum, a) => sum + a.earnedPoints, 0)
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0)

    await createExamAttempt({
      examId: config!.examId,
      subjectId: config!.subjectId,
      title: config!.name,
      durationSeconds,
      score: totalScore,
      maxScore,
      answers: { config, answers: graded, totalScore, maxScore, durationSeconds },
    })

    setResult(graded)
    setPhase('results')
  }

  if (!config) {
    navigate('/exams', { replace: true })
    return null
  }

  if (phase === 'generating') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <p className="font-medium">Génération de l'examen en cours...</p>
        {error && (
          <>
            <p className="text-sm text-red-500 max-w-sm">{error}</p>
            <button onClick={() => navigate('/exams')} className="text-sm text-[var(--color-primary)] font-medium">
              Retour
            </button>
          </>
        )}
      </div>
    )
  }

  if (phase === 'grading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        <p className="font-medium">Correction en cours...</p>
      </div>
    )
  }

  if (phase === 'results') {
    const totalScore = result.reduce((sum, a) => sum + a.earnedPoints, 0)
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0)
    return (
      <ExamReview
        title={config.name}
        answers={result}
        totalScore={totalScore}
        maxScore={maxScore}
        onClose={() => navigate('/exams')}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-8 py-4" style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}>
      <div className="flex items-center justify-between mb-5 max-w-2xl w-full mx-auto">
        <button onClick={() => setExitConfirm(true)} className="p-1.5 -ml-1.5 rounded-full">
          <X size={20} />
        </button>
        <div
          className={`flex items-center gap-1.5 font-semibold text-sm ${
            remainingSeconds < 60 ? 'text-red-500' : 'text-[var(--color-text)]'
          }`}
        >
          <Timer size={16} /> {formatClock(remainingSeconds)}
        </div>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto pb-6">
        {questions.map((q, i) => (
          <div key={i} className="rounded-2xl bg-[var(--color-surface)] p-4 mb-3.5">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-1.5">
              Question {i + 1} · {q.points} pt{q.points > 1 ? 's' : ''}
            </p>
            <MathText text={q.question} className="font-medium mb-3 block" />
            {q.type === 'qcm' ? (
              <div className="flex flex-col gap-2">
                {q.choices.map((choice, ci) => {
                  const selected = qcmAnswers[i]?.has(ci) ?? false
                  return (
                    <button
                      key={ci}
                      onClick={() => toggleQcmChoice(i, ci, q.correctIndices.length > 1)}
                      className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm ${
                        selected ? 'bg-[var(--color-primary)]/15 ring-2 ring-[var(--color-primary)]' : 'bg-[var(--color-surface-muted)]'
                      }`}
                    >
                      {selected && <Check size={14} className="shrink-0" />}
                      <MathText text={choice} />
                    </button>
                  )
                })}
              </div>
            ) : (
              <>
                <textarea
                  value={openAnswers[i] ?? ''}
                  onChange={(e) => setOpenAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                  placeholder="Ta réponse..."
                  className="w-full min-h-[18vh] rounded-xl p-3 bg-[var(--color-surface-muted)] text-sm outline-none resize-none mb-2"
                />
                <DictateButton
                  onResult={(t) =>
                    setOpenAnswers((prev) => ({ ...prev, [i]: prev[i] ? `${prev[i]} ${t}` : t }))
                  }
                />
              </>
            )}
          </div>
        ))}

        <button
          onClick={handleSubmit}
          className="w-full rounded-xl py-3.5 font-medium text-white bg-[var(--color-primary)] mt-2"
        >
          Rendre la copie
        </button>
      </div>

      <ConfirmDialog
        open={exitConfirm}
        title="Quitter l'examen ?"
        description="Ta copie ne sera pas enregistrée si tu quittes maintenant."
        confirmLabel="Quitter"
        danger
        onCancel={() => setExitConfirm(false)}
        onConfirm={() => navigate('/exams')}
      />
    </div>
  )
}
