import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Sheet } from './Sheet'
import { db } from '../db/schema'
import { createRevisionSheet } from '../db/queries'
import { generateRevisionSheet } from '../ai/generate'
import type { RevisionSheetFormat } from '../db/types'

const FORMATS: { value: RevisionSheetFormat; label: string }[] = [
  { value: 'resume_court', label: 'Résumé court' },
  { value: 'resume_detaille', label: 'Résumé détaillé' },
  { value: 'definitions', label: 'Définitions' },
  { value: 'formules', label: 'Formules' },
  { value: 'chronologique', label: 'Chronologique' },
  { value: 'vocabulaire', label: 'Vocabulaire' },
  { value: 'litterature', label: 'Littérature' },
]

export function GenerateRevisionSheetSheet({
  open,
  onClose,
  chapterId,
  subjectId,
}: {
  open: boolean
  onClose: () => void
  chapterId: string
  subjectId: string
}) {
  const navigate = useNavigate()
  const [format, setFormat] = useState<RevisionSheetFormat>('resume_court')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const docs = await db.documents.where('chapterId').equals(chapterId).toArray()
      const content = docs
        .map((d) => d.textContent || d.extractedText || '')
        .filter(Boolean)
        .join('\n\n')
        .slice(0, 20000)
      if (!content.trim()) {
        throw new Error("Aucun contenu disponible dans ce chapitre. Importe et analyse un document d'abord.")
      }
      const { title, sections } = await generateRevisionSheet(content, format, instructions)
      const sheet = await createRevisionSheet({ subjectId, chapterIds: [chapterId], format, title, sections })
      onClose()
      navigate(`/fiche/${sheet.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Créer une fiche de révision"
      footer={
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-medium text-white bg-[var(--color-primary)] disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Génération en cours...' : 'Générer'}
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Format</label>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={`rounded-xl py-2.5 text-sm font-medium ${
                  format === f.value ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Instructions (facultatif)</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full min-h-[60px] rounded-xl p-3 bg-[var(--color-surface-muted)] text-sm outline-none resize-none"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </Sheet>
  )
}
