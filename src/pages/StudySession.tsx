import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, PartyPopper, Timer } from 'lucide-react'
import { db } from '../db/schema'
import { buildDeck, type DeckFilter, type StudyItem } from '../srs/deck'
import { getCardStatesForActivities, rateCard } from '../srs/cardState'
import { saveActiveSession, loadActiveSession, clearActiveSession, type ActiveSessionSnapshot } from '../srs/activeSession'
import { StudyCardDispatcher } from '../components/study/StudyCardDispatcher'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { createStudySession, updateStudySession } from '../db/queries'
import { recordSessionCompletion } from '../gamification/state'
import type { Activity, MasteryLevel, StudySession as StudySessionRecord } from '../db/types'

export interface SessionConfig {
  activityIds: string[]
  filter: DeckFilter
  untilMastered: boolean
  title: string
  cardLimit?: number
  durationMinutes?: number
}

const REQUEUE_OFFSET = 4
const MAX_ATTEMPTS = 5

function cardKey(item: StudyItem) {
  return `${item.activityId}:${item.cardId}`
}

function sessionTypeFor(types: Set<Activity['type']>): StudySessionRecord['type'] {
  if (types.size !== 1) return 'mixed'
  const [only] = types
  if (only === 'qcm') return 'quiz'
  if (only === 'flashcard') return 'flashcard'
  return 'other'
}

function formatClock(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60)
  const s = Math.max(0, seconds) % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function StudySession() {
  const location = useLocation()
  const navigate = useNavigate()
  const navConfig = location.state as SessionConfig | null

  const [config, setConfig] = useState<SessionConfig | null>(navConfig)
  const [resumeChecked, setResumeChecked] = useState(!!navConfig)
  const [noActiveSession, setNoActiveSession] = useState(false)

  const activities = useLiveQuery(
    () => (config ? db.activities.where('id').anyOf(config.activityIds).toArray() : Promise.resolve<Activity[]>([])),
    [config?.activityIds.join(',')],
  )

  const [queue, setQueue] = useState<StudyItem[] | null>(null)
  const [current, setCurrent] = useState<StudyItem | null>(null)
  const [totalInitial, setTotalInitial] = useState(0)
  const [seenCount, setSeenCount] = useState(0)
  const [cardInstanceKey, setCardInstanceKey] = useState(0)
  const [exitConfirm, setExitConfirm] = useState(false)
  const [finished, setFinished] = useState(false)
  const [emptyAtStart, setEmptyAtStart] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)

  const attemptsRef = useRef<Map<string, number>>(new Map())
  const seenFirstTryRef = useRef<Set<string>>(new Set())
  const multipleAttemptsRef = useRef<Set<string>>(new Set())
  const stillDifficultRef = useRef<Set<string>>(new Set())
  const doneCountRef = useRef(0)
  const initializedRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null)
  const seenCountRef = useRef(0)
  const correctRef = useRef(0)
  const incorrectRef = useRef(0)
  const sessionEndedRef = useRef(false)
  const timeUpRef = useRef(false)
  const resumedRef = useRef(false)

  // Resolve: fresh launch (navConfig present) vs. resuming a previously interrupted session.
  useEffect(() => {
    if (navConfig) return
    loadActiveSession().then((snapshot) => {
      if (!snapshot) {
        setNoActiveSession(true)
        setResumeChecked(true)
        return
      }
      resumedRef.current = true
      setConfig(snapshot.config)
      sessionIdRef.current = snapshot.sessionId
      setQueue(snapshot.queue)
      setCurrent(snapshot.current)
      setTotalInitial(snapshot.totalInitial)
      setSeenCount(snapshot.seenCount)
      seenCountRef.current = snapshot.seenCount
      setCardInstanceKey(snapshot.cardInstanceKey)
      doneCountRef.current = snapshot.doneCount
      attemptsRef.current = new Map(snapshot.attempts)
      seenFirstTryRef.current = new Set(snapshot.seenFirstTry)
      multipleAttemptsRef.current = new Set(snapshot.multipleAttempts)
      stillDifficultRef.current = new Set(snapshot.stillDifficult)
      correctRef.current = snapshot.correct
      incorrectRef.current = snapshot.incorrect
      setRemainingSeconds(snapshot.remainingSeconds)
      initializedRef.current = true
      setResumeChecked(true)
    })
  }, [navConfig])

  useEffect(() => {
    if (!config || !activities || initializedRef.current) return
    initializedRef.current = true

    getCardStatesForActivities(config.activityIds).then(async (states) => {
      let deck = buildDeck(activities, config.filter, states)
      if (config.cardLimit) deck = deck.slice(0, config.cardLimit)
      setQueue(deck.slice(1))
      setCurrent(deck[0] ?? null)
      setTotalInitial(deck.length)
      if (config.durationMinutes) setRemainingSeconds(config.durationMinutes * 60)

      if (deck.length > 0) {
        const types = new Set(activities.map((a) => a.type))
        const subjectIds = [...new Set(activities.flatMap((a) => a.subjectIds))]
        const chapterIds = [...new Set(activities.flatMap((a) => a.chapterIds))]
        const session = await createStudySession({ type: sessionTypeFor(types), subjectIds, chapterIds })
        sessionIdRef.current = session.id
        persistSnapshot(deck.slice(1), deck[0] ?? null, deck.length, 0)
      } else {
        setEmptyAtStart(true)
        setFinished(true)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, activities])

  // Registered once, independent of the fresh-start vs. resume branching above, so an abandoned
  // session (closed tab, navigated away) always finalizes its stats record on unmount.
  useEffect(() => {
    return () => {
      endSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Countdown timer for minute-based sessions; lets the current card finish rather than cutting it off.
  useEffect(() => {
    if (remainingSeconds === null || finished) return
    const interval = setInterval(() => {
      setRemainingSeconds((s) => {
        if (s === null) return s
        if (s <= 1) {
          timeUpRef.current = true
          clearInterval(interval)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [remainingSeconds !== null, finished])

  function persistSnapshot(nextQueue: StudyItem[], nextCurrent: StudyItem | null, total: number, seen: number) {
    if (!config) return
    const snapshot: ActiveSessionSnapshot = {
      config,
      queue: nextQueue,
      current: nextCurrent,
      totalInitial: total,
      seenCount: seen,
      cardInstanceKey,
      doneCount: doneCountRef.current,
      attempts: [...attemptsRef.current.entries()],
      seenFirstTry: [...seenFirstTryRef.current],
      multipleAttempts: [...multipleAttemptsRef.current],
      stillDifficult: [...stillDifficultRef.current],
      sessionId: sessionIdRef.current,
      correct: correctRef.current,
      incorrect: incorrectRef.current,
      remainingSeconds,
      savedAt: Date.now(),
    }
    saveActiveSession(snapshot)
  }

  function endSession(clearResume = false) {
    if (!sessionEndedRef.current && sessionIdRef.current) {
      sessionEndedRef.current = true
      updateStudySession(sessionIdRef.current, {
        endedAt: Date.now(),
        cardsSeen: seenCountRef.current,
        correct: correctRef.current,
        incorrect: incorrectRef.current,
      })
      if (seenCountRef.current > 0) recordSessionCompletion(seenCountRef.current, correctRef.current)
    }
    if (clearResume) clearActiveSession()
  }

  const progress = useMemo(() => {
    if (totalInitial === 0) return 0
    const done = config?.untilMastered ? doneCountRef.current : seenCount
    return Math.min(1, done / totalInitial)
  }, [seenCount, totalInitial, config?.untilMastered, current])

  if (!resumeChecked) return null

  if (noActiveSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="font-medium">Aucune session à reprendre.</p>
        <button onClick={() => navigate('/review')} className="text-sm text-[var(--color-primary)] font-medium">
          Retour aux révisions
        </button>
      </div>
    )
  }

  if (!config) return null

  function advance(nextQueue: StudyItem[], seen: number) {
    const nextCurrent = nextQueue[0] ?? null
    setQueue(nextQueue.slice(1))
    setCurrent(nextCurrent)
    setCardInstanceKey((k) => k + 1)
    if (nextQueue.length === 0 || timeUpRef.current) {
      setFinished(true)
      endSession(true)
    } else {
      persistSnapshot(nextQueue.slice(1), nextCurrent, totalInitial, seen)
    }
  }

  async function handleRate(rating: MasteryLevel) {
    if (!current) return
    const key = cardKey(current)
    await rateCard(current.activityId, current.cardId, rating)
    setSeenCount((c) => c + 1)
    seenCountRef.current += 1
    if (rating === 'known' || rating === 'mastered') correctRef.current += 1
    else incorrectRef.current += 1

    if (!config!.untilMastered) {
      advance(queue ?? [], seenCountRef.current)
      return
    }

    const attempts = (attemptsRef.current.get(key) ?? 0) + 1
    attemptsRef.current.set(key, attempts)

    if (rating === 'known' || rating === 'mastered') {
      doneCountRef.current += 1
      if (attempts === 1) seenFirstTryRef.current.add(key)
      else multipleAttemptsRef.current.add(key)
      advance(queue ?? [], seenCountRef.current)
      return
    }

    if (attempts >= MAX_ATTEMPTS) {
      doneCountRef.current += 1
      stillDifficultRef.current.add(key)
      multipleAttemptsRef.current.add(key)
      advance(queue ?? [], seenCountRef.current)
      return
    }

    const nextQueue = [...(queue ?? [])]
    const insertAt = Math.min(nextQueue.length, REQUEUE_OFFSET)
    nextQueue.splice(insertAt, 0, current)
    advance(nextQueue, seenCountRef.current)
  }

  if (finished && emptyAtStart) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <PartyPopper size={40} className="text-[var(--color-primary)] mb-4" />
        <h1 className="text-xl font-bold mb-1">Rien à réviser pour l'instant</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-xs">
          {config.filter === 'due'
            ? "Tu es à jour sur ce que tu as sélectionné — aucune carte n'est due aujourd'hui. Essaie la révision mixte pour t'entraîner quand même."
            : "Aucune carte ne correspond à ce que tu as sélectionné pour l'instant."}
        </p>
        <button
          onClick={() => navigate('/review')}
          className="rounded-xl px-6 py-3 bg-[var(--color-primary)] text-white font-medium"
        >
          Retour aux révisions
        </button>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <PartyPopper size={40} className="text-[var(--color-primary)] mb-4" />
        <h1 className="text-xl font-bold mb-1">Session terminée</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">{config.title}</p>

        <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] p-5 flex flex-col gap-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Cartes vues</span>
            <span className="font-semibold">{seenCountRef.current}</span>
          </div>
          {config.untilMastered && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Connues dès le 1er passage</span>
                <span className="font-semibold">{seenFirstTryRef.current.size}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Nécessité plusieurs tentatives</span>
                <span className="font-semibold">{multipleAttemptsRef.current.size}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Encore difficiles</span>
                <span className="font-semibold">{stillDifficultRef.current.size}</span>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => navigate('/review')}
          className="rounded-xl px-6 py-3 bg-[var(--color-primary)] text-white font-medium"
        >
          Retour aux révisions
        </button>
      </div>
    )
  }

  if (!current) {
    return <div className="min-h-screen flex items-center justify-center text-[var(--color-text-muted)]">Chargement...</div>
  }

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-8 py-4" style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}>
      <div className="flex items-center gap-3 mb-4 max-w-2xl w-full mx-auto">
        <button onClick={() => setExitConfirm(true)} className="p-1.5 -ml-1.5 rounded-full" aria-label="Quitter">
          <X size={20} />
        </button>
        <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
          <div
            className="h-full bg-[var(--color-primary)] transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {remainingSeconds !== null && (
          <span className={`flex items-center gap-1 text-xs font-semibold shrink-0 ${remainingSeconds < 60 ? 'text-red-500' : 'text-[var(--color-text-muted)]'}`}>
            <Timer size={13} /> {formatClock(remainingSeconds)}
          </span>
        )}
        <span className="text-xs text-[var(--color-text-muted)] shrink-0">
          {Math.min(seenCount + 1, totalInitial)}/{totalInitial}
        </span>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto">
        <StudyCardDispatcher key={cardInstanceKey} item={current} onRate={handleRate} />
      </div>

      <ConfirmDialog
        open={exitConfirm}
        title="Quitter la session ?"
        description="Tu peux reprendre cette session plus tard depuis l'onglet Réviser. Choisis « Abandonner » pour ne pas la reprendre."
        confirmLabel="Abandonner"
        danger
        onCancel={() => setExitConfirm(false)}
        onConfirm={() => {
          endSession(true)
          navigate('/review')
        }}
      />
    </div>
  )
}
