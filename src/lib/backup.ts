import { db } from '../db/schema'
import { AI_SETTINGS_KEY } from '../ai/settings'
import { blobToBase64, base64ToBlob } from './base64'

const BACKUP_VERSION = 1

export async function exportBackup(): Promise<void> {
  const [subjects, folders, chapters, documents, activities, cardStates, exams, examAttempts, sessions, settings] =
    await Promise.all([
      db.subjects.toArray(),
      db.folders.toArray(),
      db.chapters.toArray(),
      db.documents.toArray(),
      db.activities.toArray(),
      db.cardStates.toArray(),
      db.exams.toArray(),
      db.examAttempts.toArray(),
      db.sessions.toArray(),
      db.settings.toArray(),
    ])

  const documentsSerialized = await Promise.all(
    documents.map(async (d) => ({
      ...d,
      blob: d.blob ? { base64: await blobToBase64(d.blob), mimeType: d.mimeType } : null,
    })),
  )

  // API keys must never leave the device inside a shareable backup file.
  const settingsWithoutSecrets = settings.filter((s) => s.key !== AI_SETTINGS_KEY)

  const payload = {
    app: 'studyflow',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    data: {
      subjects,
      folders,
      chapters,
      documents: documentsSerialized,
      activities,
      cardStates,
      exams,
      examAttempts,
      sessions,
      settings: settingsWithoutSecrets,
    },
  }

  const json = JSON.stringify(payload)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `studyflow-sauvegarde-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File): Promise<{ subjects: number; documents: number }> {
  const text = await file.text()
  const payload = JSON.parse(text)
  if (payload.app !== 'studyflow' || !payload.data) {
    throw new Error('Fichier de sauvegarde invalide.')
  }
  const { subjects, folders, chapters, documents, activities, cardStates, exams, examAttempts, sessions, settings } =
    payload.data

  const documentsDeserialized = (documents ?? []).map((d: any) => ({
    ...d,
    blob: d.blob ? base64ToBlob(d.blob.base64, d.blob.mimeType) : null,
  }))

  await db.transaction(
    'rw',
    [db.subjects, db.folders, db.chapters, db.documents, db.activities, db.cardStates, db.exams, db.examAttempts, db.sessions, db.settings],
    async () => {
      await Promise.all([
        db.subjects.clear(),
        db.folders.clear(),
        db.chapters.clear(),
        db.documents.clear(),
        db.activities.clear(),
        db.cardStates.clear(),
        db.exams.clear(),
        db.examAttempts.clear(),
        db.sessions.clear(),
        db.settings.clear(),
      ])
      await db.subjects.bulkAdd(subjects ?? [])
      await db.folders.bulkAdd(folders ?? [])
      await db.chapters.bulkAdd(chapters ?? [])
      await db.documents.bulkAdd(documentsDeserialized)
      await db.activities.bulkAdd(activities ?? [])
      await db.cardStates.bulkAdd(cardStates ?? [])
      await db.exams.bulkAdd(exams ?? [])
      await db.examAttempts.bulkAdd(examAttempts ?? [])
      await db.sessions.bulkAdd(sessions ?? [])
      await db.settings.bulkAdd(settings ?? [])
    },
  )

  return { subjects: (subjects ?? []).length, documents: documentsDeserialized.length }
}
