import { getActiveProvider } from './client'
import {
  EXTRACTION_SYSTEM_PROMPT,
  extractionUserPrompt,
  FLASHCARD_SYSTEM_PROMPT,
  QCM_SYSTEM_PROMPT,
  MINILESSON_SYSTEM_PROMPT,
  OPEN_QUESTION_SYSTEM_PROMPT,
  GRADE_OPEN_ANSWER_SYSTEM_PROMPT,
  gradeOpenAnswerPrompt,
  activityUserPrompt,
  MOCK_EXAM_SYSTEM_PROMPT,
  mockExamUserPrompt,
  GRADE_EXAM_OPEN_SYSTEM_PROMPT,
  gradeExamOpenPrompt,
  REVISION_PLAN_SYSTEM_PROMPT,
  revisionPlanUserPrompt,
  TRUEFALSE_SYSTEM_PROMPT,
  BLANK_SYSTEM_PROMPT,
  MATCH_SYSTEM_PROMPT,
  VOCAB_SYSTEM_PROMPT,
  TIMELINE_SYSTEM_PROMPT,
  REFLECTION_SYSTEM_PROMPT,
  EXERCISE_SYSTEM_PROMPT,
  REVISION_SHEET_SYSTEM_PROMPT,
  revisionSheetUserPrompt,
} from './prompts'
import type { RevisionSheetSection } from '../db/types'
import type { ImagePart } from './types'

export interface ExtractionResult {
  extractedText: string
  summary: string
  warnings: string[]
}

export interface FlashcardItem {
  front: string
  back: string
}

export interface QCMItem {
  question: string
  choices: string[]
  correctIndices: number[]
  explanation: string
}

export interface MiniLessonItem {
  concept: string
  explanation: string
  example: string
  checkQuestion: string
  checkAnswer: string
}

export interface OpenQuestionItem {
  question: string
  expectedAnswer: string
  hints: string[]
}

export interface TrueFalseItem {
  statement: string
  isTrue: boolean
  justification: string
}

export interface BlankItem {
  textWithBlank: string
  answer: string
}

export interface MatchPair {
  left: string
  right: string
}

export interface VocabItem {
  term: string
  translation: string
  example: string
}

export interface TimelineEvent {
  label: string
  date: string
  order: number
}

export interface ReflectionItem {
  prompt: string
  guidance: string
}

export interface ExerciseItem {
  statement: string
  hints: string[]
  steps: string[]
  finalAnswer: string
}

export interface GradeResult {
  verdict: 'correct' | 'partiel' | 'incorrect'
  feedback: string
  missingPoints: string[]
}

async function requireProvider() {
  const provider = await getActiveProvider()
  if (!provider) throw new Error("L'IA n'est pas configurée. Configure-la dans l'onglet Assistant IA.")
  return provider
}

export async function extractDocumentContent(documentName: string, images: ImagePart[]): Promise<ExtractionResult> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({
    systemPrompt: EXTRACTION_SYSTEM_PROMPT,
    userPrompt: extractionUserPrompt(documentName),
    images,
  })
  const r = result as Partial<ExtractionResult>
  return {
    extractedText: typeof r.extractedText === 'string' ? r.extractedText : '',
    summary: typeof r.summary === 'string' ? r.summary : '',
    warnings: Array.isArray(r.warnings) ? r.warnings.filter((w): w is string => typeof w === 'string') : [],
  }
}

export interface GenerationParams {
  content: string
  count: number
  difficulty: string
  instructions: string
  exhaustive?: boolean
}

export async function generateFlashcards(params: GenerationParams): Promise<FlashcardItem[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({
    systemPrompt: FLASHCARD_SYSTEM_PROMPT,
    userPrompt: activityUserPrompt(params),
  })
  const cards = (result as { cards?: unknown }).cards
  if (!Array.isArray(cards)) throw new Error("Format de réponse inattendu de l'IA.")
  return cards
    .filter((c): c is FlashcardItem => !!c && typeof c.front === 'string' && typeof c.back === 'string')
}

export async function generateQCM(params: GenerationParams): Promise<QCMItem[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({
    systemPrompt: QCM_SYSTEM_PROMPT,
    userPrompt: activityUserPrompt(params),
  })
  const questions = (result as { questions?: unknown }).questions
  if (!Array.isArray(questions)) throw new Error("Format de réponse inattendu de l'IA.")
  return questions.filter(
    (q): q is QCMItem =>
      !!q && typeof q.question === 'string' && Array.isArray(q.choices) && Array.isArray(q.correctIndices),
  )
}

export async function generateMiniLessons(params: GenerationParams): Promise<MiniLessonItem[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({
    systemPrompt: MINILESSON_SYSTEM_PROMPT,
    userPrompt: activityUserPrompt(params),
  })
  const lessons = (result as { lessons?: unknown }).lessons
  if (!Array.isArray(lessons)) throw new Error("Format de réponse inattendu de l'IA.")
  return lessons.filter((l): l is MiniLessonItem => !!l && typeof l.concept === 'string')
}

export async function generateOpenQuestions(params: GenerationParams): Promise<OpenQuestionItem[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({
    systemPrompt: OPEN_QUESTION_SYSTEM_PROMPT,
    userPrompt: activityUserPrompt(params),
  })
  const questions = (result as { questions?: unknown }).questions
  if (!Array.isArray(questions)) throw new Error("Format de réponse inattendu de l'IA.")
  return questions
    .filter((q): q is OpenQuestionItem => !!q && typeof q.question === 'string' && typeof q.expectedAnswer === 'string')
    .map((q) => ({ ...q, hints: Array.isArray(q.hints) ? q.hints : [] }))
}

export type MockExamQuestion =
  | { type: 'qcm'; question: string; points: number; choices: string[]; correctIndices: number[]; explanation: string }
  | { type: 'open'; question: string; points: number; expectedAnswer: string }

export async function generateMockExam(opts: {
  content: string
  examType: string
  questionCount: number
  difficulty: string
  barème: number
  durationMinutes: number
  instructions: string
}): Promise<MockExamQuestion[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({
    systemPrompt: MOCK_EXAM_SYSTEM_PROMPT,
    userPrompt: mockExamUserPrompt(opts),
  })
  const questions = (result as { questions?: unknown }).questions
  if (!Array.isArray(questions)) throw new Error("Format de réponse inattendu de l'IA.")
  return questions.filter(
    (q): q is MockExamQuestion =>
      !!q && (q.type === 'qcm' || q.type === 'open') && typeof q.question === 'string' && typeof q.points === 'number',
  )
}

export async function gradeExamOpenQuestion(
  question: string,
  expectedAnswer: string,
  userAnswer: string,
  maxPoints: number,
): Promise<{ score: number; feedback: string }> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({
    systemPrompt: GRADE_EXAM_OPEN_SYSTEM_PROMPT,
    userPrompt: gradeExamOpenPrompt(question, expectedAnswer, userAnswer, maxPoints),
  })
  const r = result as { score?: unknown; feedback?: unknown }
  const score = typeof r.score === 'number' ? Math.max(0, Math.min(maxPoints, r.score)) : 0
  return { score, feedback: typeof r.feedback === 'string' ? r.feedback : '' }
}

export interface RevisionPlanSuggestion {
  dayOffset: number
  description: string
  chapterNames: string[]
}

export async function generateRevisionPlan(
  examName: string,
  daysRemaining: number,
  chapterNames: string[],
): Promise<RevisionPlanSuggestion[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({
    systemPrompt: REVISION_PLAN_SYSTEM_PROMPT,
    userPrompt: revisionPlanUserPrompt(examName, daysRemaining, chapterNames),
  })
  const plan = (result as { plan?: unknown }).plan
  if (!Array.isArray(plan)) throw new Error("Format de réponse inattendu de l'IA.")
  return plan.filter(
    (p): p is RevisionPlanSuggestion => !!p && typeof p.dayOffset === 'number' && typeof p.description === 'string',
  )
}

export async function generateTrueFalse(params: GenerationParams): Promise<TrueFalseItem[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({ systemPrompt: TRUEFALSE_SYSTEM_PROMPT, userPrompt: activityUserPrompt(params) })
  const statements = (result as { statements?: unknown }).statements
  if (!Array.isArray(statements)) throw new Error("Format de réponse inattendu de l'IA.")
  return statements.filter((s): s is TrueFalseItem => !!s && typeof s.statement === 'string' && typeof s.isTrue === 'boolean')
}

export async function generateBlanks(params: GenerationParams): Promise<BlankItem[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({ systemPrompt: BLANK_SYSTEM_PROMPT, userPrompt: activityUserPrompt(params) })
  const items = (result as { items?: unknown }).items
  if (!Array.isArray(items)) throw new Error("Format de réponse inattendu de l'IA.")
  return items.filter((i): i is BlankItem => !!i && typeof i.textWithBlank === 'string' && typeof i.answer === 'string')
}

export async function generateMatchPairs(params: GenerationParams): Promise<MatchPair[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({ systemPrompt: MATCH_SYSTEM_PROMPT, userPrompt: activityUserPrompt(params) })
  const pairs = (result as { pairs?: unknown }).pairs
  if (!Array.isArray(pairs)) throw new Error("Format de réponse inattendu de l'IA.")
  return pairs.filter((p): p is MatchPair => !!p && typeof p.left === 'string' && typeof p.right === 'string')
}

export async function generateVocab(params: GenerationParams): Promise<VocabItem[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({ systemPrompt: VOCAB_SYSTEM_PROMPT, userPrompt: activityUserPrompt(params) })
  const items = (result as { items?: unknown }).items
  if (!Array.isArray(items)) throw new Error("Format de réponse inattendu de l'IA.")
  return items.filter((i): i is VocabItem => !!i && typeof i.term === 'string' && typeof i.translation === 'string')
}

export async function generateTimeline(params: GenerationParams): Promise<TimelineEvent[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({ systemPrompt: TIMELINE_SYSTEM_PROMPT, userPrompt: activityUserPrompt(params) })
  const events = (result as { events?: unknown }).events
  if (!Array.isArray(events)) throw new Error("Format de réponse inattendu de l'IA.")
  return events
    .filter((e): e is TimelineEvent => !!e && typeof e.label === 'string' && typeof e.order === 'number')
    .sort((a, b) => a.order - b.order)
}

export async function generateReflections(params: GenerationParams): Promise<ReflectionItem[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({ systemPrompt: REFLECTION_SYSTEM_PROMPT, userPrompt: activityUserPrompt(params) })
  const questions = (result as { questions?: unknown }).questions
  if (!Array.isArray(questions)) throw new Error("Format de réponse inattendu de l'IA.")
  return questions.filter((q): q is ReflectionItem => !!q && typeof q.prompt === 'string')
}

export async function generateExercises(params: GenerationParams): Promise<ExerciseItem[]> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({ systemPrompt: EXERCISE_SYSTEM_PROMPT, userPrompt: activityUserPrompt(params) })
  const exercises = (result as { exercises?: unknown }).exercises
  if (!Array.isArray(exercises)) throw new Error("Format de réponse inattendu de l'IA.")
  return exercises
    .filter((e): e is ExerciseItem => !!e && typeof e.statement === 'string')
    .map((e) => ({ ...e, hints: Array.isArray(e.hints) ? e.hints : [], steps: Array.isArray(e.steps) ? e.steps : [] }))
}

export async function generateRevisionSheet(
  content: string,
  format: string,
  instructions: string,
): Promise<{ title: string; sections: RevisionSheetSection[] }> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({
    systemPrompt: REVISION_SHEET_SYSTEM_PROMPT,
    userPrompt: revisionSheetUserPrompt(content, format, instructions),
  })
  const r = result as { title?: unknown; sections?: unknown }
  const sections = Array.isArray(r.sections)
    ? r.sections.filter((s): s is RevisionSheetSection => !!s && typeof s.heading === 'string' && typeof s.body === 'string')
    : []
  if (sections.length === 0) throw new Error("L'IA n'a généré aucune section pour cette fiche.")
  return { title: typeof r.title === 'string' ? r.title : 'Fiche de révision', sections }
}

export async function gradeOpenAnswer(question: string, expectedAnswer: string, userAnswer: string): Promise<GradeResult> {
  const provider = await requireProvider()
  const result = await provider.generateJSON({
    systemPrompt: GRADE_OPEN_ANSWER_SYSTEM_PROMPT,
    userPrompt: gradeOpenAnswerPrompt(question, expectedAnswer, userAnswer),
  })
  const r = result as Partial<GradeResult>
  return {
    verdict: r.verdict === 'correct' || r.verdict === 'partiel' ? r.verdict : 'incorrect',
    feedback: typeof r.feedback === 'string' ? r.feedback : '',
    missingPoints: Array.isArray(r.missingPoints) ? r.missingPoints.filter((p): p is string => typeof p === 'string') : [],
  }
}
