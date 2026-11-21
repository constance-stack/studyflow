import { db } from '../db/schema'
import type { StudyItem } from './deck'
import type { SessionConfig } from '../pages/StudySession'

const KEY = 'active_study_session'

export interface ActiveSessionSnapshot {
  config: SessionConfig
  queue: StudyItem[]
  current: StudyItem | null
  totalInitial: number
  seenCount: number
  cardInstanceKey: number
  doneCount: number
  attempts: [string, number][]
  seenFirstTry: string[]
  multipleAttempts: string[]
  stillDifficult: string[]
  sessionId: string | null
  correct: number
  incorrect: number
  remainingSeconds: number | null
  savedAt: number
}

export async function saveActiveSession(snapshot: ActiveSessionSnapshot): Promise<void> {
  await db.settings.put({ key: KEY, value: snapshot })
}

export async function loadActiveSession(): Promise<ActiveSessionSnapshot | null> {
  const row = await db.settings.get(KEY)
  return (row?.value as ActiveSessionSnapshot | undefined) ?? null
}

export async function clearActiveSession(): Promise<void> {
  await db.settings.delete(KEY)
}
