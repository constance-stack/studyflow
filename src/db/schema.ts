import Dexie, { type EntityTable } from 'dexie'
import type {
  Activity,
  CardState,
  Chapter,
  DocumentRecord,
  Exam,
  ExamAttempt,
  Folder,
  RevisionSheet,
  Settings,
  StudySession,
  Subject,
} from './types'

export class StudyFlowDB extends Dexie {
  subjects!: EntityTable<Subject, 'id'>
  folders!: EntityTable<Folder, 'id'>
  chapters!: EntityTable<Chapter, 'id'>
  documents!: EntityTable<DocumentRecord, 'id'>
  activities!: EntityTable<Activity, 'id'>
  cardStates!: EntityTable<CardState, 'id'>
  exams!: EntityTable<Exam, 'id'>
  examAttempts!: EntityTable<ExamAttempt, 'id'>
  sessions!: EntityTable<StudySession, 'id'>
  settings!: EntityTable<Settings, 'key'>
  revisionSheets!: EntityTable<RevisionSheet, 'id'>

  constructor() {
    super('studyflow')
    this.version(1).stores({
      subjects: 'id, order',
      folders: 'id, subjectId, parentFolderId, order',
      chapters: 'id, subjectId, folderId, order',
      documents: 'id, chapterId, subjectId, order',
      activities: 'id, *subjectIds, *chapterIds, type',
      cardStates: 'id, activityId, dueDate, mastery',
      exams: 'id, subjectId, date',
      examAttempts: 'id, examId, subjectId, createdAt',
      sessions: 'id, startedAt',
      settings: 'key',
    })
    this.version(2).stores({
      revisionSheets: 'id, subjectId, *chapterIds, createdAt',
    })
  }
}

export const db = new StudyFlowDB()
