import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../db/schema'
import { ExamReview } from '../components/ExamReview'
import type { StoredExamResult } from '../exam/types'

export function ExamAttemptReview() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const attempt = useLiveQuery(() => db.examAttempts.get(attemptId!), [attemptId])

  if (!attempt) return null
  const stored = attempt.answers as StoredExamResult

  return (
    <ExamReview
      title={attempt.title}
      answers={stored.answers}
      totalScore={stored.totalScore}
      maxScore={stored.maxScore}
      onClose={() => navigate('/exams')}
    />
  )
}
