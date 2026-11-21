import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bot, Send, Settings2, Loader2, User, Sparkles } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { EmptyState } from '../components/EmptyState'
import { AIConfigSheet } from '../components/AIConfigSheet'
import { getAIConfig } from '../ai/settings'
import { getActiveProvider } from '../ai/client'
import { ASSISTANT_SYSTEM_PROMPT, assistantContextPrefix } from '../ai/prompts'
import { db } from '../db/schema'
import type { ChatMessage } from '../ai/types'

const SUGGESTIONS = [
  'Explique-moi cette notion plus simplement.',
  'Donne-moi un exemple.',
  'Résume ce chapitre.',
  'Fais-moi une fiche de révision.',
]

export function Assistant() {
  const config = useLiveQuery(() => getAIConfig())
  const configured = config !== null && config !== undefined
  const [configOpen, setConfigOpen] = useState(false)

  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray()) ?? []
  const chapters = useLiveQuery(() => db.chapters.toArray()) ?? []
  const [contextChapterId, setContextChapterId] = useState('')

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
    </div>
  )
}
