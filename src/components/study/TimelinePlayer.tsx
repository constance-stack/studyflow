import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { MasteryButtons } from './MasteryButtons'
import type { TimelineEvent } from '../../ai/generate'
import type { MasteryLevel } from '../../db/types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function TimelinePlayer({ events, onRate }: { events: TimelineEvent[]; onRate: (rating: MasteryLevel) => void }) {
  const pool = useMemo(() => shuffle(events), [events])
  const [picked, setPicked] = useState<TimelineEvent[]>([])
  const [mistake, setMistake] = useState(false)

  const remaining = pool.filter((e) => !picked.includes(e))
  const done = picked.length === events.length

  function pick(event: TimelineEvent) {
    const nextOrder = picked.length
    if (event.order !== nextOrder) {
      setMistake(true)
      setTimeout(() => setMistake(false), 500)
    }
    setPicked((prev) => [...prev, event])
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex-1 rounded-3xl bg-[var(--color-surface)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">
          Remets les événements dans l'ordre chronologique
        </p>

        <div className="flex flex-col gap-2 mb-4">
          {picked.map((e, i) => (
            <div
              key={e.label}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm ${
                e.order === i ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-500'
              }`}
            >
              {e.order === i ? <Check size={15} /> : <X size={15} />}
              <span className="font-medium">{e.date}</span> — {e.label}
            </div>
          ))}
        </div>

        {!done && (
          <div className={`flex flex-col gap-2 ${mistake ? 'animate-pulse' : ''}`}>
            {remaining.map((e) => (
              <button
                key={e.label}
                onClick={() => pick(e)}
                className="rounded-xl px-3.5 py-2.5 text-sm text-left bg-[var(--color-surface-muted)]"
              >
                {e.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {done && <MasteryButtons onRate={onRate} />}
    </div>
  )
}
