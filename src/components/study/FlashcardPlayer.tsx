import { useState } from 'react'
import { RotateCw } from 'lucide-react'
import { MasteryButtons } from './MasteryButtons'
import { MathText } from '../MathText'
import type { FlashcardItem } from '../../ai/generate'
import type { MasteryLevel } from '../../db/types'

export function FlashcardPlayer({ card, onRate }: { card: FlashcardItem; onRate: (rating: MasteryLevel) => void }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="flex flex-col gap-5 h-full">
      <button
        onClick={() => setFlipped((f) => !f)}
        className="flex-1 min-h-[40vh] rounded-3xl bg-[var(--color-surface)] p-6 flex flex-col items-center justify-center text-center gap-4 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {flipped ? 'Réponse' : 'Question'}
        </p>
        <MathText text={flipped ? card.back : card.front} className="text-lg font-medium whitespace-pre-wrap" />
        <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-2">
          <RotateCw size={13} /> Toucher pour retourner
        </span>
      </button>

      {flipped && <MasteryButtons onRate={onRate} />}
    </div>
  )
}
