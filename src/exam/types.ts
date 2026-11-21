import type { MockExamQuestion } from '../ai/generate'

export interface ExamSetupConfig {
  subjectId: string
  chapterIds: string[]
  name: string
  examType: string
  difficulty: string
  questionCount: number
  barème: number
  durationMinutes: number
  instructions: string
  examId: string | null
}

export interface StoredExamAnswer {
  question: MockExamQuestion
  userSelected: number[] | null
  userText: string | null
  earnedPoints: number
  feedback: string | null
  graded: boolean
}

export interface StoredExamResult {
  config: ExamSetupConfig
  answers: StoredExamAnswer[]
  totalScore: number
  maxScore: number
  durationSeconds: number
}
