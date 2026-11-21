import type { MasteryLevel } from '../db/types'

// A lightweight spaced-repetition scheduler (SM-2-inspired, not literal FSRS — see README).
// `stability` tracks the current interval in days; `difficulty` is an ease factor in [0.13, 1].

export interface SchedulerState {
  mastery: MasteryLevel
  stability: number
  difficulty: number
}

const MIN_DIFFICULTY = 0.13
const MAX_DIFFICULTY = 1

export function initialSchedulerState(): SchedulerState {
  return { mastery: 'unknown', stability: 0, difficulty: 0.3 }
}

const DAY_MS = 24 * 60 * 60 * 1000

export function nextReview(current: SchedulerState, rating: MasteryLevel): { state: SchedulerState; dueDate: number } {
  let { stability, difficulty } = current

  if (rating === 'unknown') {
    difficulty = Math.min(MAX_DIFFICULTY, difficulty + 0.2)
    stability = 0
    return { state: { mastery: rating, stability, difficulty }, dueDate: Date.now() }
  }

  if (rating === 'review') {
    difficulty = Math.min(MAX_DIFFICULTY, difficulty + 0.08)
    stability = Math.max(1, stability * 1.3)
    return { state: { mastery: rating, stability, difficulty }, dueDate: Date.now() + stability * DAY_MS }
  }

  // 'known' or 'mastered': interval grows faster, ease improves.
  difficulty = Math.max(MIN_DIFFICULTY, difficulty - (rating === 'mastered' ? 0.12 : 0.05))
  const growth = rating === 'mastered' ? 3 : 2.2
  stability = Math.max(rating === 'mastered' ? 7 : 3, stability * growth * (1.3 - difficulty))
  return { state: { mastery: rating, stability, difficulty }, dueDate: Date.now() + stability * DAY_MS }
}
