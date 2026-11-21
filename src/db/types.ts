export type ID = string

export interface Subject {
  id: ID
  name: string
  color: string
  icon: string
  order: number
  archived: boolean
  createdAt: number
  updatedAt: number
}

export interface Folder {
  id: ID
  subjectId: ID
  parentFolderId: ID | null
  name: string
  order: number
  archived: boolean
  createdAt: number
  updatedAt: number
}

export interface Chapter {
  id: ID
  subjectId: ID
  folderId: ID
  name: string
  order: number
  archived: boolean
  createdAt: number
  updatedAt: number
}

export type DocumentType = 'pdf' | 'image' | 'text' | 'note'

export interface DocumentRecord {
  id: ID
  chapterId: ID
  subjectId: ID
  name: string
  type: DocumentType
  mimeType: string
  blob: Blob | null
  textContent: string | null
  extractedText: string | null
  aiSummary: string | null
  size: number
  order: number
  createdAt: number
  updatedAt: number
}

// Phase 2+: AI-generated or manually created revision activities.
export type ActivityType =
  | 'flashcard'
  | 'qcm'
  | 'open'
  | 'truefalse'
  | 'blank'
  | 'match'
  | 'minilesson'
  | 'miniexercise'
  | 'exercise'
  | 'reflection'
  | 'vocab'
  | 'timeline'

export interface Activity {
  id: ID
  subjectIds: ID[]
  chapterIds: ID[]
  type: ActivityType
  title: string
  source: 'ai' | 'manual'
  config: Record<string, unknown>
  content: unknown
  favorite: boolean
  createdAt: number
  updatedAt: number
}

// Phase 3: mastery tracking per card/notion (Quizlet-style tiers + spaced repetition).
export type MasteryLevel = 'unknown' | 'review' | 'known' | 'mastered'

export interface CardState {
  id: ID
  activityId: ID
  cardId: string
  mastery: MasteryLevel
  dueDate: number
  lastReviewedAt: number | null
  reviewHistory: Array<{ date: number; rating: MasteryLevel }>
  stability: number
  difficulty: number
  createdAt: number
  updatedAt: number
}

// Phase 4: calendar / exams.
export interface RevisionPlanItem {
  id: ID
  date: number
  description: string
  chapterIds: ID[]
  done: boolean
}

export interface Exam {
  id: ID
  subjectId: ID
  name: string
  date: number
  chapterIds: ID[]
  examType: string
  importance: 'low' | 'medium' | 'high'
  goalGrade: string | null
  notes: string | null
  revisionPlan: RevisionPlanItem[]
  createdAt: number
  updatedAt: number
}

export interface ExamAttempt {
  id: ID
  examId: ID | null
  subjectId: ID
  title: string
  durationSeconds: number
  score: number | null
  maxScore: number | null
  answers: unknown
  createdAt: number
}

// Phase 4/5: session + stats log.
export interface StudySession {
  id: ID
  type: 'mixed' | 'flashcard' | 'quiz' | 'exam' | 'other'
  subjectIds: ID[]
  chapterIds: ID[]
  startedAt: number
  endedAt: number | null
  cardsSeen: number
  correct: number
  incorrect: number
}

export interface Settings {
  key: string
  value: unknown
}

// Phase 5: printable revision sheets ("fiches de révision").
export type RevisionSheetFormat =
  | 'resume_court'
  | 'resume_detaille'
  | 'definitions'
  | 'formules'
  | 'chronologique'
  | 'vocabulaire'
  | 'litterature'

export interface RevisionSheetSection {
  heading: string
  body: string
}

export interface RevisionSheet {
  id: ID
  subjectId: ID
  chapterIds: ID[]
  format: RevisionSheetFormat
  title: string
  sections: RevisionSheetSection[]
  createdAt: number
  updatedAt: number
}

// Phase 5: gamification.
export interface GamificationState {
  xp: number
  totalCardsReviewed: number
  dailyGoalCards: number
  lastActiveDay: number | null
  currentStreak: number
  bestStreak: number
  enabled: boolean
}
