import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Zap, Shuffle, GraduationCap, Library, Lock, CalendarDays } from 'lucide-react'
import { db } from '../db/schema'
import { TopBar } from '../components/TopBar'
import { SubjectIcon } from '../lib/iconMap'
import { countdownLabel, formatDateShort, startOfDay } from '../lib/dates'
import { GamificationCard } from '../components/GamificationCard'
import type { SessionConfig } from './StudySession'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function QuickAction({
  icon,
  label,
  available,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  available: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={available ? onClick : undefined}
      className={`flex flex-col items-center gap-2 rounded-2xl p-4 flex-1 ${
        available ? 'bg-[var(--color-surface)] active:scale-95' : 'bg-[var(--color-surface-muted)] opacity-60'
      } transition-transform`}
    >
      <div className="relative">
        {icon}
        {!available && (
          <Lock size={11} className="absolute -right-1.5 -bottom-1 text-[var(--color-text-muted)]" />
        )}
      </div>
      <span className="text-xs font-medium text-center text-[var(--color-text)]">{label}</span>
    </button>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const subjects =
    useLiveQuery(async () => {
      const all = await db.subjects.orderBy('order').toArray()
      return all.filter((s) => !s.archived)
    }) ?? []
  const chapterCount = useLiveQuery(() => db.chapters.count()) ?? 0
  const documentCount = useLiveQuery(() => db.documents.count()) ?? 0
  const activityCount = useLiveQuery(() => db.activities.count()) ?? 0
  const subjectsAll = useLiveQuery(() => db.subjects.toArray()) ?? []
  const upcomingExams =
    useLiveQuery(() =>
      db.exams
        .where('date')
        .aboveOrEqual(startOfDay(Date.now()))
        .sortBy('date'),
    ) ?? []

  function launchQuick(filter: 'due' | 'all', title: string) {
    db.activities.toArray().then((activities) => {
      const config: SessionConfig = {
        activityIds: activities.map((a) => a.id),
        filter,
        untilMastered: false,
        title,
        cardLimit: 15,
      }
      navigate('/review/session', { state: config })
    })
  }

  return (
    <div>
      <TopBar title="Accueil" />
      <div className="px-4 sm:px-8 sm:pt-8 max-w-3xl mx-auto">
        <div className="mb-6 hidden sm:block">
          <h1 className="text-2xl font-bold">{greeting()} 👋</h1>
          <p className="text-[var(--color-text-muted)] mt-1">Prête à réviser aujourd'hui ?</p>
        </div>
        <p className="sm:hidden text-[var(--color-text-muted)] mb-5 -mt-2">{greeting()}, prête à réviser ?</p>

        <GamificationCard />

        <section className="grid grid-cols-3 gap-3 mb-6">
          <QuickAction
            icon={<Zap size={22} className="text-[var(--color-primary)]" />}
            label="Révision rapide"
            available={activityCount > 0}
            onClick={() => launchQuick('due', 'Révision rapide')}
          />
          <QuickAction
            icon={<Shuffle size={22} className="text-[var(--color-primary)]" />}
            label="Révision aléatoire"
            available={activityCount > 0}
            onClick={() => launchQuick('all', 'Révision aléatoire')}
          />
          <QuickAction
            icon={<GraduationCap size={22} className="text-[var(--color-primary)]" />}
            label="Examen blanc"
            available
            onClick={() => navigate('/exams')}
          />
        </section>

        <section className="grid grid-cols-3 gap-3 mb-8">
          <div className="rounded-2xl bg-[var(--color-surface)] p-4 text-center">
            <p className="text-2xl font-bold">{subjects.length}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Matières</p>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface)] p-4 text-center">
            <p className="text-2xl font-bold">{chapterCount}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Chapitres</p>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface)] p-4 text-center">
            <p className="text-2xl font-bold">{documentCount}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Documents</p>
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Mes matières</h2>
            <button onClick={() => navigate('/library')} className="text-sm text-[var(--color-primary)] font-medium">
              Voir tout
            </button>
          </div>
          {subjects.length === 0 ? (
            <button
              onClick={() => navigate('/library')}
              className="w-full rounded-2xl border-2 border-dashed p-6 text-center text-[var(--color-text-muted)]"
            >
              <Library className="mx-auto mb-2" size={22} />
              Crée ta première matière
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {subjects.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/library/${s.id}`)}
                  className="flex items-center gap-2.5 rounded-2xl bg-[var(--color-surface)] p-3.5 text-left active:scale-95 transition-transform"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: s.color + '26', color: s.color }}
                  >
                    <SubjectIcon name={s.icon} size={18} />
                  </div>
                  <span className="font-medium text-sm truncate">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Examens à venir</h2>
            <button onClick={() => navigate('/calendar')} className="text-sm text-[var(--color-primary)] font-medium">
              Calendrier
            </button>
          </div>
          {upcomingExams.length === 0 ? (
            <button
              onClick={() => navigate('/calendar')}
              className="w-full rounded-2xl border-2 border-dashed p-6 text-center text-[var(--color-text-muted)]"
            >
              <CalendarDays className="mx-auto mb-2" size={22} />
              Ajoute un examen à ton calendrier
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingExams.slice(0, 3).map((exam) => {
                const subject = subjectsAll.find((s) => s.id === exam.subjectId)
                return (
                  <button
                    key={exam.id}
                    onClick={() => navigate('/calendar')}
                    className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-3.5 text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: (subject?.color ?? '#999') + '26', color: subject?.color ?? '#999' }}
                    >
                      <SubjectIcon name={subject?.icon ?? ''} size={18} />
                    </div>
                    <div className="min-w-0 grow">
                      <p className="font-medium text-sm truncate">{exam.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{formatDateShort(exam.date)}</p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-primary)] shrink-0">
                      {countdownLabel(exam.date)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
