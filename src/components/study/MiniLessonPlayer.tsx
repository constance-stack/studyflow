import { useState } from 'react'
import { MasteryButtons } from './MasteryButtons'
import { MathText } from '../MathText'
import type { MiniLessonItem } from '../../ai/generate'
import type { MasteryLevel } from '../../db/types'

export function MiniLessonPlayer({ lesson, onRate }: { lesson: MiniLessonItem; onRate: (rating: MasteryLevel) => void }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex-1 rounded-3xl bg-[var(--color-surface)] p-6 overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
          Mini-leçon
        </p>
        <MathText text={lesson.concept} className="text-lg font-semibold mb-3 block" />
        <MathText text={lesson.explanation} className="text-sm mb-4 whitespace-pre-wrap block" />
        {lesson.example && (
          <div className="rounded-xl bg-[var(--color-surface-muted)] p-3.5 mb-4">
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Exemple</p>
            <MathText text={lesson.example} className="text-sm" />
          </div>
        )}

        {lesson.checkQuestion && (
          <div className="rounded-xl bg-[var(--color-primary)]/10 p-3.5">
            <MathText text={lesson.checkQuestion} className="text-sm font-medium mb-1.5 block" />
            {revealed ? (
              <MathText text={lesson.checkAnswer} className="text-sm text-[var(--color-text-muted)]" />
            ) : (
              <button onClick={() => setRevealed(true)} className="text-sm text-[var(--color-primary)] font-medium">
                Voir la réponse →
              </button>
            )}
          </div>
        )}
      </div>

      <MasteryButtons onRate={onRate} />
    </div>
  )
}
