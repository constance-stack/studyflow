import { db } from '../db/schema'
import { startOfDay } from '../lib/dates'
import type { GamificationState } from '../db/types'

const KEY = 'gamification'

const DEFAULT_STATE: GamificationState = {
  xp: 0,
  totalCardsReviewed: 0,
  dailyGoalCards: 20,
  lastActiveDay: null,
  currentStreak: 0,
  bestStreak: 0,
  enabled: true,
}

export async function getGamificationState(): Promise<GamificationState> {
  const row = await db.settings.get(KEY)
  return { ...DEFAULT_STATE, ...((row?.value as Partial<GamificationState>) ?? {}) }
}

async function saveState(state: GamificationState): Promise<void> {
  await db.settings.put({ key: KEY, value: state })
}

export async function setGamificationEnabled(enabled: boolean): Promise<void> {
  const state = await getGamificationState()
  await saveState({ ...state, enabled })
}

export async function setDailyGoal(cards: number): Promise<void> {
  const state = await getGamificationState()
  await saveState({ ...state, dailyGoalCards: Math.max(1, cards) })
}

export function xpForLevel(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  // Each level needs progressively a bit more XP (gentle curve, not punishing).
  let level = 1
  let threshold = 100
  let remaining = xp
  while (remaining >= threshold) {
    remaining -= threshold
    level += 1
    threshold = Math.round(threshold * 1.25)
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: threshold }
}

export async function awardXp(amount: number): Promise<void> {
  const state = await getGamificationState()
  await saveState({ ...state, xp: Math.max(0, state.xp + amount) })
}

// Called once per finished study session: updates XP, cumulative count and the daily streak.
export async function recordSessionCompletion(cardsSeen: number, correct: number): Promise<void> {
  const state = await getGamificationState()
  const today = startOfDay(Date.now())
  let { currentStreak, bestStreak } = state

  if (state.lastActiveDay === null || state.lastActiveDay < today) {
    const dayBefore = today - 86400000
    currentStreak = state.lastActiveDay === dayBefore ? currentStreak + 1 : 1
    bestStreak = Math.max(bestStreak, currentStreak)
  }

  await saveState({
    ...state,
    xp: Math.max(0, state.xp + correct * 10 + Math.max(0, cardsSeen - correct) * 2),
    totalCardsReviewed: state.totalCardsReviewed + cardsSeen,
    lastActiveDay: today,
    currentStreak,
    bestStreak,
  })
}
