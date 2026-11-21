import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Trophy, Target } from 'lucide-react'
import { getGamificationState, xpForLevel } from '../gamification/state'
import { startOfDay } from '../lib/dates'
import { db } from '../db/schema'

export function GamificationCard() {
  const state = useLiveQuery(() => getGamificationState())
  const todaySessions = useLiveQuery(() =>
    db.sessions.where('startedAt').aboveOrEqual(startOfDay(Date.now())).toArray(),
  ) ?? []

  if (!state || !state.enabled) return null

  const { level, xpIntoLevel, xpForNextLevel } = xpForLevel(state.xp)
  const cardsToday = todaySessions.reduce((sum, s) => sum + s.cardsSeen, 0)
  const goalPct = Math.min(100, Math.round((cardsToday / state.dailyGoalCards) * 100))

  return (
    <div className="rounded-2xl bg-[var(--color-surface)] p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-yellow-500" />
          <span className="font-semibold text-sm">Niveau {level}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-orange-500">
          <Flame size={16} />
          {state.currentStreak} jour{state.currentStreak > 1 ? 's' : ''}
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-[var(--color-surface-muted)] overflow-hidden mb-1">
        <div
          className="h-full bg-yellow-500 rounded-full transition-all"
          style={{ width: `${Math.round((xpIntoLevel / xpForNextLevel) * 100)}%` }}
        />
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-3">
        {xpIntoLevel} / {xpForNextLevel} XP
      </p>

      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-1">
        <Target size={13} /> Objectif du jour : {cardsToday}/{state.dailyGoalCards} cartes
      </div>
      <div className="h-1.5 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
        <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${goalPct}%` }} />
      </div>
    </div>
  )
}
