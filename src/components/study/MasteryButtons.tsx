import type { MasteryLevel } from '../../db/types'

const OPTIONS: { value: MasteryLevel; emoji: string; label: string; className: string }[] = [
  { value: 'unknown', emoji: '🔴', label: 'Je ne connais pas', className: 'bg-red-500/10 text-red-500' },
  { value: 'review', emoji: '🟠', label: 'À revoir', className: 'bg-orange-500/10 text-orange-500' },
  { value: 'known', emoji: '🟢', label: 'Je connais', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { value: 'mastered', emoji: '⭐', label: 'Maîtrisé', className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
]

export function MasteryButtons({ onRate }: { onRate: (rating: MasteryLevel) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onRate(opt.value)}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-3 font-medium text-sm active:scale-95 transition-transform ${opt.className}`}
        >
          <span>{opt.emoji}</span>
          {opt.label}
        </button>
      ))}
    </div>
  )
}
