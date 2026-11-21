import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { MasteryButtons } from './MasteryButtons'
import { MathText } from '../MathText'
import type { ExerciseItem } from '../../ai/generate'
import type { MasteryLevel } from '../../db/types'

export function ExercisePlayer({ item, onRate }: { item: ExerciseItem; onRate: (rating: MasteryLevel) => void }) {
  const [hintCount, setHintCount] = useState(0)
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 rounded-3xl bg-[var(--color-surface)] p-6 overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Exercice</p>
        <MathText text={item.statement} className="text-lg font-medium mb-4" />

        {!revealed && item.hints.length > 0 && (
          <button
            onClick={() => setHintCount((c) => Math.min(item.hints.length, c + 1))}
            disabled={hintCount >= item.hints.length}
            className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium mb-2 disabled:opacity-40"
          >
            <Lightbulb size={14} /> Indice ({hintCount}/{item.hints.length})
          </button>
        )}
        {item.hints.slice(0, hintCount).map((h, i) => (
          <p key={i} className="text-xs text-[var(--color-text-muted)] mb-1">
            💡 <MathText text={h} />
          </p>
        ))}

        {revealed && (
          <div className="rounded-xl bg-[var(--color-surface-muted)] p-3.5 mt-3 flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Correction détaillée
            </p>
            {item.steps.map((s, i) => (
              <p key={i} className="text-sm">
                <span className="font-medium">{i + 1}.</span> <MathText text={s} />
              </p>
            ))}
            <p className="text-sm font-medium mt-1">
              Réponse finale : <MathText text={item.finalAnswer} />
            </p>
          </div>
        )}
      </div>

      {!revealed ? (
        <button onClick={() => setRevealed(true)} className="w-full rounded-xl py-3.5 font-medium text-white bg-[var(--color-primary)]">
          Voir la correction
        </button>
      ) : (
        <MasteryButtons onRate={onRate} />
      )}
    </div>
  )
}
