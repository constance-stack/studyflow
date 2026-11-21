import { ArrowLeft, Check, X, TriangleAlert } from 'lucide-react'
import { MathText } from './MathText'
import type { StoredExamAnswer } from '../exam/types'

export function ExamReview({
  title,
  answers,
  totalScore,
  maxScore,
  onClose,
}: {
  title: string
  answers: StoredExamAnswer[]
  totalScore: number
  maxScore: number
  onClose: () => void
}) {
  const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  return (
    <div className="min-h-screen pb-10">
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4 bg-[var(--color-bg)]/95 backdrop-blur"
        style={{ paddingTop: 'calc(var(--safe-top) + 10px)', paddingBottom: '10px' }}
      >
        <button onClick={onClose} className="p-2 -ml-2 rounded-full" aria-label="Retour">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold truncate grow">{title}</h1>
      </header>

      <div className="px-4 sm:px-8 max-w-2xl mx-auto">
        <div className="rounded-2xl bg-[var(--color-surface)] p-6 text-center mb-6">
          <p className="text-4xl font-bold">
            {totalScore}
            <span className="text-xl text-[var(--color-text-muted)]">/{maxScore}</span>
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{pct}%</p>
        </div>

        <div className="flex flex-col gap-3">
          {answers.map((a, i) => {
            const q = a.question
            const isQcm = q.type === 'qcm'
            const full = a.earnedPoints >= q.points
            const zero = a.earnedPoints === 0
            return (
              <div key={i} className="rounded-2xl bg-[var(--color-surface)] p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <MathText text={`${i + 1}. ${q.question}`} className="font-medium text-sm" />
                  <span
                    className={`text-xs font-semibold shrink-0 rounded-full px-2 py-1 ${
                      full
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : zero
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                    }`}
                  >
                    {a.earnedPoints}/{q.points}
                  </span>
                </div>

                {isQcm ? (
                  <div className="flex flex-col gap-1.5 mb-2">
                    {q.choices.map((choice, ci) => {
                      const selected = a.userSelected?.includes(ci)
                      const correct = q.correctIndices.includes(ci)
                      let style = 'text-[var(--color-text-muted)]'
                      if (correct) style = 'text-green-600 dark:text-green-400 font-medium'
                      else if (selected) style = 'text-red-500'
                      return (
                        <div key={ci} className={`flex items-center gap-2 text-sm ${style}`}>
                          {correct ? <Check size={14} /> : selected ? <X size={14} /> : <span className="w-3.5" />}
                          <MathText text={choice} />
                        </div>
                      )
                    })}
                    {q.explanation && <MathText text={q.explanation} className="text-xs text-[var(--color-text-muted)] mt-1 block" />}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 text-sm mb-1">
                    <div className="rounded-lg bg-[var(--color-surface-muted)] p-2.5">
                      <p className="text-xs font-medium text-[var(--color-text-muted)] mb-0.5">Ta réponse</p>
                      <p>{a.userText || <span className="italic text-[var(--color-text-muted)]">Vide</span>}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--color-surface-muted)] p-2.5">
                      <p className="text-xs font-medium text-[var(--color-text-muted)] mb-0.5">Réponse attendue</p>
                      <MathText text={q.expectedAnswer} />
                    </div>
                    {a.feedback && (
                      <p className="text-xs text-[var(--color-text-muted)] px-0.5">{a.feedback}</p>
                    )}
                    {!a.graded && (
                      <p className="flex items-center gap-1.5 text-xs text-orange-500">
                        <TriangleAlert size={12} /> Non corrigée par l'IA — compare toi-même avec la réponse attendue.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
