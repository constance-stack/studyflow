import { useState } from 'react'
import {
  Loader2,
  Layers,
  ListChecks,
  Lightbulb,
  MessageCircleQuestion,
  CheckCircle2,
  SquareDashedBottom,
  Shuffle,
  Languages,
  History,
  MessageSquareQuote,
  Calculator,
} from 'lucide-react'
import { Sheet } from './Sheet'
import { db } from '../db/schema'
import { createActivity } from '../db/queries'
import {
  generateFlashcards,
  generateQCM,
  generateMiniLessons,
  generateOpenQuestions,
  generateTrueFalse,
  generateBlanks,
  generateMatchPairs,
  generateVocab,
  generateTimeline,
  generateReflections,
  generateExercises,
  type GenerationParams,
} from '../ai/generate'
import type { ActivityType } from '../db/types'

const TYPE_OPTIONS: { value: ActivityType; label: string; icon: React.ReactNode }[] = [
  { value: 'flashcard', label: 'Flashcards', icon: <Layers size={18} /> },
  { value: 'qcm', label: 'QCM', icon: <ListChecks size={18} /> },
  { value: 'minilesson', label: 'Mini-leçons', icon: <Lightbulb size={18} /> },
  { value: 'open', label: 'Questions ouvertes', icon: <MessageCircleQuestion size={18} /> },
  { value: 'truefalse', label: 'Vrai / Faux', icon: <CheckCircle2 size={18} /> },
  { value: 'blank', label: 'Textes à trous', icon: <SquareDashedBottom size={18} /> },
  { value: 'match', label: 'Associations', icon: <Shuffle size={18} /> },
  { value: 'vocab', label: 'Vocabulaire', icon: <Languages size={18} /> },
  { value: 'timeline', label: 'Chronologie', icon: <History size={18} /> },
  { value: 'reflection', label: 'Réflexion', icon: <MessageSquareQuote size={18} /> },
  { value: 'miniexercise', label: 'Mini-exercices', icon: <Calculator size={18} /> },
  { value: 'exercise', label: 'Exercices complets', icon: <Calculator size={18} /> },
]

const TYPE_LABELS: Record<ActivityType, string> = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label])) as Record<
  ActivityType,
  string
>

const DIFFICULTIES = ['facile', 'moyen', 'difficile']

async function generateForType(type: ActivityType, params: GenerationParams): Promise<unknown> {
  switch (type) {
    case 'flashcard':
      return generateFlashcards(params)
    case 'qcm':
      return generateQCM(params)
    case 'minilesson':
      return generateMiniLessons(params)
    case 'open':
      return generateOpenQuestions(params)
    case 'truefalse':
      return generateTrueFalse(params)
    case 'blank':
      return generateBlanks(params)
    case 'match': {
      const pairs = await generateMatchPairs(params)
      return [{ pairs }]
    }
    case 'vocab':
      return generateVocab(params)
    case 'timeline': {
      const events = await generateTimeline(params)
      return [{ events }]
    }
    case 'reflection':
      return generateReflections(params)
    case 'miniexercise':
    case 'exercise':
      return generateExercises(params)
    default:
      throw new Error('Type non pris en charge.')
  }
}

function isEmptyResult(type: ActivityType, result: unknown): boolean {
  if (type === 'match') return ((result as { pairs: unknown[] }[])[0]?.pairs?.length ?? 0) === 0
  if (type === 'timeline') return ((result as { events: unknown[] }[])[0]?.events?.length ?? 0) === 0
  return !Array.isArray(result) || result.length === 0
}

export function GenerateActivitySheet({
  open,
  onClose,
  chapterId,
  subjectId,
  chapterName,
  onGenerated,
}: {
  open: boolean
  onClose: () => void
  chapterId: string
  subjectId: string
  chapterName: string
  onGenerated: () => void
}) {
  const [type, setType] = useState<ActivityType>('flashcard')
  const [count, setCount] = useState(10)
  const [difficulty, setDifficulty] = useState('moyen')
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
        throw new Error(
          "Aucun contenu disponible dans ce chapitre. Importe un document et analyse-le avec l'IA, ou ajoute une note, avant de générer une activité.",
        )
      }

      const params: GenerationParams = { content, count, difficulty, instructions }
      const generatedContent = await generateForType(type, params)
      if (isEmptyResult(type, generatedContent)) {
        throw new Error("L'IA n'a rien généré à partir de ce contenu.")
      }

      await createActivity({
        subjectIds: [subjectId],
        chapterIds: [chapterId],
        type,
        title: `${TYPE_LABELS[type]} — ${chapterName}`,
        source: 'ai',
        config: { count, difficulty, instructions },
        content: generatedContent,
      })

      onGenerated()
      onClose()
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
      title="Générer une activité"
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
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium text-center ${
                  type === opt.value
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">
              {type === 'match' ? 'Paires' : type === 'timeline' ? 'Événements' : 'Nombre'}
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
              className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">Difficulté</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 bg-[var(--color-surface-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--color-text-muted)]">
            Instructions (facultatif)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder='Ex : "concentre-toi sur les formules", "pose des questions de dissertation"...'
            className="w-full min-h-[70px] rounded-xl p-3.5 bg-[var(--color-surface-muted)] outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </Sheet>
  )
}
