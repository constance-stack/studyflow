import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  Zap,
  Shuffle,
  Flame,
  Infinity as InfinityIcon,
  Layers,
  ListChecks,
  Lightbulb,
  MessageCircleQuestion,
  History,
  CheckCircle2,
  SquareDashedBottom,
  Shuffle as ShuffleIcon,
  Languages,
  MessageSquareQuote,
  Calculator,
} from 'lucide-react'
import { db } from '../db/schema'
import { TopBar } from '../components/TopBar'
import { EmptyState } from '../components/EmptyState'
import { getCardStatesForActivities } from '../srs/cardState'
import { loadActiveSession } from '../srs/activeSession'
import type { Activity, ActivityType } from '../db/types'
import { buildDeck, type DeckFilter } from '../srs/deck'
import type { SessionConfig } from './StudySession'

const TYPE_LABELS: Record<ActivityType, { label: string; icon: React.ReactNode }> = {
  flashcard: { label: 'Flashcards', icon: <Layers size={14} /> },
  qcm: { label: 'QCM', icon: <ListChecks size={14} /> },
  minilesson: { label: 'Mini-leçons', icon: <Lightbulb size={14} /> },
  open: { label: 'Questions ouvertes', icon: <MessageCircleQuestion size={14} /> },
  truefalse: { label: 'Vrai/Faux', icon: <CheckCircle2 size={14} /> },
  blank: { label: 'Textes à trous', icon: <SquareDashedBottom size={14} /> },
  match: { label: 'Associations', icon: <ShuffleIcon size={14} /> },
  vocab: { label: 'Vocabulaire', icon: <Languages size={14} /> },
  timeline: { label: 'Chronologie', icon: <History size={14} /> },
  reflection: { label: 'Réflexion', icon: <MessageSquareQuote size={14} /> },
  miniexercise: { label: 'Mini-exercices', icon: <Calculator size={14} /> },
  exercise: { label: 'Exercices', icon: <Calculator size={14} /> },
}

export function Review() {
  const navigate = useNavigate()
  const activities = useLiveQuery(() => db.activities.toArray()) ?? []
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray()) ?? []
  const chapters = useLiveQuery(() => db.chapters.toArray()) ?? []
  const activeSession = useLiveQuery(() => loadActiveSession())

  const [subjectId, setSubjectId] = useState('all')
  const [chapterId, setChapterId] = useState('all')
  const [filter, setFilter] = useState<DeckFilter>('all')
  const [untilMastered, setUntilMastered] = useState(false)
  const [cardLimit, setCardLimit] = useState<number | null>(20)
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null)

  const scopedActivities = useMemo(() => {
    if (chapterId !== 'all') return activities.filter((a) => a.chapterIds.includes(chapterId))
    if (subjectId !== 'all') return activities.filter((a) => a.subjectIds.includes(subjectId))
    return activities
  }, [activities, subjectId, chapterId])

  const scopedDeck = useLiveQuery(async () => {
    const ids = scopedActivities.map((a) => a.id)
    if (ids.length === 0) return []
    const states = await getCardStatesForActivities(ids)
    return buildDeck(scopedActivities, filter, states)
  }, [scopedActivities, filter])
  const itemCount = scopedDeck?.length ?? 0

  const scopedDueCount = useLiveQuery(async () => {
    const ids = scopedActivities.map((a) => a.id)
    if (ids.length === 0) return 0
    const states = await getCardStatesForActivities(ids)
    return buildDeck(scopedActivities, 'due', states).length
  }, [scopedActivities]) ?? 0

  const typeBreakdown = useMemo(() => {
    const counts = new Map<ActivityType, number>()
    for (const item of scopedDeck ?? []) {
      counts.set(item.type, (counts.get(item.type) ?? 0) + 1)
    }
    return counts
  }, [scopedDeck])

  function launch(
    activitiesForSession: Activity[],
    launchFilter: DeckFilter,
    launchUntilMastered: boolean,
    title: string,
    limit?: number | null,
    duration?: number | null,
  ) {
    const config: SessionConfig = {
      activityIds: activitiesForSession.map((a) => a.id),
      filter: launchFilter,
      untilMastered: launchUntilMastered,
      title,
      cardLimit: limit ?? undefined,
      durationMinutes: duration ?? undefined,
    }
    navigate('/review/session', { state: config })
  }

  function launchCustom() {
    launch(scopedActivities, filter, untilMastered, 'Révision personnalisée', durationMinutes ? null : cardLimit, durationMinutes)
  }

  return (
    <div>
      <TopBar title="Réviser" />
      <div className="px-4 sm:px-8 sm:pt-8 max-w-2xl mx-auto">
        <h1 className="hidden sm:block text-2xl font-bold mb-6">Réviser</h1>

        {activeSession && (
          <button
            onClick={() => navigate('/review/session')}
            className="w-full flex items-center gap-3 rounded-2xl bg-[var(--color-primary)]/10 p-4 text-left mb-4"
          >
            <History size={20} className="text-[var(--color-primary)] shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-[var(--color-primary)]">Reprendre la session en cours</p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">{activeSession.config.title}</p>
            </div>
          </button>
        )}

        {activities.length === 0 ? (
          <EmptyState
            icon={<Zap size={32} />}
            title="Aucune activité à réviser"
            description="Génère des flashcards, un QCM ou des mini-leçons depuis un chapitre pour commencer à réviser."
            action={
              <button
                onClick={() => navigate('/library')}
                className="rounded-xl px-5 py-2.5 bg-[var(--color-primary)] text-white font-medium text-sm"
              >
                Aller à mes cours
              </button>
            }
          />
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
              Que veux-tu réviser ?
            </p>
            <div className="flex gap-2 mb-4">
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value)
                  setChapterId('all')
                }}
                className="flex-1 rounded-xl px-3 py-2.5 bg-[var(--color-surface)] text-sm outline-none"
              >
                <option value="all">Toutes les matières</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                disabled={subjectId === 'all'}
                className="flex-1 rounded-xl px-3 py-2.5 bg-[var(--color-surface)] text-sm outline-none disabled:opacity-40"
              >
                <option value="all">Tous les chapitres</option>
                {chapters
                  .filter((c) => c.subjectId === subjectId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => launch(scopedActivities, 'due', false, "À réviser aujourd'hui")}
                disabled={scopedActivities.length === 0}
                className="rounded-2xl bg-[var(--color-surface)] p-4 text-left disabled:opacity-40"
              >
                <Flame size={20} className="text-[var(--color-primary)] mb-2" />
                <p className="font-semibold text-sm">À réviser aujourd'hui</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{scopedDueCount} carte(s)</p>
              </button>
              <button
                onClick={() => launch(scopedActivities, 'all', false, 'Révision mixte')}
                disabled={scopedActivities.length === 0}
                className="rounded-2xl bg-[var(--color-surface)] p-4 text-left disabled:opacity-40"
              >
                <Shuffle size={20} className="text-[var(--color-primary)] mb-2" />
                <p className="font-semibold text-sm">Révision mixte</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {chapterId !== 'all'
                    ? chapters.find((c) => c.id === chapterId)?.name
                    : subjectId !== 'all'
                      ? subjects.find((s) => s.id === subjectId)?.name
                      : 'Toutes matières'}
                </p>
              </button>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
              Révision personnalisée
            </p>
            <div className="rounded-2xl bg-[var(--color-surface)] p-4 flex flex-col gap-4 mb-6">
              <div className="flex gap-2">
                {([
                  ['all', 'Toutes'],
                  ['due', 'À revoir'],
                  ['failed', 'Ratées'],
                ] as [DeckFilter, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                      filter === value ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setUntilMastered((v) => !v)}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium ${
                  untilMastered ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface-muted)]'
                }`}
              >
                <InfinityIcon size={16} />
                Mode "jusqu'à tout connaître"
              </button>

              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Nombre de cartes</p>
                <div className="flex gap-2">
                  {[10, 20, 30, null].map((n) => (
                    <button
                      key={n ?? 'all'}
                      onClick={() => {
                        setCardLimit(n)
                        setDurationMinutes(null)
                      }}
                      className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                        cardLimit === n && durationMinutes === null ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
                      }`}
                    >
                      {n ?? 'Tout'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5">ou durée</p>
                <div className="flex gap-1.5 flex-wrap">
                  {[5, 10, 15, 20, 30, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => setDurationMinutes(m)}
                      className={`flex-1 rounded-xl py-2 text-sm font-medium min-w-[48px] ${
                        durationMinutes === m ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[...typeBreakdown.entries()].map(([type, count]) => (
                  <span
                    key={type}
                    className="flex items-center gap-1 text-xs rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-[var(--color-text-muted)]"
                  >
                    {TYPE_LABELS[type]?.icon}
                    {TYPE_LABELS[type]?.label} · {count}
                  </span>
                ))}
              </div>

              <button
                onClick={launchCustom}
                disabled={itemCount === 0}
                className="rounded-xl py-3 font-medium text-white bg-[var(--color-primary)] disabled:opacity-40"
              >
                Lancer ({itemCount} carte{itemCount === 1 ? '' : 's'} disponible{itemCount === 1 ? '' : 's'})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
