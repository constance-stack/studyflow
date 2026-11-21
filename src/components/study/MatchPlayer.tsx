import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { MasteryButtons } from './MasteryButtons'
import { MathText } from '../MathText'
import type { MatchPair } from '../../ai/generate'
import type { MasteryLevel } from '../../db/types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function MatchPlayer({ pairs, onRate }: { pairs: MatchPair[]; onRate: (rating: MasteryLevel) => void }) {
  const leftItems = useMemo(() => shuffle(pairs.map((p, i) => ({ id: i, text: p.left }))), [pairs])
  const rightItems = useMemo(() => shuffle(pairs.map((p, i) => ({ id: i, text: p.right }))), [pairs])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [wrongFlash, setWrongFlash] = useState<{ left: number; right: number } | null>(null)
  const [mistakes, setMistakes] = useState(0)

  function pickLeft(id: number) {
    if (matched.has(id)) return
    setSelectedLeft(id)
  }

  function pickRight(id: number) {
    if (matched.has(id) || selectedLeft === null) return
    if (selectedLeft === id) {
      setMatched((prev) => new Set(prev).add(id))
      setSelectedLeft(null)
    } else {
      setMistakes((m) => m + 1)
      setWrongFlash({ left: selectedLeft, right: id })
      setTimeout(() => setWrongFlash(null), 500)
      setSelectedLeft(null)
    }
  }

  const done = matched.size === pairs.length

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex-1 rounded-3xl bg-[var(--color-surface)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
          Associe chaque élément à sa paire
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            {leftItems.map((item) => (
              <button
                key={item.id}
                onClick={() => pickLeft(item.id)}
                disabled={matched.has(item.id)}
                className={`rounded-xl px-3 py-2.5 text-sm text-left ${
                  matched.has(item.id)
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : wrongFlash?.left === item.id
                      ? 'bg-red-500/20'
                      : selectedLeft === item.id
                        ? 'bg-[var(--color-primary)]/20 ring-2 ring-[var(--color-primary)]'
                        : 'bg-[var(--color-surface-muted)]'
                }`}
              >
                <MathText text={item.text} />
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {rightItems.map((item) => (
              <button
                key={item.id}
                onClick={() => pickRight(item.id)}
                disabled={matched.has(item.id)}
                className={`rounded-xl px-3 py-2.5 text-sm text-left ${
                  matched.has(item.id)
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : wrongFlash?.right === item.id
                      ? 'bg-red-500/20'
                      : 'bg-[var(--color-surface-muted)]'
                }`}
              >
                <MathText text={item.text} />
              </button>
            ))}
          </div>
        </div>
        {done && (
          <p className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 mt-4">
            <Check size={15} /> Toutes les paires trouvées ({mistakes} erreur{mistakes !== 1 ? 's' : ''})
          </p>
        )}
      </div>

      {done && <MasteryButtons onRate={onRate} />}
    </div>
  )
}
