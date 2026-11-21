import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Play, Pause, RotateCcw, PartyPopper } from 'lucide-react'

const PRESETS = [15, 25, 45, 60]

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function FocusMode() {
  const navigate = useNavigate()
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r === null) return r
        if (r <= 1) {
          setRunning(false)
          setDone(true)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  function start() {
    setRemaining(durationMinutes * 60)
    setRunning(true)
    setDone(false)
  }

  function reset() {
    setRunning(false)
    setRemaining(null)
    setDone(false)
  }

  const started = remaining !== null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative">
      <button onClick={() => navigate(-1)} className="absolute top-6 left-4 p-2 rounded-full" aria-label="Fermer">
        <X size={22} />
      </button>

      {done ? (
        <>
          <PartyPopper size={44} className="text-[var(--color-primary)] mb-4" />
          <h1 className="text-xl font-bold mb-1">Session terminée</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            {durationMinutes} minutes de concentration, bravo !
          </p>
          <button onClick={reset} className="rounded-xl px-6 py-3 bg-[var(--color-primary)] text-white font-medium">
            Nouvelle session
          </button>
        </>
      ) : !started ? (
        <>
          <p className="text-sm text-[var(--color-text-muted)] mb-2">Mode concentration</p>
          <h1 className="text-2xl font-bold mb-8">Combien de temps ?</h1>
          <div className="grid grid-cols-2 gap-3 mb-8 w-full max-w-xs">
            {PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => setDurationMinutes(m)}
                className={`rounded-2xl py-4 text-lg font-semibold ${
                  durationMinutes === m ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)]'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
          <button onClick={start} className="rounded-xl px-8 py-3.5 bg-[var(--color-primary)] text-white font-medium">
            Commencer
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--color-text-muted)] mb-3">Reste concentrée...</p>
          <p className="text-6xl font-bold tabular-nums mb-10">{formatClock(remaining)}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setRunning((r) => !r)}
              className="w-16 h-16 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center"
            >
              {running ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button
              onClick={reset}
              className="w-16 h-16 rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)] flex items-center justify-center"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
