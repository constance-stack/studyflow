import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { MathText } from '../MathText'
import type { QCMItem } from '../../ai/generate'
import type { MasteryLevel } from '../../db/types'

export function QCMPlayer({ question, onRate }: { question: QCMItem; onRate: (rating: MasteryLevel) => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [validated, setValidated] = useState(false)
  const multiple = question.correctIndices.length > 1

  function toggle(i: number) {
    if (validated) return
    setSelected((prev) => {
      const next = new Set(multiple ? prev : [])
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function computeRating(): MasteryLevel {
    const correct = new Set(question.correctIndices)
    const exact = correct.size === selected.size && [...correct].every((c) => selected.has(c))
    if (exact) return 'known'
    const hasWrong = [...selected].some((s) => !correct.has(s))
    return hasWrong ? 'unknown' : 'review'
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex-1 rounded-3xl bg-[var(--color-surface)] p-6 overflow-y-auto">
        <MathText text={question.question} className="text-lg font-medium mb-5" />
        <div className="flex flex-col gap-2.5">
          {question.choices.map((choice, i) => {
            const isSelected = selected.has(i)
            const isCorrect = question.correctIndices.includes(i)
            let style = 'bg-[var(--color-surface-muted)]'
            if (validated && isCorrect) style = 'bg-green-500/10 text-green-600 dark:text-green-400'
            else if (validated && isSelected && !isCorrect) style = 'bg-red-500/10 text-red-500'
            else if (!validated && isSelected) style = 'bg-[var(--color-primary)]/15 ring-2 ring-[var(--color-primary)]'

            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                disabled={validated}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium ${style}`}
              >
                {validated && (isCorrect ? <Check size={16} className="shrink-0" /> : isSelected ? <X size={16} className="shrink-0" /> : null)}
                <MathText text={choice} />
              </button>
            )
          })}
        </div>
        {validated && question.explanation && (
          <MathText text={question.explanation} className="text-sm text-[var(--color-text-muted)] mt-4 block" />
        )}
      </div>

      {validated ? (
        <button
          onClick={() => onRate(computeRating())}
          className="w-full rounded-xl py-3.5 font-medium text-white bg-[var(--color-primary)]"
        >
          Continuer
        </button>
      ) : (
        <button
          onClick={() => setValidated(true)}
          disabled={selected.size === 0}
          className="w-full rounded-xl py-3.5 font-medium text-white bg-[var(--color-primary)] disabled:opacity-40"
        >
          Valider
        </button>
      )}
    </div>
  )
}
