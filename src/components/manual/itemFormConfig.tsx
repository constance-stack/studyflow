import type { ActivityType } from '../../db/types'

// Describes, per activity type, a summary line for a list row (used by the generic items editor).
export function summarizeItem(type: ActivityType, item: unknown): { title: string; subtitle?: string } {
  const it = item as Record<string, unknown>
  switch (type) {
    case 'flashcard':
      return { title: String(it.front ?? ''), subtitle: String(it.back ?? '') }
    case 'qcm':
      return { title: String(it.question ?? ''), subtitle: `${(it.choices as string[] | undefined)?.length ?? 0} choix` }
    case 'truefalse':
      return { title: String(it.statement ?? ''), subtitle: it.isTrue ? 'Vrai' : 'Faux' }
    case 'blank':
      return { title: String(it.textWithBlank ?? ''), subtitle: String(it.answer ?? '') }
    case 'open':
      return { title: String(it.question ?? ''), subtitle: String(it.expectedAnswer ?? '') }
    case 'vocab':
      return { title: String(it.term ?? ''), subtitle: String(it.translation ?? '') }
    case 'minilesson':
      return { title: String(it.concept ?? ''), subtitle: String(it.explanation ?? '') }
    case 'reflection':
      return { title: String(it.prompt ?? ''), subtitle: String(it.guidance ?? '') }
    case 'miniexercise':
    case 'exercise':
      return { title: String(it.statement ?? ''), subtitle: `${(it.steps as string[] | undefined)?.length ?? 0} étape(s)` }
    case 'match':
      return { title: String(it.left ?? ''), subtitle: String(it.right ?? '') }
    case 'timeline':
      return { title: String(it.label ?? ''), subtitle: String(it.date ?? '') }
    default:
      return { title: JSON.stringify(item).slice(0, 60) }
  }
}

export function emptyDraft(type: ActivityType): Record<string, unknown> {
  switch (type) {
    case 'flashcard':
      return { front: '', back: '' }
    case 'qcm':
      return { question: '', choices: ['', ''], correctIndices: [0], explanation: '' }
    case 'truefalse':
      return { statement: '', isTrue: true, justification: '' }
    case 'blank':
      return { textWithBlank: '', answer: '' }
    case 'open':
      return { question: '', expectedAnswer: '', hints: [] }
    case 'vocab':
      return { term: '', translation: '', example: '' }
    case 'minilesson':
      return { concept: '', explanation: '', example: '', checkQuestion: '', checkAnswer: '' }
    case 'reflection':
      return { prompt: '', guidance: '' }
    case 'miniexercise':
    case 'exercise':
      return { statement: '', hints: [], steps: [], finalAnswer: '' }
    case 'match':
      return { left: '', right: '' }
    case 'timeline':
      return { label: '', date: '', order: 0 }
    default:
      return {}
  }
}
