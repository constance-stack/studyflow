import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { db } from '../db/schema'
import { setCardMasteryManually } from '../srs/cardState'
import { contentToFlatItems } from '../components/manual/contentShape'
import { summarizeItem } from '../components/manual/itemFormConfig'
import type { CardState, MasteryLevel } from '../db/types'

const MASTERY_OPTIONS: { value: MasteryLevel | 'all'; label: string; dot: string }[] = [
  { value: 'all', label: 'Toutes', dot: 'bg-[var(--color-text-muted)]' },
  { value: 'unknown', label: 'Inconnues', dot: 'bg-red-500' },
  { value: 'review', label: 'À revoir', dot: 'bg-orange-500' },
  { value: 'known', label: 'Connues', dot: 'bg-green-500' },
  { value: 'mastered', label: 'Maîtrisées', dot: 'bg-yellow-500' },
]

const MASTERY_DOT: Record<MasteryLevel, string> = {
  unknown: 'bg-red-500',
  review: 'bg-orange-500',
  known: 'bg-green-500',
  mastered: 'bg-yellow-500',
}

export function NotionsBrowser() {
  const navigate = useNavigate()
  const cardStates = useLiveQuery(() => db.cardStates.toArray()) ?? []
  const activities = useLiveQuery(() => db.activities.toArray()) ?? []
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray()) ?? []
  const chapters = useLiveQuery(() => db.chapters.toArray()) ?? []

  const [subjectId, setSubjectId] = useState('all')
  const [chapterId, setChapterId] = useState('all')
  const [mastery, setMastery] = useState<MasteryLevel | 'all'>('all')

  const activityMap = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities])

  const rows = useMemo(() => {
    const result: { state: CardState; title: string; subtitle?: string }[] = []
    for (const state of cardStates) {
      const activity = activityMap.get(state.activityId)
      if (!activity) continue
      if (subjectId !== 'all' && !activity.subjectIds.includes(subjectId)) continue
      if (chapterId !== 'all' && !activity.chapterIds.includes(chapterId)) continue
      if (mastery !== 'all' && state.mastery !== mastery) continue
      const flatItems = contentToFlatItems(activity.type, activity.content)
      const item = flatItems[Number(state.cardId)]
      if (item === undefined) continue
      const { title, subtitle } = summarizeItem(activity.type, item)
      result.push({ state, title, subtitle })
    }
    return result.sort((a, b) => a.state.dueDate - b.state.dueDate)
  }, [cardStates, activityMap, subjectId, chapterId, mastery])

  return (
    <div className="min-h-screen pb-10">
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4 bg-[var(--color-bg)]/95 backdrop-blur"
        style={{ paddingTop: 'calc(var(--safe-top) + 10px)', paddingBottom: '10px' }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full" aria-label="Retour">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold grow">Mes notions</h1>
      </header>

      <div className="px-4 sm:px-8 max-w-2xl mx-auto">
        <div className="flex gap-2 mb-3">
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value)
              setChapterId('all')
            }}
            className="flex-1 rounded-xl px-3 py-2 bg-[var(--color-surface-muted)] text-sm outline-none"
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
            className="flex-1 rounded-xl px-3 py-2 bg-[var(--color-surface-muted)] text-sm outline-none disabled:opacity-40"
          >
            <option value="all">Tous les chapitres</option>
            {chapters.filter((c) => c.subjectId === subjectId).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
          {MASTERY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMastery(opt.value)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                mastery === opt.value ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
              {opt.label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-10 text-center">Aucune notion pour ce filtre.</p>
        ) : (
          <div className="flex flex-col gap-2 pb-6">
            {rows.map(({ state, title, subtitle }) => (
              <div key={state.id} className="rounded-2xl bg-[var(--color-surface)] p-3.5">
                <div className="flex items-start gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${MASTERY_DOT[state.mastery]}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{title || '(sans titre)'}</p>
                    {subtitle && <p className="text-xs text-[var(--color-text-muted)] truncate">{subtitle}</p>}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {(['unknown', 'review', 'known', 'mastered'] as MasteryLevel[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setCardMasteryManually(state.activityId, state.cardId, m)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${
                        state.mastery === m ? `${MASTERY_DOT[m]} text-white` : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {m === 'unknown' ? '🔴' : m === 'review' ? '🟠' : m === 'known' ? '🟢' : '⭐'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
