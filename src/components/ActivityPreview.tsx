import { useState } from 'react'
import { Check, X, Volume2 } from 'lucide-react'
import { MathText } from './MathText'
import type { Activity } from '../db/types'
import type {
  FlashcardItem,
  MiniLessonItem,
  OpenQuestionItem,
  QCMItem,
  TrueFalseItem,
  BlankItem,
  MatchPair,
  VocabItem,
  TimelineEvent,
  ReflectionItem,
  ExerciseItem,
} from '../ai/generate'

function FlashcardPreview({ cards }: { cards: FlashcardItem[] }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set())
  function toggle(i: number) {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }
  return (
    <div className="flex flex-col gap-2.5">
      {cards.map((c, i) => (
        <button
          key={i}
          onClick={() => toggle(i)}
          className="text-left rounded-xl bg-[var(--color-surface-muted)] p-3.5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
            {flipped.has(i) ? 'Réponse' : 'Question'} · carte {i + 1}
          </p>
          <MathText text={flipped.has(i) ? c.back : c.front} className="text-sm" />
        </button>
      ))}
    </div>
  )
}

function QCMPreview({ questions }: { questions: QCMItem[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      {questions.map((q, i) => (
        <div key={i} className="rounded-xl bg-[var(--color-surface-muted)] p-3.5">
          <MathText text={`${i + 1}. ${q.question}`} className="text-sm font-medium mb-2 block" />
          <div className="flex flex-col gap-1.5 mb-2">
            {q.choices.map((choice, ci) => {
              const correct = q.correctIndices.includes(ci)
              return (
                <div
                  key={ci}
                  className={`flex items-center gap-2 text-sm rounded-lg px-2.5 py-1.5 ${
                    correct ? 'bg-green-500/10 text-green-600 dark:text-green-400' : ''
                  }`}
                >
                  {correct ? <Check size={14} className="shrink-0" /> : <X size={14} className="shrink-0 opacity-30" />}
                  <MathText text={choice} />
                </div>
              )
            })}
          </div>
          {q.explanation && <MathText text={q.explanation} className="text-xs text-[var(--color-text-muted)]" />}
        </div>
      ))}
    </div>
  )
}

function MiniLessonPreview({ lessons }: { lessons: MiniLessonItem[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      {lessons.map((l, i) => (
        <div key={i} className="rounded-xl bg-[var(--color-surface-muted)] p-3.5">
          <MathText text={l.concept} className="text-sm font-semibold mb-1.5 block" />
          <MathText text={l.explanation} className="text-sm mb-2 block" />
          {l.example && (
            <p className="text-xs text-[var(--color-text-muted)] mb-2">
              <span className="font-medium">Exemple : </span>
              <MathText text={l.example} />
            </p>
          )}
          {l.checkQuestion && (
            <div className="text-xs rounded-lg bg-[var(--color-surface)] p-2.5 mt-1">
              <MathText text={l.checkQuestion} className="font-medium block" />
              <MathText text={l.checkAnswer} className="text-[var(--color-text-muted)] mt-0.5 block" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function OpenQuestionPreview({ questions }: { questions: OpenQuestionItem[] }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  function toggle(i: number) {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }
  return (
    <div className="flex flex-col gap-2.5">
      {questions.map((q, i) => (
        <button key={i} onClick={() => toggle(i)} className="text-left rounded-xl bg-[var(--color-surface-muted)] p-3.5">
          <MathText text={`${i + 1}. ${q.question}`} className="text-sm font-medium mb-1 block" />
          {revealed.has(i) && <MathText text={q.expectedAnswer} className="text-xs text-[var(--color-text-muted)]" />}
        </button>
      ))}
    </div>
  )
}

function TrueFalsePreview({ items }: { items: TrueFalseItem[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl bg-[var(--color-surface-muted)] p-3.5">
          <MathText text={it.statement} className="text-sm font-medium block mb-1.5" />
          <p className={`text-xs font-semibold ${it.isTrue ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {it.isTrue ? 'Vrai' : 'Faux'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{it.justification}</p>
        </div>
      ))}
    </div>
  )
}

function BlankPreview({ items }: { items: BlankItem[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl bg-[var(--color-surface-muted)] p-3.5">
          <MathText text={it.textWithBlank} className="text-sm block mb-1" />
          <p className="text-xs text-[var(--color-primary)] font-medium">
            Réponse : <MathText text={it.answer} />
          </p>
        </div>
      ))}
    </div>
  )
}

function MatchPreview({ pairs }: { pairs: MatchPair[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {pairs.map((p, i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm">
          <MathText text={p.left} className="flex-1" />
          <span className="text-[var(--color-text-muted)]">→</span>
          <MathText text={p.right} className="flex-1" />
        </div>
      ))}
    </div>
  )
}

function VocabPreview({ items }: { items: VocabItem[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-muted)] p-3.5">
          <Volume2 size={14} className="text-[var(--color-text-muted)] shrink-0" />
          <div className="text-sm">
            <span className="font-medium">{it.term}</span> — {it.translation}
          </div>
        </div>
      ))}
    </div>
  )
}

function TimelinePreview({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {[...events]
        .sort((a, b) => a.order - b.order)
        .map((e, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm">
            <span className="font-semibold text-[var(--color-primary)] shrink-0">{e.date}</span>
            {e.label}
          </div>
        ))}
    </div>
  )
}

function ReflectionPreview({ items }: { items: ReflectionItem[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl bg-[var(--color-surface-muted)] p-3.5">
          <MathText text={it.prompt} className="text-sm font-medium block mb-1.5" />
          <p className="text-xs text-[var(--color-text-muted)]">{it.guidance}</p>
        </div>
      ))}
    </div>
  )
}

function ExercisePreview({ items }: { items: ExerciseItem[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl bg-[var(--color-surface-muted)] p-3.5">
          <MathText text={it.statement} className="text-sm font-medium block mb-1.5" />
          <p className="text-xs text-[var(--color-text-muted)]">{it.steps.length} étape(s) de correction</p>
        </div>
      ))}
    </div>
  )
}

export function ActivityPreview({ activity }: { activity: Activity }) {
  if (activity.type === 'flashcard') return <FlashcardPreview cards={activity.content as FlashcardItem[]} />
  if (activity.type === 'qcm') return <QCMPreview questions={activity.content as QCMItem[]} />
  if (activity.type === 'minilesson') return <MiniLessonPreview lessons={activity.content as MiniLessonItem[]} />
  if (activity.type === 'open') return <OpenQuestionPreview questions={activity.content as OpenQuestionItem[]} />
  if (activity.type === 'truefalse') return <TrueFalsePreview items={activity.content as TrueFalseItem[]} />
  if (activity.type === 'blank') return <BlankPreview items={activity.content as BlankItem[]} />
  if (activity.type === 'match') return <MatchPreview pairs={(activity.content as { pairs: MatchPair[] }[])[0]?.pairs ?? []} />
  if (activity.type === 'vocab') return <VocabPreview items={activity.content as VocabItem[]} />
  if (activity.type === 'timeline') return <TimelinePreview events={(activity.content as { events: TimelineEvent[] }[])[0]?.events ?? []} />
  if (activity.type === 'reflection') return <ReflectionPreview items={activity.content as ReflectionItem[]} />
  if (activity.type === 'miniexercise' || activity.type === 'exercise')
    return <ExercisePreview items={activity.content as ExerciseItem[]} />
  return <p className="text-sm text-[var(--color-text-muted)]">Aperçu non disponible pour ce type.</p>
}
