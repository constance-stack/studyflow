import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  Send,
  Settings2,
  Loader2,
  User,
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  Zap,
} from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { EmptyState } from '../components/EmptyState'
import { AIConfigSheet } from '../components/AIConfigSheet'
import { GenerateActivitySheet } from '../components/GenerateActivitySheet'
import { getAIConfig } from '../ai/settings'
import { getActiveProvider } from '../ai/client'
import { ASSISTANT_SYSTEM_PROMPT, assistantContextPrefix } from '../ai/prompts'
import { db } from '../db/schema'
import { createSubject, createFolder, createChapter, createDocument, updateDocument } from '../db/queries'
import { extractDocumentContent } from '../ai/generate'
import { documentToImageParts } from '../ai/documentImages'
import type { ChatMessage } from '../ai/types'
import type { DocumentRecord, DocumentType } from '../db/types'

const SCRATCH_SUBJECT_NAME = 'Mes documents'

const SUGGESTIONS = [
  'Explique-moi cette notion plus simplement.',
  'Donne-moi un exemple.',
  'Résume ce chapitre.',
  'Fais-moi une fiche de révision.',
]

export function Assistant() {
  const navigate = useNavigate()
  const config = useLiveQuery(() => getAIConfig())
  const configured = config !== null && config !== undefined
  const [configOpen, setConfigOpen] = useState(false)

  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray()) ?? []
  const chapters = useLiveQuery(() => db.chapters.toArray()) ?? []
  const [contextChapterId, setContextChapterId] = useState('')
  const contextDocs =
    useLiveQuery(
      () =>
        contextChapterId
          ? db.documents.where('chapterId').equals(contextChapterId).sortBy('order')
          : Promise.resolve<DocumentRecord[]>([]),
      [contextChapterId],
    ) ?? []

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [genTarget, setGenTarget] = useState<{ subjectId: string; chapterId: string; chapterName: string } | null>(null)
  const [generatedNotice, setGeneratedNotice] = useState<{ chapterId: string } | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function send(text: string) {
    const content = text.trim()
    if (!content || sending) return
    setError(null)
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setSending(true)
    try {
      const provider = await getActiveProvider()
      if (!provider) throw new Error("L'IA n'est pas configurée.")

      let contextBlock = ''
      if (contextChapterId) {
        const chapter = chapters.find((c) => c.id === contextChapterId)
        const docs = await db.documents.where('chapterId').equals(contextChapterId).toArray()
        const text = docs
          .map((d) => d.textContent || d.extractedText || '')
          .filter(Boolean)
          .join('\n\n')
        contextBlock = assistantContextPrefix(chapter ? `chapitre "${chapter.name}"` : null, text || null)
      }

      const reply = await provider.generateText(
        contextBlock ? [...nextMessages.slice(0, -1), { role: 'user', content: contextBlock + content }] : nextMessages,
        ASSISTANT_SYSTEM_PROMPT,
      )
      setMessages([...nextMessages, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
      setMessages(nextMessages)
    } finally {
      setSending(false)
    }
  }

  async function ensureWorkspaceChapter(): Promise<{ subjectId: string; chapterId: string; chapterName: string }> {
    if (contextChapterId) {
      const chapter = chapters.find((c) => c.id === contextChapterId)
      if (chapter) return { subjectId: chapter.subjectId, chapterId: chapter.id, chapterName: chapter.name }
    }
    let subject = subjects.find((s) => s.name === SCRATCH_SUBJECT_NAME)
    if (!subject) subject = await createSubject(SCRATCH_SUBJECT_NAME)
    let chapter = chapters.find((c) => c.subjectId === subject.id)
    if (!chapter) {
      const folder = await createFolder(subject.id, 'Général', null)
      chapter = await createChapter(subject.id, folder.id, 'Général')
    }
    setContextChapterId(chapter.id)
    return { subjectId: subject.id, chapterId: chapter.id, chapterName: chapter.name }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadError(null)
    try {
      const { subjectId, chapterId } = await ensureWorkspaceChapter()
      for (const file of Array.from(files)) {
        const type: DocumentType = file.type === 'application/pdf' ? 'pdf' : 'image'
        const doc = await createDocument({
          chapterId,
          subjectId,
          name: file.name,
          type,
          mimeType: file.type,
          blob: file,
        })
        try {
          const { images, truncatedPages } = await documentToImageParts(file, file.type)
          const result = await extractDocumentContent(file.name, images)
          const warnings = truncatedPages
            ? [...result.warnings, `Seules les ${images.length} premières pages sur ${truncatedPages} ont été analysées.`]
            : result.warnings
          await updateDocument(doc.id, {
            extractedText: result.extractedText,
            aiSummary: warnings.length ? `${result.summary}\n\n⚠️ ${warnings.join(' ')}` : result.summary,
          })
        } catch (e) {
          setUploadError(
            `"${file.name}" a été importé mais l'analyse IA a échoué : ${e instanceof Error ? e.message : 'erreur inconnue'}. Tu peux réessayer depuis le document.`,
          )
        }
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Erreur lors de l'import.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function openGenerate() {
    const target = await ensureWorkspaceChapter()
    setGenTarget(target)
  }

  if (!configured) {
    return (
      <div>
        <TopBar title="Assistant IA" />
        <div className="px-4 sm:px-8 sm:pt-8 max-w-2xl mx-auto">
          <h1 className="hidden sm:block text-2xl font-bold mb-6">Assistant IA</h1>
          <EmptyState
            icon={<Bot size={32} />}
            title="Aucune IA connectée"
            description="Configure un fournisseur d'IA (une option gratuite est recommandée) pour poser des questions sur tes cours, obtenir des explications ou des exemples."
            action={
              <button
                onClick={() => setConfigOpen(true)}
                className="rounded-xl px-5 py-2.5 bg-[var(--color-primary)] text-white font-medium text-sm"
              >
                Configurer l'IA
              </button>
            }
          />
        </div>
        <AIConfigSheet
          open={configOpen}
          initial={config ?? null}
          onClose={() => setConfigOpen(false)}
          onSaved={() => {}}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Assistant IA" />
      <div className="hidden sm:flex items-center justify-between px-8 pt-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold">Assistant IA</h1>
      </div>

      <div className="px-4 sm:px-8 max-w-2xl mx-auto w-full flex items-center gap-2 py-2">
        <select
          value={contextChapterId}
          onChange={(e) => setContextChapterId(e.target.value)}
          className="flex-1 rounded-xl px-3 py-2 bg-[var(--color-surface-muted)] text-sm outline-none"
        >
          <option value="">Sans contexte de cours</option>
          {subjects.map((s) => (
            <optgroup key={s.id} label={s.name}>
              {chapters
                .filter((c) => c.subjectId === s.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <button
          onClick={() => setConfigOpen(true)}
          className="p-2 rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] shrink-0"
          aria-label="Réglages IA"
        >
          <Settings2 size={18} />
        </button>
      </div>

      <div className="px-4 sm:px-8 max-w-2xl mx-auto w-full pb-2">
        {contextDocs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {contextDocs.map((d) => (
              <span
                key={d.id}
                className="flex items-center gap-1.5 text-xs rounded-full bg-[var(--color-surface)] px-2.5 py-1.5"
              >
                {d.type === 'pdf' ? <FileText size={12} /> : <ImageIcon size={12} />}
                {d.name}
                {!d.extractedText && d.blob && (
                  <span className="text-[var(--color-text-muted)]">· analyse...</span>
                )}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium bg-[var(--color-surface)] disabled:opacity-50"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'Import...' : 'Ajouter un document'}
          </button>
          <button
            onClick={openGenerate}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium bg-[var(--color-surface)]"
          >
            <Zap size={15} /> Générer une activité
          </button>
        </div>
        {uploadError && <p className="text-xs text-red-500 mt-1.5">{uploadError}</p>}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8 max-w-2xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="py-8">
            <p className="text-sm text-[var(--color-text-muted)] mb-3">Essaie par exemple :</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left rounded-xl px-3.5 py-2.5 bg-[var(--color-surface)] text-sm flex items-center gap-2"
                >
                  <Sparkles size={14} className="text-[var(--color-primary)] shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    m.role === 'user' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
                  }`}
                >
                  {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm max-w-[80%] whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)]'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[var(--color-surface-muted)]">
                  <Bot size={14} />
                </div>
                <div className="rounded-2xl px-3.5 py-2.5 bg-[var(--color-surface)]">
                  <Loader2 size={16} className="animate-spin text-[var(--color-text-muted)]" />
                </div>
              </div>
            )}
            {error && <p className="text-sm text-red-500 px-1">{error}</p>}
          </div>
        )}
      </div>

      {generatedNotice && (
        <div className="px-4 sm:px-8 max-w-2xl mx-auto w-full shrink-0">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--color-primary)]/10 px-3.5 py-2.5 mb-2 text-sm">
            <span className="text-[var(--color-primary)] font-medium">Activité générée !</span>
            <button
              onClick={() => navigate(`/chapter/${generatedNotice.chapterId}`)}
              className="text-[var(--color-primary)] font-semibold shrink-0"
            >
              Ouvrir le chapitre
            </button>
          </div>
        </div>
      )}

      <div
        className="px-4 sm:px-8 max-w-2xl mx-auto w-full flex gap-2 py-3 shrink-0"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Pose ta question..."
          className="flex-1 rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
        />
        <button
          onClick={() => send(input)}
          disabled={sending || !input.trim()}
          className="p-2.5 rounded-xl bg-[var(--color-primary)] text-white disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>

      <AIConfigSheet
        open={configOpen}
        initial={config ?? null}
        onClose={() => setConfigOpen(false)}
        onSaved={() => {}}
      />

      {genTarget && (
        <GenerateActivitySheet
          open={!!genTarget}
          onClose={() => setGenTarget(null)}
          chapterId={genTarget.chapterId}
          subjectId={genTarget.subjectId}
          chapterName={genTarget.chapterName}
          onGenerated={() => setGeneratedNotice({ chapterId: genTarget.chapterId })}
        />
      )}
    </div>
  )
}
