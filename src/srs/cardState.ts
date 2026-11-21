import { db } from '../db/schema'
import { now } from '../lib/ids'
import type { CardState, MasteryLevel } from '../db/types'
import { initialSchedulerState, nextReview } from './scheduler'

function stateId(activityId: string, cardId: string) {
  return `${activityId}:${cardId}`
}

export async function getCardState(activityId: string, cardId: string): Promise<CardState | undefined> {
  return db.cardStates.get(stateId(activityId, cardId))
}

export async function getCardStatesForActivities(activityIds: string[]): Promise<Map<string, CardState>> {
  const all = await db.cardStates.where('activityId').anyOf(activityIds).toArray()
  const map = new Map<string, CardState>()
  for (const s of all) map.set(stateId(s.activityId, s.cardId), s)
  return map
}

export async function rateCard(activityId: string, cardId: string, rating: MasteryLevel): Promise<CardState> {
  const id = stateId(activityId, cardId)
  const existing = await db.cardStates.get(id)
  const base = existing
    ? { mastery: existing.mastery, stability: existing.stability, difficulty: existing.difficulty }
    : initialSchedulerState()
  const { state, dueDate } = nextReview(base, rating)

  const history = existing?.reviewHistory ?? []
  history.push({ date: now(), rating })

  const record: CardState = {
    id,
    activityId,
    cardId,
    mastery: state.mastery,
    dueDate,
    lastReviewedAt: now(),
    reviewHistory: history,
    stability: state.stability,
    difficulty: state.difficulty,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  }
  await db.cardStates.put(record)
  return record
}

export async function setCardMasteryManually(activityId: string, cardId: string, mastery: MasteryLevel) {
  return rateCard(activityId, cardId, mastery)
}

export async function getDueCardStates(before = Date.now()): Promise<CardState[]> {
  return db.cardStates.where('dueDate').belowOrEqual(before).toArray()
}
