import { Plus, Trash2 } from 'lucide-react'
import type { ActivityType } from '../../db/types'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">{label}</label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded-lg px-3 py-2 bg-[var(--color-surface-muted)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]'

function ListEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            value={v}
            onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={`${placeholder} ${i + 1}`}
            className={inputClass}
          />
          <button onClick={() => onChange(values.filter((_, j) => j !== i))} className="p-2 text-red-500 shrink-0">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...values, ''])}
        className="flex items-center gap-1 text-xs text-[var(--color-primary)] font-medium"
      >
        <Plus size={13} /> Ajouter
      </button>
    </div>
  )
}

export function ItemDraftForm({
  type,
  draft,
  onChange,
}: {
  type: ActivityType
  draft: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const set = (key: string, value: unknown) => onChange({ ...draft, [key]: value })

  if (type === 'flashcard') {
    return (
      <>
        <Field label="Recto (question)">
          <textarea value={String(draft.front ?? '')} onChange={(e) => set('front', e.target.value)} className={`${inputClass} min-h-[60px] resize-none`} />
        </Field>
        <Field label="Verso (réponse)">
          <textarea value={String(draft.back ?? '')} onChange={(e) => set('back', e.target.value)} className={`${inputClass} min-h-[60px] resize-none`} />
        </Field>
      </>
    )
  }

  if (type === 'qcm') {
    const choices = (draft.choices as string[]) ?? ['', '']
    const correct = (draft.correctIndices as number[]) ?? []
    return (
      <>
        <Field label="Question">
          <textarea value={String(draft.question ?? '')} onChange={(e) => set('question', e.target.value)} className={`${inputClass} min-h-[50px] resize-none`} />
        </Field>
        <Field label="Choix (coche la/les bonne(s) réponse(s))">
          <div className="flex flex-col gap-1.5">
            {choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={correct.includes(i)}
                  onChange={(e) =>
                    set(
                      'correctIndices',
                      e.target.checked ? [...correct, i] : correct.filter((c2) => c2 !== i),
                    )
                  }
                  className="shrink-0"
                />
                <input
                  value={c}
                  onChange={(e) => set('choices', choices.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`Choix ${i + 1}`}
                  className={inputClass}
                />
                <button
                  onClick={() => {
                    set('choices', choices.filter((_, j) => j !== i))
                    set('correctIndices', correct.filter((c2) => c2 !== i).map((c2) => (c2 > i ? c2 - 1 : c2)))
                  }}
                  className="p-1.5 text-red-500 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => set('choices', [...choices, ''])} className="flex items-center gap-1 text-xs text-[var(--color-primary)] font-medium">
              <Plus size={13} /> Ajouter un choix
            </button>
          </div>
        </Field>
        <Field label="Explication (facultatif)">
          <input value={String(draft.explanation ?? '')} onChange={(e) => set('explanation', e.target.value)} className={inputClass} />
        </Field>
      </>
    )
  }

  if (type === 'truefalse') {
    return (
      <>
        <Field label="Affirmation">
          <textarea value={String(draft.statement ?? '')} onChange={(e) => set('statement', e.target.value)} className={`${inputClass} min-h-[50px] resize-none`} />
        </Field>
        <Field label="C'est...">
          <div className="flex gap-2">
            <button onClick={() => set('isTrue', true)} className={`flex-1 rounded-lg py-2 text-sm font-medium ${draft.isTrue ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-[var(--color-surface-muted)]'}`}>
              Vrai
            </button>
            <button onClick={() => set('isTrue', false)} className={`flex-1 rounded-lg py-2 text-sm font-medium ${!draft.isTrue ? 'bg-red-500/20 text-red-500' : 'bg-[var(--color-surface-muted)]'}`}>
              Faux
            </button>
          </div>
        </Field>
        <Field label="Justification">
          <input value={String(draft.justification ?? '')} onChange={(e) => set('justification', e.target.value)} className={inputClass} />
        </Field>
      </>
    )
  }

  if (type === 'blank') {
    return (
      <>
        <Field label='Phrase (utilise "____" pour le trou)'>
          <textarea value={String(draft.textWithBlank ?? '')} onChange={(e) => set('textWithBlank', e.target.value)} placeholder="La capitale de la France est ____." className={`${inputClass} min-h-[50px] resize-none`} />
        </Field>
        <Field label="Réponse">
          <input value={String(draft.answer ?? '')} onChange={(e) => set('answer', e.target.value)} className={inputClass} />
        </Field>
      </>
    )
  }

  if (type === 'open') {
    return (
      <>
        <Field label="Question">
          <textarea value={String(draft.question ?? '')} onChange={(e) => set('question', e.target.value)} className={`${inputClass} min-h-[50px] resize-none`} />
        </Field>
        <Field label="Réponse attendue">
          <textarea value={String(draft.expectedAnswer ?? '')} onChange={(e) => set('expectedAnswer', e.target.value)} className={`${inputClass} min-h-[60px] resize-none`} />
        </Field>
        <Field label="Indices (facultatif)">
          <ListEditor values={(draft.hints as string[]) ?? []} onChange={(v) => set('hints', v)} placeholder="Indice" />
        </Field>
      </>
    )
  }

  if (type === 'vocab') {
    return (
      <>
        <Field label="Mot">
          <input value={String(draft.term ?? '')} onChange={(e) => set('term', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Traduction">
          <input value={String(draft.translation ?? '')} onChange={(e) => set('translation', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Exemple (facultatif)">
          <input value={String(draft.example ?? '')} onChange={(e) => set('example', e.target.value)} className={inputClass} />
        </Field>
      </>
    )
  }

  if (type === 'minilesson') {
    return (
      <>
        <Field label="Concept">
          <input value={String(draft.concept ?? '')} onChange={(e) => set('concept', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Explication">
          <textarea value={String(draft.explanation ?? '')} onChange={(e) => set('explanation', e.target.value)} className={`${inputClass} min-h-[60px] resize-none`} />
        </Field>
        <Field label="Exemple (facultatif)">
          <input value={String(draft.example ?? '')} onChange={(e) => set('example', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Question de vérification (facultatif)">
          <input value={String(draft.checkQuestion ?? '')} onChange={(e) => set('checkQuestion', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Réponse de vérification">
          <input value={String(draft.checkAnswer ?? '')} onChange={(e) => set('checkAnswer', e.target.value)} className={inputClass} />
        </Field>
      </>
    )
  }

  if (type === 'reflection') {
    return (
      <>
        <Field label="Question de réflexion">
          <textarea value={String(draft.prompt ?? '')} onChange={(e) => set('prompt', e.target.value)} className={`${inputClass} min-h-[50px] resize-none`} />
        </Field>
        <Field label="Axes attendus">
          <textarea value={String(draft.guidance ?? '')} onChange={(e) => set('guidance', e.target.value)} className={`${inputClass} min-h-[60px] resize-none`} />
        </Field>
      </>
    )
  }

  if (type === 'miniexercise' || type === 'exercise') {
    return (
      <>
        <Field label="Énoncé">
          <textarea value={String(draft.statement ?? '')} onChange={(e) => set('statement', e.target.value)} className={`${inputClass} min-h-[60px] resize-none`} />
        </Field>
        <Field label="Indices progressifs (facultatif)">
          <ListEditor values={(draft.hints as string[]) ?? []} onChange={(v) => set('hints', v)} placeholder="Indice" />
        </Field>
        <Field label="Correction étape par étape">
          <ListEditor values={(draft.steps as string[]) ?? []} onChange={(v) => set('steps', v)} placeholder="Étape" />
        </Field>
        <Field label="Réponse finale">
          <input value={String(draft.finalAnswer ?? '')} onChange={(e) => set('finalAnswer', e.target.value)} className={inputClass} />
        </Field>
      </>
    )
  }

  if (type === 'match') {
    return (
      <>
        <Field label="Élément de gauche">
          <input value={String(draft.left ?? '')} onChange={(e) => set('left', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Élément associé (droite)">
          <input value={String(draft.right ?? '')} onChange={(e) => set('right', e.target.value)} className={inputClass} />
        </Field>
      </>
    )
  }

  if (type === 'timeline') {
    return (
      <>
        <Field label="Événement">
          <input value={String(draft.label ?? '')} onChange={(e) => set('label', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Date">
          <input value={String(draft.date ?? '')} onChange={(e) => set('date', e.target.value)} placeholder="1789" className={inputClass} />
        </Field>
      </>
    )
  }

  return null
}
