import { db } from './schema'
import { newId, now } from '../lib/ids'
import type {
  Activity,
  Chapter,
  DocumentRecord,
  DocumentType,
  Exam,
  ExamAttempt,
  Folder,
  RevisionPlanItem,
  RevisionSheet,
  RevisionSheetFormat,
  RevisionSheetSection,
  StudySession,
  Subject,
} from './types'
import { SUBJECT_COLORS, SUBJECT_ICONS } from '../lib/palette'

// ---------- Subjects ----------

export async function createSubject(name: string, color?: string, icon?: string): Promise<Subject> {
  const count = await db.subjects.count()
  const subject: Subject = {
    id: newId(),
    name,
    color: color ?? SUBJECT_COLORS[count % SUBJECT_COLORS.length],
    icon: icon ?? SUBJECT_ICONS[count % SUBJECT_ICONS.length],
    order: count,
    archived: false,
    createdAt: now(),
    updatedAt: now(),
  }
  await db.subjects.add(subject)
  return subject
}

export async function updateSubject(id: string, patch: Partial<Subject>) {
  await db.subjects.update(id, { ...patch, updatedAt: now() })
}

export async function archiveSubject(id: string, archived = true) {
  await db.subjects.update(id, { archived, updatedAt: now() })
}

export async function deleteSubject(id: string) {
  const folders = await db.folders.where('subjectId').equals(id).toArray()
  const chapters = await db.chapters.where('subjectId').equals(id).toArray()
  const docs = await db.documents.where('subjectId').equals(id).toArray()
  await db.transaction('rw', db.subjects, db.folders, db.chapters, db.documents, db.activities, async () => {
    await db.documents.bulkDelete(docs.map((d) => d.id))
    await db.chapters.bulkDelete(chapters.map((c) => c.id))
    await db.folders.bulkDelete(folders.map((f) => f.id))
    await db.activities.where('subjectIds').equals(id).delete()
    await db.subjects.delete(id)
  })
}

export async function duplicateSubject(id: string): Promise<Subject> {
  const original = await db.subjects.get(id)
  if (!original) throw new Error('Subject not found')
  const copy = await createSubject(`${original.name} (copie)`, original.color, original.icon)

  const folders = await db.folders.where('subjectId').equals(id).toArray()
  const folderIdMap = new Map<string, string>()
  for (const folder of folders) {
    const newFolderId = newId()
    folderIdMap.set(folder.id, newFolderId)
  }
  const newFolders: Folder[] = folders.map((f) => ({
    ...f,
    id: folderIdMap.get(f.id)!,
    subjectId: copy.id,
    parentFolderId: f.parentFolderId ? folderIdMap.get(f.parentFolderId) ?? null : null,
    createdAt: now(),
    updatedAt: now(),
  }))
  await db.folders.bulkAdd(newFolders)

  const chapters = await db.chapters.where('subjectId').equals(id).toArray()
  const chapterIdMap = new Map<string, string>()
  for (const chapter of chapters) chapterIdMap.set(chapter.id, newId())
  const newChapters: Chapter[] = chapters.map((c) => ({
    ...c,
    id: chapterIdMap.get(c.id)!,
    subjectId: copy.id,
    folderId: folderIdMap.get(c.folderId)!,
    createdAt: now(),
    updatedAt: now(),
  }))
  await db.chapters.bulkAdd(newChapters)

  return copy
}

export async function reorderSubjects(orderedIds: string[]) {
  await db.transaction('rw', db.subjects, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.subjects.update(orderedIds[i], { order: i, updatedAt: now() })
    }
  })
}

// ---------- Folders ----------

export async function createFolder(
  subjectId: string,
  name: string,
  parentFolderId: string | null = null,
): Promise<Folder> {
  const count = await db.folders.where('subjectId').equals(subjectId).count()
  const folder: Folder = {
    id: newId(),
    subjectId,
    parentFolderId,
    name,
    order: count,
    archived: false,
    createdAt: now(),
    updatedAt: now(),
  }
  await db.folders.add(folder)
  return folder
}

export async function updateFolder(id: string, patch: Partial<Folder>) {
  await db.folders.update(id, { ...patch, updatedAt: now() })
}

// Archiving a folder cascades to its subfolders and chapters, so an archived chapter's
// activities are excluded from revision without having to walk the folder tree at review time.
export async function archiveFolder(id: string, archived: boolean) {
  const chapters = await db.chapters.where('folderId').equals(id).toArray()
  const childFolders = await db.folders.where('parentFolderId').equals(id).toArray()
  await db.transaction('rw', db.folders, db.chapters, async () => {
    for (const child of childFolders) await archiveFolder(child.id, archived)
    for (const chapter of chapters) await db.chapters.update(chapter.id, { archived, updatedAt: now() })
    await db.folders.update(id, { archived, updatedAt: now() })
  })
}

export async function deleteFolder(id: string) {
  const chapters = await db.chapters.where('folderId').equals(id).toArray()
  const childFolders = await db.folders.where('parentFolderId').equals(id).toArray()
  await db.transaction('rw', db.folders, db.chapters, db.documents, async () => {
    for (const child of childFolders) await deleteFolder(child.id)
    for (const chapter of chapters) await deleteChapter(chapter.id)
    await db.folders.delete(id)
  })
}

// ---------- Chapters ----------

export async function createChapter(subjectId: string, folderId: string, name: string): Promise<Chapter> {
  const count = await db.chapters.where('folderId').equals(folderId).count()
  const chapter: Chapter = {
    id: newId(),
    subjectId,
    folderId,
    name,
    order: count,
    archived: false,
    createdAt: now(),
    updatedAt: now(),
  }
  await db.chapters.add(chapter)
  return chapter
}

export async function updateChapter(id: string, patch: Partial<Chapter>) {
  await db.chapters.update(id, { ...patch, updatedAt: now() })
}

export async function archiveChapter(id: string, archived: boolean) {
  await db.chapters.update(id, { archived, updatedAt: now() })
}

export async function moveChapter(id: string, targetFolderId: string) {
  await db.chapters.update(id, { folderId: targetFolderId, updatedAt: now() })
}

export async function duplicateChapter(id: string): Promise<Chapter> {
  const original = await db.chapters.get(id)
  if (!original) throw new Error('Chapter not found')
  const copy = await createChapter(original.subjectId, original.folderId, `${original.name} (copie)`)
  const docs = await db.documents.where('chapterId').equals(id).toArray()
  const newDocs: DocumentRecord[] = docs.map((d) => ({
    ...d,
    id: newId(),
    chapterId: copy.id,
    createdAt: now(),
    updatedAt: now(),
  }))
  await db.documents.bulkAdd(newDocs)
  return copy
}

export async function deleteChapter(id: string) {
  const docs = await db.documents.where('chapterId').equals(id).toArray()
  await db.transaction('rw', db.chapters, db.documents, db.activities, async () => {
    await db.documents.bulkDelete(docs.map((d) => d.id))
    await db.activities.where('chapterIds').equals(id).delete()
    await db.chapters.delete(id)
  })
}

export async function reorderChapters(orderedIds: string[]) {
  await db.transaction('rw', db.chapters, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.chapters.update(orderedIds[i], { order: i, updatedAt: now() })
    }
  })
}

// ---------- Documents ----------

export async function createDocument(opts: {
  chapterId: string
  subjectId: string
  name: string
  type: DocumentType
  mimeType: string
  blob?: Blob | null
  textContent?: string | null
}): Promise<DocumentRecord> {
  const count = await db.documents.where('chapterId').equals(opts.chapterId).count()
  const doc: DocumentRecord = {
    id: newId(),
    chapterId: opts.chapterId,
    subjectId: opts.subjectId,
    name: opts.name,
    type: opts.type,
    mimeType: opts.mimeType,
    blob: opts.blob ?? null,
    textContent: opts.textContent ?? null,
    extractedText: null,
    aiSummary: null,
    size: opts.blob?.size ?? (opts.textContent?.length ?? 0),
    order: count,
    createdAt: now(),
    updatedAt: now(),
  }
  await db.documents.add(doc)
  return doc
}

export async function updateDocument(id: string, patch: Partial<DocumentRecord>) {
  await db.documents.update(id, { ...patch, updatedAt: now() })
}

export async function deleteDocument(id: string) {
  await db.documents.delete(id)
}

// ---------- Aggregate helpers ----------

export async function getSubjectStats(subjectId: string) {
  const [folders, chapters, documents] = await Promise.all([
    db.folders.where('subjectId').equals(subjectId).count(),
    db.chapters.where('subjectId').equals(subjectId).count(),
    db.documents.where('subjectId').equals(subjectId).count(),
  ])
  return { folders, chapters, documents }
}

export async function estimateStorageUsage(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usage, quota }
}

// ---------- Activities (AI-generated or manual revision content) ----------

export async function createActivity(opts: {
  subjectIds: string[]
  chapterIds: string[]
  type: Activity['type']
  title: string
  source: Activity['source']
  config: Record<string, unknown>
  content: unknown
}): Promise<Activity> {
  const activity: Activity = {
    id: newId(),
    subjectIds: opts.subjectIds,
    chapterIds: opts.chapterIds,
    type: opts.type,
    title: opts.title,
    source: opts.source,
    config: opts.config,
    content: opts.content,
    favorite: false,
    archived: false,
    createdAt: now(),
    updatedAt: now(),
  }
  await db.activities.add(activity)
  return activity
}

export async function deleteActivity(id: string) {
  await db.activities.delete(id)
}

export async function toggleActivityFavorite(id: string, favorite: boolean) {
  await db.activities.update(id, { favorite, updatedAt: now() })
}

export async function toggleActivityArchived(id: string, archived: boolean) {
  await db.activities.update(id, { archived, updatedAt: now() })
}

export async function updateActivityContent(id: string, content: unknown) {
  await db.activities.update(id, { content, updatedAt: now() })
}

export async function updateActivityTitle(id: string, title: string) {
  await db.activities.update(id, { title, updatedAt: now() })
}

// ---------- Exams (calendar entries) ----------

export async function createExam(opts: {
  subjectId: string
  name: string
  date: number
  chapterIds: string[]
  examType: string
  importance: Exam['importance']
  goalGrade: string | null
  notes: string | null
}): Promise<Exam> {
  const exam: Exam = {
    id: newId(),
    ...opts,
    revisionPlan: [],
    createdAt: now(),
    updatedAt: now(),
  }
  await db.exams.add(exam)
  return exam
}

export async function updateExam(id: string, patch: Partial<Exam>) {
  await db.exams.update(id, { ...patch, updatedAt: now() })
}

export async function deleteExam(id: string) {
  await db.exams.delete(id)
}

export async function setRevisionPlan(examId: string, items: RevisionPlanItem[]) {
  await db.exams.update(examId, { revisionPlan: items, updatedAt: now() })
}

export async function toggleRevisionPlanItem(examId: string, itemId: string, done: boolean) {
  const exam = await db.exams.get(examId)
  if (!exam) return
  const plan = exam.revisionPlan.map((item) => (item.id === itemId ? { ...item, done } : item))
  await db.exams.update(examId, { revisionPlan: plan, updatedAt: now() })
}

export async function deleteRevisionPlanItem(examId: string, itemId: string) {
  const exam = await db.exams.get(examId)
  if (!exam) return
  const plan = exam.revisionPlan.filter((item) => item.id !== itemId)
  await db.exams.update(examId, { revisionPlan: plan, updatedAt: now() })
}

// ---------- Exam attempts (mock exams taken) ----------

// ---------- Study sessions (for stats) ----------

export async function createStudySession(opts: {
  type: StudySession['type']
  subjectIds: string[]
  chapterIds: string[]
}): Promise<StudySession> {
  const session: StudySession = {
    id: newId(),
    type: opts.type,
    subjectIds: opts.subjectIds,
    chapterIds: opts.chapterIds,
    startedAt: now(),
    endedAt: null,
    cardsSeen: 0,
    correct: 0,
    incorrect: 0,
  }
  await db.sessions.add(session)
  return session
}

export async function updateStudySession(
  id: string,
  patch: Partial<Pick<StudySession, 'cardsSeen' | 'correct' | 'incorrect' | 'endedAt'>>,
) {
  await db.sessions.update(id, patch)
}

// ---------- Revision sheets (fiches de révision) ----------

export async function createRevisionSheet(opts: {
  subjectId: string
  chapterIds: string[]
  format: RevisionSheetFormat
  title: string
  sections: RevisionSheetSection[]
}): Promise<RevisionSheet> {
  const sheet: RevisionSheet = { id: newId(), ...opts, createdAt: now(), updatedAt: now() }
  await db.revisionSheets.add(sheet)
  return sheet
}

export async function deleteRevisionSheet(id: string) {
  await db.revisionSheets.delete(id)
}

export async function createExamAttempt(opts: {
  examId: string | null
  subjectId: string
  title: string
  durationSeconds: number
  score: number
  maxScore: number
  answers: unknown
}): Promise<ExamAttempt> {
  const attempt: ExamAttempt = {
    id: newId(),
    ...opts,
    createdAt: now(),
  }
  await db.examAttempts.add(attempt)
  return attempt
}
