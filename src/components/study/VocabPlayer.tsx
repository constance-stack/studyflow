import { useState } from 'react'
import { Volume2 } from 'lucide-react'
import { MasteryButtons } from './MasteryButtons'
import type { VocabItem } from '../../ai/generate'
import type { MasteryLevel } from '../../db/types'

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text)
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

export function VocabPlayer({ item, onRate }: { item: VocabItem; onRate: (rating: MasteryLevel) => void }) {
  const [flipped, setFlipped] = useState(false)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

  return (
    <div className="flex flex-col gap-5 h-full">
      <button
        onClick={() => setFlipped((f) => !f)}
        className="flex-1 min-h-[40vh] rounded-3xl bg-[var(--color-surface)] p-6 flex flex-col items-center justify-center text-center gap-3"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {flipped ? 'Traduction' : 'Mot'}
        </p>
        <p className="text-xl font-medium">{flipped ? item.translation : item.term}</p>
        {!flipped && canSpeak && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation()
              speak(item.term)
            }}
            className="p-2 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
          >
            <Volume2 size={16} />
          </span>
        )}
        {flipped && item.example && <p className="text-sm text-[var(--color-text-muted)] italic mt-1">{item.example}</p>}
      </button>

      {flipped && <MasteryButtons onRate={onRate} />}
    </div>
  )
}
