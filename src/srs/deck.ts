import type { Activity, CardState } from '../db/types'
import type {
  FlashcardItem,
  MiniLessonItem,
  OpenQuestionItem,
  QCMItem,
  TrueFalseItem,
  BlankItem,
  MatchPair,
  VocabItem,
  TimelineEvent,
  ReflectionItem,
  ExerciseItem,
} from '../ai/generate'

export type StudyPayload =
  | FlashcardItem
  | QCMItem
  | MiniLessonItem
  | OpenQuestionItem
  | TrueFalseItem
  | BlankItem
  | { pairs: MatchPair[] }
  | VocabItem
  | { events: TimelineEvent[] }
  | ReflectionItem
  | ExerciseItem

export interface StudyItem {
  activityId: string
  activityTitle: string
  cardId: string
  type: Activity['type']
  payload: StudyPayload
}

export type DeckFilter = 'all' | 'due' | 'failed'

function stateKey(activityId: string, cardId: string) {
  return `${activityId}:${cardId}`
}

export function activityItems(activity: Activity): StudyItem[] {
  if (!Array.isArray(activity.content)) return []
  return activity.content.map((payload, i) => ({
    activityId: activity.id,
    activityTitle: activity.title,
    cardId: String(i),
    type: activity.type,
    payload,
  }))
}

export function buildDeck(
  activities: Activity[],
  filter: DeckFilter,
  cardStates: Map<string, CardState>,
  now = Date.now(),
): StudyItem[] {
  const items = activities.flatMap(activityItems)
  if (filter === 'all') return shuffleMixed(items)

  const filtered = items.filter((item) => {
    const state = cardStates.get(stateKey(item.activityId, item.cardId))
    if (filter === 'due') return !state || state.dueDate <= now
    if (filter === 'failed') return state && (state.mastery === 'unknown' || state.mastery === 'review')
    return true
  })
  return shuffleMixed(filtered)
}

// Shuffles while avoiding two consecutive items of the same type when the mix allows it.
function shuffleMixed(items: StudyItem[]): StudyItem[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const result: StudyItem[] = []
  const pool = [...shuffled]
  while (pool.length) {
    const lastType = result[result.length - 1]?.type
    let idx = pool.findIndex((item) => item.type !== lastType)
    if (idx === -1) idx = 0
    result.push(pool[idx])
    pool.splice(idx, 1)
  }
  return result
}
