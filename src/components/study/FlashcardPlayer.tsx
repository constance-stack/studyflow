import { useRef, useState } from 'react'
import { RotateCw, Check, Undo2 } from 'lucide-react'
import { MasteryButtons } from './MasteryButtons'
import { MathText } from '../MathText'
import type { FlashcardItem } from '../../ai/generate'
import type { MasteryLevel } from '../../db/types'

const SWIPE_THRESHOLD = 90

export function FlashcardPlayer({ card, onRate }: { card: FlashcardItem; onRate: (rating: MasteryLevel) => void }) {
  const [flipped, setFlipped] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null)
  const startRef = useRef(0)
  const movedRef = useRef(false)

  function onPointerDown(e: React.PointerEvent) {
    if (!flipped || exiting) return
    startRef.current = e.clientX
    movedRef.current = false
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || exiting) return
    const delta = e.clientX - startRef.current
    if (Math.abs(delta) > 4) movedRef.current = true
    setDragX(delta)
  }

  function onPointerUp() {
    if (!dragging || exiting) return
    setDragging(false)
    if (dragX > SWIPE_THRESHOLD) {
      finishSwipe('right')
    } else if (dragX < -SWIPE_THRESHOLD) {
      finishSwipe('left')
    } else {
      setDragX(0)
    }
  }

  function finishSwipe(direction: 'left' | 'right') {
    setExiting(direction)
    setDragX(direction === 'right' ? 400 : -400)
    setTimeout(() => onRate(direction === 'right' ? 'known' : 'review'), 180)
  }

  function handleTap() {
    if (movedRef.current || exiting) return
    setFlipped((f) => !f)
  }

  const rotation = dragX / 18
  const rightOpacity = Math.min(1, Math.max(0, dragX / SWIPE_THRESHOLD))
  const leftOpacity = Math.min(1, Math.max(0, -dragX / SWIPE_THRESHOLD))

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex-1 min-h-[40vh] relative select-none">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={handleTap}
          className="absolute inset-0 rounded-3xl bg-[var(--color-surface)] p-6 flex flex-col items-center justify-center text-center gap-4 shadow-sm cursor-pointer touch-none"
          style={{
            transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
            transition: dragging ? 'none' : 'transform 0.25s ease-out',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {flipped ? 'Réponse' : 'Question'}
          </p>
          <MathText text={flipped ? card.back : card.front} className="text-lg font-medium whitespace-pre-wrap" />
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-2">
            {flipped ? (
              <>
                <RotateCw size={13} /> Glisse à droite (je connais) ou à gauche (à revoir)
              </>
            ) : (
              <>
                <RotateCw size={13} /> Toucher pour retourner
              </>
            )}
          </span>

          <div
            className="absolute top-5 left-5 flex items-center gap-1 rounded-lg border-2 border-orange-500 text-orange-500 px-2.5 py-1 font-bold text-sm -rotate-12"
            style={{ opacity: leftOpacity }}
          >
            <Undo2 size={14} /> À revoir
          </div>
          <div
            className="absolute top-5 right-5 flex items-center gap-1 rounded-lg border-2 border-green-500 text-green-500 px-2.5 py-1 font-bold text-sm rotate-12"
            style={{ opacity: rightOpacity }}
          >
            <Check size={14} /> Je connais
          </div>
        </div>
      </div>

      {flipped && <MasteryButtons onRate={onRate} />}
    </div>
  )
}
