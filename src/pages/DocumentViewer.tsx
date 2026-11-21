import { lazy, Suspense, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Save, Sparkles, Loader2, TriangleAlert } from 'lucide-react'
import { db } from '../db/schema'
import { updateDocument } from '../db/queries'
import { ImageViewer } from '../components/ImageViewer'
import { getAIConfig } from '../ai/settings'
import { extractDocumentContent } from '../ai/generate'
import { documentToImageParts } from '../ai/documentImages'

const PdfViewer = lazy(() => import('../components/PdfViewer').then((m) => ({ default: m.PdfViewer })))

export function DocumentViewer() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const doc = useLiveQuery(() => db.documents.get(documentId!), [documentId])
  const aiConfig = useLiveQuery(() => getAIConfig())
  const [noteText, setNoteText] = useState('')
  const [extractedDraft, setExtractedDraft] = useState('')
  const [dirty, setDirty] = useState(false)
  const [savedPulse, setSavedPulse] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  useEffect(() => {
    if (doc?.type === 'note') setNoteText(doc.textContent ?? '')
    setExtractedDraft(doc?.extractedText ?? '')
  }, [doc?.id])

  if (!doc) return null

  function saveNote() {
    updateDocument(doc!.id, { textContent: noteText, size: noteText.length })
    setDirty(false)
    setSavedPulse(true)
    setTimeout(() => setSavedPulse(false), 1200)
  }

  function saveExtracted() {
    updateDocument(doc!.id, { extractedText: extractedDraft })
    setSavedPulse(true)
    setTimeout(() => setSavedPulse(false), 1200)
  }

  async function analyzeWithAI() {
    if (!doc!.blob) return
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const { images, truncatedPages } = await documentToImageParts(doc!.blob, doc!.mimeType)
      const result = await extractDocumentContent(doc!.name, images)
      const warnings = truncatedPages
        ? [...result.warnings, `Seules les ${images.length} premières pages sur ${truncatedPages} ont été analysées.`]
        : result.warnings
      await updateDocument(doc!.id, {
        extractedText: result.extractedText,
        aiSummary: warnings.length ? `${result.summary}\n\n⚠️ ${warnings.join(' ')}` : result.summary,
      })
      setExtractedDraft(result.extractedText)
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Erreur lors de l'analyse.")
    } finally {
      setAnalyzing(false)
    }
  }

  const canAnalyze = (doc.type === 'pdf' || doc.type === 'image') && !!doc.blob

  return (
    <div className="pb-10">
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4 bg-[var(--color-bg)]/95 backdrop-blur"
        style={{ paddingTop: 'calc(var(--safe-top) + 10px)', paddingBottom: '10px' }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full" aria-label="Retour">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold truncate grow">{doc.name}</h1>
        {savedPulse && <span className="text-xs text-green-500 font-medium shrink-0">Enregistré</span>}
      </header>

      <div className="px-4 sm:px-8 max-w-2xl mx-auto">
        {doc.type === 'pdf' && doc.blob && (
          <Suspense
            fallback={<div className="h-64 rounded-2xl bg-[var(--color-surface-muted)] animate-pulse" />}
          >
            <PdfViewer blob={doc.blob} />
          </Suspense>
        )}
        {doc.type === 'image' && doc.blob && <ImageViewer blob={doc.blob} alt={doc.name} />}

        {doc.type === 'note' ? (
          <div className="mt-2">
            <textarea
              value={noteText}
              onChange={(e) => {
                setNoteText(e.target.value)
                setDirty(true)
              }}
              placeholder="Écris ta note ici..."
              className="w-full min-h-[50vh] rounded-2xl p-4 bg-[var(--color-surface)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
            <button
              onClick={saveNote}
              disabled={!dirty}
              className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 bg-[var(--color-primary)] text-white font-medium text-sm disabled:opacity-40"
            >
              <Save size={16} /> Enregistrer
            </button>
          </div>
        ) : (
          <div className="mt-5">
            {canAnalyze && (
              <div className="mb-4">
                {aiConfig ? (
                  <button
                    onClick={analyzeWithAI}
                    disabled={analyzing}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 bg-[var(--color-primary)] text-white font-medium text-sm disabled:opacity-60"
                  >
                    {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {analyzing ? 'Analyse en cours...' : doc.extractedText ? 'Ré-analyser avec l\'IA' : "Analyser avec l'IA"}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/assistant')}
                    className="text-sm text-[var(--color-primary)] font-medium"
                  >
                    Configurer l'IA pour analyser ce document →
                  </button>
                )}
                {analyzeError && (
                  <p className="flex items-start gap-1.5 text-sm text-red-500 mt-2">
                    <TriangleAlert size={14} className="shrink-0 mt-0.5" /> {analyzeError}
                  </p>
                )}
              </div>
            )}

            {doc.aiSummary && (
              <div className="mb-4 rounded-2xl bg-[var(--color-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
                  Résumé IA
                </p>
                <p className="text-sm whitespace-pre-wrap">{doc.aiSummary}</p>
              </div>
            )}

            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--color-text-muted)]">
              <Pencil size={14} /> Texte extrait (modifiable)
            </div>
            <textarea
              value={extractedDraft}
              onChange={(e) => setExtractedDraft(e.target.value)}
              onBlur={saveExtracted}
              placeholder="Aucun texte extrait — lance une analyse IA ci-dessus, ou transcris manuellement ici."
              className="w-full min-h-[22vh] rounded-2xl p-4 bg-[var(--color-surface)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none text-sm"
            />
          </div>
        )}
      </div>
    </div>
  )
}
