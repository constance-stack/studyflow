import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Grid3x3,
  Pencil,
  Trash2,
  ListTodo,
  GraduationCap,
} from 'lucide-react'
import { db } from '../db/schema'
import { createExam, deleteExam, updateExam } from '../db/queries'
import { TopBar } from '../components/TopBar'
import { SubjectIcon } from '../lib/iconMap'
import { EmptyState } from '../components/EmptyState'
import { ActionSheet } from '../components/ActionSheet'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ExamFormSheet, type ExamFormValues } from '../components/ExamFormSheet'
import { RevisionPlanSheet } from '../components/RevisionPlanSheet'
import { countdownLabel, formatDateLong, formatTime, startOfDay } from '../lib/dates'
import type { Exam } from '../db/types'

const IMPORTANCE_DOT: Record<Exam['importance'], string> = {
  low: 'bg-[var(--color-text-muted)]',
  medium: 'bg-orange-500',
  high: 'bg-red-500',
}

function ExamRow({ exam, subject, onOpen }: { exam: Exam; subject: { name: string; color: string; icon: string } | undefined; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-full flex items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-3.5 text-left">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: (subject?.color ?? '#999') + '26', color: subject?.color ?? '#999' }}
      >
        <SubjectIcon name={subject?.icon ?? ''} size={19} />
      </div>
      <div className="min-w-0 grow">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${IMPORTANCE_DOT[exam.importance]}`} />
          <p className="font-medium truncate">{exam.name}</p>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] truncate">
          {subject?.name} · {formatDateLong(exam.date)} à {formatTime(exam.date)}
        </p>
      </div>
      <span className="text-xs font-semibold text-[var(--color-primary)] shrink-0">{countdownLabel(exam.date)}</span>
    </button>
  )
}

export function CalendarPage() {
  const navigate = useNavigate()
  const exams = useLiveQuery(() => db.exams.orderBy('date').toArray()) ?? []
  const subjects = useLiveQuery(() => db.subjects.toArray()) ?? []
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])

  const [view, setView] = useState<'agenda' | 'month'>('agenda')
  const [monthCursor, setMonthCursor] = useState(() => startOfDay(Date.now()))
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Exam | null>(null)
  const [detailExam, setDetailExam] = useState<Exam | null>(null)
  const [actionsFor, setActionsFor] = useState<Exam | null>(null)
  const [planExam, setPlanExam] = useState<Exam | null>(null)

  const upcoming = exams.filter((e) => e.date >= startOfDay(Date.now()))
  const past = exams.filter((e) => e.date < startOfDay(Date.now()))

  const monthDays = useMemo(() => {
    const d = new Date(monthCursor)
    const year = d.getFullYear()
    const month = d.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const startWeekday = (firstOfMonth.getDay() + 6) % 7 // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: { date: number; inMonth: boolean }[] = []
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ date: new Date(year, month, i - startWeekday + 1).getTime(), inMonth: false })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(year, month, day).getTime(), inMonth: true })
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date
      cells.push({ date: last + 86400000, inMonth: false })
    }
    return cells
  }, [monthCursor])

  const examsByDay = useMemo(() => {
    const map = new Map<number, Exam[]>()
    for (const e of exams) {
      const key = startOfDay(e.date)
      map.set(key, [...(map.get(key) ?? []), e])
    }
    return map
  }, [exams])

  function handleSubmitForm(values: ExamFormValues) {
    if (editing) updateExam(editing.id, values)
    else createExam(values)
  }

  return (
    <div>
      <TopBar title="Calendrier" />
      <div className="px-4 sm:px-8 sm:pt-8 max-w-2xl mx-auto">
        <div className="hidden sm:flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Calendrier</h1>
          <button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 bg-[var(--color-primary)] text-white font-medium text-sm"
          >
            <Plus size={16} /> Nouvel examen
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView('agenda')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium ${
              view === 'agenda' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
            }`}
          >
            <List size={14} /> Agenda
          </button>
          <button
            onClick={() => setView('month')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium ${
              view === 'month' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-muted)]'
            }`}
          >
            <Grid3x3 size={14} /> Mois
          </button>
        </div>

        {view === 'month' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setMonthCursor((c) => new Date(new Date(c).setMonth(new Date(c).getMonth() - 1)).getTime())}
                className="p-2 rounded-full bg-[var(--color-surface-muted)]"
              >
                <ChevronLeft size={16} />
              </button>
              <p className="font-semibold capitalize">
                {new Date(monthCursor).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </p>
              <button
                onClick={() => setMonthCursor((c) => new Date(new Date(c).setMonth(new Date(c).getMonth() + 1)).getTime())}
                className="p-2 rounded-full bg-[var(--color-surface-muted)]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--color-text-muted)] mb-1">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((cell, i) => {
                const dayExams = examsByDay.get(startOfDay(cell.date)) ?? []
                const isToday = startOfDay(cell.date) === startOfDay(Date.now())
                return (
                  <button
                    key={i}
                    onClick={() => dayExams[0] && setDetailExam(dayExams[0])}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs ${
                      cell.inMonth ? '' : 'opacity-30'
                    } ${isToday ? 'bg-[var(--color-primary)]/15 font-bold' : ''}`}
                  >
                    {new Date(cell.date).getDate()}
                    {dayExams.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {exams.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={32} />}
            title="Aucun examen planifié"
            description="Ajoute tes examens pour suivre le compte à rebours et générer un planning de révision."
            action={
              <button
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
                className="rounded-xl px-5 py-2.5 bg-[var(--color-primary)] text-white font-medium text-sm"
              >
                Ajouter un examen
              </button>
            }
          />
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  À venir
                </p>
                <div className="flex flex-col gap-2 mb-6">
                  {upcoming.map((e) => (
                    <ExamRow key={e.id} exam={e} subject={subjectMap.get(e.subjectId)} onOpen={() => setDetailExam(e)} />
                  ))}
                </div>
              </>
            )}
            {past.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                  Passés
                </p>
                <div className="flex flex-col gap-2 pb-4 opacity-60">
                  {past.map((e) => (
                    <ExamRow key={e.id} exam={e} subject={subjectMap.get(e.subjectId)} onOpen={() => setDetailExam(e)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => {
          setEditing(null)
          setFormOpen(true)
        }}
        className="sm:hidden fixed right-5 bottom-24 z-40 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg active:scale-95"
      >
        <Plus size={24} />
      </button>

      <ExamFormSheet open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmitForm} initial={editing} />

      <ActionSheet
        open={!!detailExam}
        title={detailExam?.name ?? ''}
        onClose={() => setDetailExam(null)}
        actions={
          detailExam
            ? [
                {
                  key: 'plan',
                  label: 'Planning de révision',
                  icon: <ListTodo size={18} />,
                  onSelect: () => setPlanExam(detailExam),
                },
                {
                  key: 'exam',
                  label: 'Créer un examen blanc pour réviser',
                  icon: <GraduationCap size={18} />,
                  onSelect: () => navigate('/exams', { state: { subjectId: detailExam.subjectId, chapterIds: detailExam.chapterIds } }),
                },
                {
                  key: 'edit',
                  label: 'Modifier',
                  icon: <Pencil size={18} />,
                  onSelect: () => {
                    setEditing(detailExam)
                    setFormOpen(true)
                  },
                },
                {
                  key: 'delete',
                  label: 'Supprimer',
                  icon: <Trash2 size={18} />,
                  danger: true,
                  onSelect: () => setActionsFor(detailExam),
                },
              ]
            : []
        }
      />

      <ConfirmDialog
        open={!!actionsFor}
        title="Supprimer cet examen ?"
        description={`"${actionsFor?.name}" sera retiré de ton calendrier.`}
        confirmLabel="Supprimer"
        danger
        onCancel={() => setActionsFor(null)}
        onConfirm={() => {
          if (actionsFor) deleteExam(actionsFor.id)
          setActionsFor(null)
        }}
      />

      {planExam && <RevisionPlanSheet open={!!planExam} onClose={() => setPlanExam(null)} exam={planExam} />}
    </div>
  )
}
