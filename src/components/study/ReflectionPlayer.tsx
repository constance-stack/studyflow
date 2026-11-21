import { useState } from 'react'
import { MasteryButtons } from './MasteryButtons'
import { MathText } from '../MathText'
import { DictateButton } from '../DictateButton'
import type { ReflectionItem } from '../../ai/generate'
import type { MasteryLevel } from '../../db/types'

export function ReflectionPlayer({ item, onRate }: { item: ReflectionItem; onRate: (rating: MasteryLevel) => void }) {
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 rounded-3xl bg-[var(--color-surface)] p-6 overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          Question de réflexion
        </p>
        <MathText text={item.prompt} className="text-lg font-medium mb-4" />
        {!revealed ? (
          <>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Rédige ta réponse (quelques lignes)..."
              className="w-full min-h-[30vh] rounded-xl p-3.5 bg-[var(--color-surface-muted)] text-sm outline-none resize-none mb-2"
            />
            <DictateButton onResult={(t) => setAnswer((prev) => (prev ? `${prev} ${t}` : t))} />
          </>
        ) : (
          <div className="rounded-xl bg-[var(--color-surface-muted)] p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
              Axes attendus
            </p>
            <MathText text={item.guidance} className="text-sm" />
          </div>
        )}
      </div>

      {!revealed ? (
        <button onClick={() => setRevealed(true)} className="w-full rounded-xl py-3.5 font-medium text-white bg-[var(--color-primary)]">
          Voir les axes attendus
        </button>
      ) : (
        <MasteryButtons onRate={onRate} />
      )}
    </div>
  )
}
