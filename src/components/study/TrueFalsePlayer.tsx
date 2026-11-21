import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { MasteryButtons } from './MasteryButtons'
import { MathText } from '../MathText'
import type { TrueFalseItem } from '../../ai/generate'
import type { MasteryLevel } from '../../db/types'

export function TrueFalsePlayer({ item, onRate }: { item: TrueFalseItem; onRate: (rating: MasteryLevel) => void }) {
  const [answer, setAnswer] = useState<boolean | null>(null)

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex-1 rounded-3xl bg-[var(--color-surface)] p-6 flex flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
          Vrai ou faux ?
        </p>
        <MathText text={item.statement} className="text-lg font-medium mb-5" />

        {answer === null ? (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setAnswer(true)} className="rounded-xl py-3.5 font-medium bg-green-500/10 text-green-600 dark:text-green-400">
              Vrai
            </button>
            <button onClick={() => setAnswer(false)} className="rounded-xl py-3.5 font-medium bg-red-500/10 text-red-500">
              Faux
            </button>
          </div>
        ) : (
          <div
            className={`rounded-xl p-3.5 flex items-start gap-2.5 ${
              answer === item.isTrue ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-500'
            }`}
          >
            {answer === item.isTrue ? <Check size={18} className="shrink-0 mt-0.5" /> : <X size={18} className="shrink-0 mt-0.5" />}
            <div className="text-sm">
              <p className="font-medium mb-1">C'est {item.isTrue ? 'vrai' : 'faux'}.</p>
              <MathText text={item.justification} />
            </div>
          </div>
        )}
      </div>

      {answer !== null && <MasteryButtons onRate={onRate} />}
    </div>
  )
}
