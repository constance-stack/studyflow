import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Loader2, Lightbulb, Sparkles } from 'lucide-react'
import { MasteryButtons } from './MasteryButtons'
import { MathText } from '../MathText'
import { DictateButton } from '../DictateButton'
import type { OpenQuestionItem, GradeResult } from '../../ai/generate'
import { gradeOpenAnswer } from '../../ai/generate'
import { getAIConfig } from '../../ai/settings'
import type { MasteryLevel } from '../../db/types'

export function OpenQuestionPlayer({
  question,
  onRate,
}: {
  question: OpenQuestionItem
  onRate: (rating: MasteryLevel) => void
}) {
  const aiConfig = useLiveQuery(() => getAIConfig())
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)
  const [grading, setGrading] = useState(false)
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null)
  const [gradeError, setGradeError] = useState<string | null>(null)

  async function handleGrade() {
    setGrading(true)
    setGradeError(null)
    try {
      const result = await gradeOpenAnswer(question.question, question.expectedAnswer, answer)
      setGradeResult(result)
    } catch (e) {
      setGradeError(e instanceof Error ? e.message : 'Correction impossible.')
    } finally {
      setGrading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 rounded-3xl bg-[var(--color-surface)] p-6 overflow-y-auto">
        <MathText text={question.question} className="text-lg font-medium mb-4 block" />

        {!revealed ? (
          <>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Écris ta réponse ici (facultatif)..."
              className="w-full min-h-[18vh] rounded-xl p-3.5 bg-[var(--color-surface-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm resize-none mb-2"
            />
            <div className="mb-3">
              <DictateButton onResult={(t) => setAnswer((prev) => (prev ? `${prev} ${t}` : t))} />
            </div>
            {question.hints.length > 0 && (
              <button
                onClick={() => setHintIndex((i) => Math.min(question.hints.length, i + 1))}
                disabled={hintIndex >= question.hints.length}
                className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium mb-2 disabled:opacity-40"
              >
                <Lightbulb size={14} /> Indice
              </button>
            )}
            {question.hints.slice(0, hintIndex).map((h, i) => (
              <p key={i} className="text-xs text-[var(--color-text-muted)] mb-1">
                💡 {h}
              </p>
            ))}
          </>
        ) : (
          <div className="rounded-xl bg-[var(--color-surface-muted)] p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
              Réponse attendue
            </p>
            <MathText text={question.expectedAnswer} className="text-sm whitespace-pre-wrap block" />
          </div>
        )}

        {revealed && aiConfig && !gradeResult && (
          <button
            onClick={handleGrade}
            disabled={grading}
            className="flex items-center gap-2 text-sm text-[var(--color-primary)] font-medium mt-3 disabled:opacity-50"
          >
            {grading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {grading ? 'Correction en cours...' : "Demander une correction à l'IA"}
          </button>
        )}
        {gradeError && <p className="text-sm text-red-500 mt-2">{gradeError}</p>}
        {gradeResult && (
          <div
            className={`rounded-xl p-3.5 mt-3 text-sm ${
              gradeResult.verdict === 'correct'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : gradeResult.verdict === 'partiel'
                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                  : 'bg-red-500/10 text-red-500'
            }`}
          >
            <p className="font-medium mb-1 capitalize">{gradeResult.verdict}</p>
            <p>{gradeResult.feedback}</p>
          </div>
        )}
      </div>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full rounded-xl py-3.5 font-medium text-white bg-[var(--color-primary)]"
        >
          Voir la réponse
        </button>
      ) : (
        <MasteryButtons onRate={onRate} />
      )}
    </div>
  )
}
