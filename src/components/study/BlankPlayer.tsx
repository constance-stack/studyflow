import { useState } from 'react'
import { MasteryButtons } from './MasteryButtons'
import { MathText } from '../MathText'
import type { BlankItem } from '../../ai/generate'
import type { MasteryLevel } from '../../db/types'

export function BlankPlayer({ item, onRate }: { item: BlankItem; onRate: (rating: MasteryLevel) => void }) {
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const parts = item.textWithBlank.split('____')

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex-1 rounded-3xl bg-[var(--color-surface)] p-6 flex flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
          Complète le texte
        </p>
        <p className="text-lg font-medium mb-5 leading-relaxed">
          <MathText text={parts[0] ?? ''} />
          <span className="inline-block min-w-[80px] border-b-2 border-dashed border-[var(--color-primary)] mx-1 text-[var(--color-primary)] text-center">
            {revealed ? <MathText text={item.answer} /> : answer || ' '}
          </span>
          {parts[1] !== undefined && <MathText text={parts[1]} />}
        </p>

        {!revealed && (
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Ta réponse..."
            className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        )}
      </div>

      {!revealed ? (
        <button onClick={() => setRevealed(true)} className="w-full rounded-xl py-3.5 font-medium text-white bg-[var(--color-primary)]">
          Voir la réponse
        </button>
      ) : (
        <MasteryButtons onRate={onRate} />
      )}
    </div>
  )
}
