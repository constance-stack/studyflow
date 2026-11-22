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
  FileSpreadsheet,
  FolderOpen,
  X,
  RotateCcw,
  FilePlus2,
  Check,
} from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { EmptyState } from '../components/EmptyState'
import { AIConfigSheet } from '../components/AIConfigSheet'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { GenerateActivitySheet } from '../components/GenerateActivitySheet'
import { GenerateRevisionSheetSheet } from '../components/GenerateRevisionSheetSheet'
import { DocumentPickerSheet } from '../components/DocumentPickerSheet'
import { getAIConfig } from '../ai/settings'
import { getActiveProvider } from '../ai/client'
import { ASSISTANT_SYSTEM_PROMPT, assistantContextPrefix } from '../ai/prompts'
import { db } from '../db/schema'
import { createSubject, createFolder, createChapter, createDocument, updateDocument } from '../db/queries'
import { extractDocumentContent } from '../ai/generate'
import { documentToImageParts } from '../ai/documentImages'
import { PROVIDER_PRESETS, type ChatMessage } from '../ai/types'
import type { DocumentType } from '../db/types'

const SCRATCH_SUBJECT_NAME = 'Mes documents'
const CHAT_HISTORY_KEY = 'assistant_chat_history'

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

  const chapters = useLiveQuery(() => db.chapters.toArray()) ?? []
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray()) ?? []
  const allDocuments = useLiveQuery(() => db.documents.toArray()) ?? []
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const selectedDocs = allDocuments.filter((d) => selectedDocIds.includes(d.id))
  const [pickerOpen, setPickerOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [genTarget, setGenTarget] = useState<{
    subjectId: string
    chapterId: string
    chapterName: string
    docIds?: string[]
    chapterIds?: string[]
    subjectIds?: string[]
  } | null>(null)
  const [ficheTarget, setFicheTarget] = useState<{
    subjectId: string
    chapterId: string
    docIds?: string[]
    chapterIds?: string[]
  } | null>(null)
  const [generatedNotice, setGeneratedNotice] = useState<{ chapterId: string } | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [savedNotice, setSavedNotice] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  // Chat history is lost on every navigation/reload otherwise — persist it as a single rolling
  // conversation (this page has no multi-thread concept) so it survives.
  useEffect(() => {
    db.settings.get(CHAT_HISTORY_KEY).then((row) => {
      if (Array.isArray(row?.value)) setMessages(row.value as ChatMessage[])
      setHistoryLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!historyLoaded) return
    db.settings.put({ key: CHAT_HISTORY_KEY, value: messages })
  }, [messages, historyLoaded])

  function clearConversation() {
    setMessages([])
    setClearConfirm(false)
  }

  async function saveAsDocument(messageIndex: number, content: string) {
    const target = selectedDocs.length > 0 ? await resolveGenerationTarget() : await ensureWorkspaceChapter()
    const precedingQuestion = messages[messageIndex - 1]
    const name = precedingQuestion?.content
      ? precedingQuestion.content.slice(0, 60)
      : `Réponse IA ${new Date().toLocaleDateString('fr-FR')}`
    const doc = await createDocument({
      chapterId: target.chapterId,
      subjectId: target.subjectId,
      name,
      type: 'note',
      mimeType: 'text/plain',
      textContent: content,
    })
    setSelectedDocIds((prev) => [...prev, doc.id])
    setSavedNotice(messageIndex)
    setTimeout(() => setSavedNotice(null), 2000)
  }

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
      if (selectedDocs.length > 0) {
        const text = selectedDocs
          .map((d) => d.textContent || d.extractedText || '')
          .filter(Boolean)
          .join('\n\n')
        if (!text.trim()) {
          throw new Error(
            "Les documents sélectionnés n'ont pas encore été analysés par l'IA — ouvre-les pour lancer l'analyse, ou désélectionne-les.",
          )
        }
        const label =
          selectedDocs.length === 1
            ? `document "${selectedDocs[0].name}"`
            : `${selectedDocs.length} documents sélectionnés`
        contextBlock = assistantContextPrefix(label, text)
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

  // Ad-hoc uploads from this page need somewhere in the library to live; reuse (or create once) a
  // "Mes documents > Général" chapter rather than forcing a trip through Mes cours first.
  async function ensureWorkspaceChapter(): Promise<{ subjectId: string; chapterId: string; chapterName: string }> {
    let subject = subjects.find((s) => s.name === SCRATCH_SUBJECT_NAME)
    if (!subject) subject = await createSubject(SCRATCH_SUBJECT_NAME)
    let chapter = chapters.find((c) => c.subjectId === subject.id)
    if (!chapter) {
      const folder = await createFolder(subject.id, 'Général', null)
      chapter = await createChapter(subject.id, folder.id, 'Général')
    }
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
        setSelectedDocIds((prev) => [...prev, doc.id])
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

  // Figures out where a generated activity/fiche should be filed: the chapter(s)/subject(s) of
  // the selected documents when there are any, otherwise the shared scratch workspace.
  async function resolveGenerationTarget(): Promise<{
    subjectId: string
    chapterId: string
    chapterName: string
    docIds?: string[]
    chapterIds?: string[]
    subjectIds?: string[]
  }> {
    if (selectedDocs.length > 0) {
      const docChapterIds = [...new Set(selectedDocs.map((d) => d.chapterId))]
      const docSubjectIds = [...new Set(selectedDocs.map((d) => d.subjectId))]
      const chapterNames = docChapterIds.map((id) => chapters.find((c) => c.id === id)?.name).filter(Boolean)
      return {
        subjectId: docSubjectIds[0],
        chapterId: docChapterIds[0],
        chapterName: chapterNames.length === 1 ? chapterNames[0]! : `${selectedDocs.length} documents sélectionnés`,
        docIds: selectedDocs.map((d) => d.id),
        chapterIds: docChapterIds,
        subjectIds: docSubjectIds,
      }
    }
    return ensureWorkspaceChapter()
  }

  async function openGenerate() {
    setGenTarget(await resolveGenerationTarget())
  }

  async function openGenerateFiche() {
    const target = await resolveGenerationTarget()
    setFicheTarget(target)
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

      {config && (
        <button
          onClick={() => setConfigOpen(true)}
          className="px-4 sm:px-8 max-w-2xl mx-auto w-full text-left text-xs text-[var(--color-text-muted)] pt-1"
        >
          IA : {PROVIDER_PRESETS[config.provider].label.split(' (')[0]} · {config.model}
        </button>
      )}

      <div className="px-4 sm:px-8 max-w-2xl mx-auto w-full flex items-center gap-2 py-2">
        <button
          onClick={() => setPickerOpen(true)}
          className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2 bg-[var(--color-surface-muted)] text-sm text-left"
        >
          <FolderOpen size={15} className="text-[var(--color-text-muted)] shrink-0" />
          {selectedDocs.length === 0
            ? 'Choisir des documents'
            : `${selectedDocs.length} document${selectedDocs.length === 1 ? '' : 's'} sélectionné${selectedDocs.length === 1 ? '' : 's'}`}
        </button>
        {messages.length > 0 && (
          <button
            onClick={() => setClearConfirm(true)}
            className="p-2 rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] shrink-0"
            aria-label="Nouvelle conversation"
          >
            <RotateCcw size={16} />
          </button>
        )}
        <button
          onClick={() => setConfigOpen(true)}
          className="p-2 rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] shrink-0"
          aria-label="Réglages IA"
        >
          <Settings2 size={18} />
        </button>
      </div>

      <div className="px-4 sm:px-8 max-w-2xl mx-auto w-full pb-2">
        {selectedDocs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedDocs.map((d) => (
              <span
                key={d.id}
                className="flex items-center gap-1.5 text-xs rounded-full bg-[var(--color-surface)] pl-2.5 pr-1.5 py-1.5"
              >
                {d.type === 'pdf' ? <FileText size={12} /> : d.type === 'image' ? <ImageIcon size={12} /> : <FileText size={12} />}
                {d.name}
                {!d.textContent && !d.extractedText && (
                  <span className="text-[var(--color-text-muted)]">· non analysé</span>
                )}
                <button
                  onClick={() => setSelectedDocIds((prev) => prev.filter((id) => id !== d.id))}
                  className="rounded-full p-0.5 text-[var(--color-text-muted)]"
                  aria-label="Retirer"
                >
                  <X size={11} />
                </button>
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
            {uploading ? 'Import...' : 'Ajouter'}
          </button>
          <button
            onClick={openGenerate}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium bg-[var(--color-surface)]"
          >
            <Zap size={15} /> Activité
          </button>
          <button
            onClick={openGenerateFiche}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium bg-[var(--color-surface)]"
          >
            <FileSpreadsheet size={15} /> Fiche
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
              <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
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
                {m.role === 'assistant' && (
                  <button
                    onClick={() => saveAsDocument(i, m.content)}
                    disabled={savedNotice === i}
                    className="ml-9 flex items-center gap-1 text-xs text-[var(--color-text-muted)] px-1"
                  >
                    {savedNotice === i ? (
                      <>
                        <Check size={12} className="text-green-500" /> Enregistré comme document
                      </>
                    ) : (
                      <>
                        <FilePlus2 size={12} /> Enregistrer comme document
                      </>
                    )}
                  </button>
                )}
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
          overrideDocIds={genTarget.docIds}
          overrideChapterIds={genTarget.chapterIds}
          overrideSubjectIds={genTarget.subjectIds}
          onGenerated={() => setGeneratedNotice({ chapterId: genTarget.chapterId })}
        />
      )}

      {ficheTarget && (
        <GenerateRevisionSheetSheet
          open={!!ficheTarget}
          onClose={() => setFicheTarget(null)}
          chapterId={ficheTarget.chapterId}
          subjectId={ficheTarget.subjectId}
          overrideDocIds={ficheTarget.docIds}
          overrideChapterIds={ficheTarget.chapterIds}
        />
      )}

      <DocumentPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialSelected={selectedDocIds}
        onConfirm={setSelectedDocIds}
      />

      <ConfirmDialog
        open={clearConfirm}
        title="Nouvelle conversation ?"
        description="L'historique de cette conversation sera effacé (les documents et activités déjà créés restent intacts)."
        confirmLabel="Effacer"
        danger
        onCancel={() => setClearConfirm(false)}
        onConfirm={clearConversation}
      />
    </div>
  )
}
