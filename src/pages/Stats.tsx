import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Clock, HelpCircle, Target, Star, TriangleAlert, GraduationCap, BarChart3, ListTree, ChevronRight, Layers, ListChecks } from 'lucide-react'
import { db } from '../db/schema'
import { TopBar } from '../components/TopBar'
import { EmptyState } from '../components/EmptyState'
import { GamificationCard } from '../components/GamificationCard'
import { SubjectIcon } from '../lib/iconMap'
import { startOfDay, formatDateShort } from '../lib/dates'

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h} h${m > 0 ? ` ${m}` : ''}`
}

const HEATMAP_DAYS = 70

export function Stats() {
  const navigate = useNavigate()
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray()) ?? []
  const cardStates = useLiveQuery(() => db.cardStates.toArray()) ?? []
  const activities = useLiveQuery(() => db.activities.toArray()) ?? []
  const examAttempts = useLiveQuery(() => db.examAttempts.orderBy('createdAt').toArray()) ?? []
  const subjects = useLiveQuery(() => db.subjects.toArray()) ?? []

  const stats = useMemo(() => {
    const completedSessions = sessions.filter((s) => s.endedAt !== null)
    const totalTimeMs = completedSessions.reduce((sum, s) => sum + (s.endedAt! - s.startedAt), 0)
    const weekStart = startOfDay(Date.now()) - 6 * 86400000
    const timeThisWeekMs = completedSessions
      .filter((s) => s.startedAt >= weekStart)
      .reduce((sum, s) => sum + (s.endedAt! - s.startedAt), 0)
    const totalAnswered = sessions.reduce((sum, s) => sum + s.cardsSeen, 0)
    const totalCorrect = sessions.reduce((sum, s) => sum + s.correct, 0)
    const totalIncorrect = sessions.reduce((sum, s) => sum + s.incorrect, 0)
    const successRate = totalCorrect + totalIncorrect > 0 ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100) : null

    const activityToSubjects = new Map(activities.map((a) => [a.id, a.subjectIds]))
    const subjectMastery = new Map<string, { known: number; total: number }>()
    for (const cs of cardStates) {
      const subjectIds = activityToSubjects.get(cs.activityId) ?? []
      for (const sid of subjectIds) {
        const entry = subjectMastery.get(sid) ?? { known: 0, total: 0 }
        entry.total += 1
        if (cs.mastery === 'known' || cs.mastery === 'mastered') entry.known += 1
        subjectMastery.set(sid, entry)
      }
    }

    const masteryBreakdown = { unknown: 0, review: 0, known: 0, mastered: 0 }
    for (const cs of cardStates) masteryBreakdown[cs.mastery]++

    const heatmap: { date: number; count: number }[] = []
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const day = startOfDay(Date.now()) - i * 86400000
      const count = sessions
        .filter((s) => startOfDay(s.startedAt) === day)
        .reduce((sum, s) => sum + s.cardsSeen, 0)
      heatmap.push({ date: day, count })
    }
    const studiedDays = new Set(sessions.map((s) => startOfDay(s.startedAt))).size

    return {
      totalTimeMs,
      timeThisWeekMs,
      totalAnswered,
      successRate,
      subjectMastery,
      masteryBreakdown,
      heatmap,
      studiedDays,
    }
  }, [sessions, cardStates, activities])

  const hasAnyData = sessions.length > 0 || examAttempts.length > 0

  if (!hasAnyData) {
    return (
      <div>
        <TopBar title="Statistiques" />
        <div className="px-4 sm:px-8 sm:pt-8 max-w-2xl mx-auto">
          <EmptyState
            icon={<BarChart3 size={32} />}
            title="Pas encore de statistiques"
            description="Tes statistiques apparaîtront ici dès que tu auras fait une session de révision ou un examen blanc."
          />
        </div>
      </div>
    )
  }

  const maxHeat = Math.max(1, ...stats.heatmap.map((h) => h.count))

  return (
    <div>
      <TopBar title="Statistiques" />
      <div className="px-4 sm:px-8 sm:pt-8 max-w-2xl mx-auto pb-10">
        <h1 className="hidden sm:block text-2xl font-bold mb-6">Statistiques</h1>

        <GamificationCard />

        <button
          onClick={() => navigate('/notions')}
          className="w-full flex items-center gap-3 rounded-2xl bg-[var(--color-surface)] p-4 mb-6 text-left"
        >
          <ListTree size={18} className="text-[var(--color-primary)] shrink-0" />
          <span className="text-sm font-medium grow">Parcourir mes notions (filtrer, corriger manuellement)</span>
          <ChevronRight size={16} className="text-[var(--color-text-muted)] shrink-0" />
        </button>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl bg-[var(--color-surface)] p-4">
            <Clock size={18} className="text-[var(--color-primary)] mb-2" />
            <p className="text-xl font-bold">{formatDuration(stats.totalTimeMs)}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Temps total ({formatDuration(stats.timeThisWeekMs)} cette semaine)</p>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface)] p-4">
            <HelpCircle size={18} className="text-[var(--color-primary)] mb-2" />
            <p className="text-xl font-bold">{stats.totalAnswered}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Questions répondues</p>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface)] p-4">
            <Target size={18} className="text-[var(--color-primary)] mb-2" />
            <p className="text-xl font-bold">{stats.successRate !== null ? `${stats.successRate}%` : '—'}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Taux de réussite</p>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface)] p-4">
            <Star size={18} className="text-[var(--color-primary)] mb-2" />
            <p className="text-xl font-bold">{stats.studiedDays}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Jours de révision</p>
          </div>
        </div>

        {stats.subjectMastery.size > 0 && (
          <section className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
              Progression par matière
            </p>
            <div className="rounded-2xl bg-[var(--color-surface)] p-4 flex flex-col gap-3">
              {[...stats.subjectMastery.entries()].map(([sid, m]) => {
                const subject = subjects.find((s) => s.id === sid)
                const pct = m.total > 0 ? Math.round((m.known / m.total) * 100) : 0
                return (
                  <div key={sid}>
                    <div className="flex items-center gap-2 mb-1">
                      <SubjectIcon name={subject?.icon ?? ''} size={14} style={{ color: subject?.color }} />
                      <span className="text-sm font-medium grow">{subject?.name ?? 'Matière'}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: subject?.color ?? 'var(--color-primary)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
            Notions
          </p>
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl bg-red-500/10 p-3 text-center">
              <p className="text-lg font-bold text-red-500">{stats.masteryBreakdown.unknown}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Inconnues</p>
            </div>
            <div className="rounded-xl bg-orange-500/10 p-3 text-center">
              <p className="text-lg font-bold text-orange-500">{stats.masteryBreakdown.review}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">À revoir</p>
            </div>
            <div className="rounded-xl bg-green-500/10 p-3 text-center">
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.masteryBreakdown.known}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Connues</p>
            </div>
            <div className="rounded-xl bg-yellow-500/10 p-3 text-center">
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{stats.masteryBreakdown.mastered}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Maîtrisées</p>
            </div>
          </div>
          {stats.masteryBreakdown.unknown + stats.masteryBreakdown.review > 5 && (
            <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-2">
              <TriangleAlert size={12} /> Beaucoup de notions encore mal maîtrisées — pense au mode "jusqu'à tout connaître".
            </p>
          )}
        </section>

        <section className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
            Jours étudiés ({HEATMAP_DAYS} derniers jours)
          </p>
          <div className="rounded-2xl bg-[var(--color-surface)] p-4">
            <div className="grid grid-rows-7 grid-flow-col gap-1" style={{ gridTemplateRows: 'repeat(7, 1fr)' }}>
              {stats.heatmap.map((h, i) => (
                <div
                  key={i}
                  title={new Date(h.date).toLocaleDateString('fr-FR')}
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{
                    backgroundColor:
                      h.count === 0 ? 'var(--color-surface-muted)' : `color-mix(in srgb, var(--color-primary) ${Math.min(100, 30 + (h.count / maxHeat) * 70)}%, transparent)`,
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        {examAttempts.length > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
              Historique des examens blancs
            </p>
            <div className="rounded-2xl bg-[var(--color-surface)] p-4">
              <div className="flex items-end gap-1.5 h-20 mb-1">
                {examAttempts.slice(-12).map((a, i) => {
                  const pct = a.maxScore ? (a.score ?? 0) / a.maxScore : 0
                  return (
                    <div
                      key={i}
                      title={`${a.score}/${a.maxScore}`}
                      className="flex-1 rounded-t bg-[var(--color-primary)]"
                      style={{ height: `${Math.max(4, pct * 100)}%` }}
                    />
                  )
                })}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                <GraduationCap size={13} /> {examAttempts.length} examen{examAttempts.length > 1 ? 's' : ''} blanc
                {examAttempts.length > 1 ? 's' : ''} passé{examAttempts.length > 1 ? 's' : ''}
              </div>
            </div>
          </section>
        )}

        {sessions.length > 0 && (
          <section className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
              Historique des sessions
            </p>
            <div className="flex flex-col gap-2 pb-6">
              {sessions.slice(0, 15).map((s) => {
                const rate = s.correct + s.incorrect > 0 ? Math.round((s.correct / (s.correct + s.incorrect)) * 100) : null
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl bg-[var(--color-surface)] p-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-muted)] flex items-center justify-center shrink-0 text-[var(--color-text-muted)]">
                      {s.type === 'quiz' ? <ListChecks size={14} /> : <Layers size={14} />}
                    </div>
                    <div className="min-w-0 grow">
                      <p className="text-sm font-medium">{formatDateShort(s.startedAt)}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {s.cardsSeen} carte{s.cardsSeen > 1 ? 's' : ''}
                        {s.endedAt ? ` · ${formatDuration(s.endedAt - s.startedAt)}` : ' · interrompue'}
                      </p>
                    </div>
                    {rate !== null && <span className="text-xs font-semibold text-[var(--color-primary)] shrink-0">{rate}%</span>}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
