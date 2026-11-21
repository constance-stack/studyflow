import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  GraduationCap,
  BarChart3,
  Bot,
  Moon,
  Sun,
  Laptop,
  Download,
  Upload,
  HardDrive,
  ChevronRight,
  Info,
  Timer,
  BellRing,
  Trophy,
  ListTree,
} from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { useThemeStore } from '../store/theme'
import { exportBackup, importBackup } from '../lib/backup'
import { estimateStorageUsage } from '../db/queries'
import {
  getReminderSettings,
  notificationSupported,
  requestNotificationPermission,
  setReminder,
} from '../lib/reminders'
import { getGamificationState, setDailyGoal, setGamificationEnabled } from '../gamification/state'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

export function More() {
  const navigate = useNavigate()
  const { theme, setTheme } = useThemeStore()
  const storage = useLiveQuery(() => estimateStorageUsage())
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const reminderSettings = useLiveQuery(() => getReminderSettings())
  const gamification = useLiveQuery(() => getGamificationState())
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    notificationSupported() ? Notification.permission : 'unsupported',
  )

  useEffect(() => {
    if (notificationSupported()) setNotifPermission(Notification.permission)
  }, [])

  async function toggleReminder(enabled: boolean) {
    if (enabled && notifPermission !== 'granted') {
      const perm = await requestNotificationPermission()
      setNotifPermission(perm)
      if (perm !== 'granted') return
    }
    await setReminder(enabled, reminderSettings?.time ?? '18:00')
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const res = await importBackup(file)
      setMessage(`Sauvegarde restaurée : ${res.subjects} matière(s), ${res.documents} document(s).`)
    } catch {
      setMessage('Fichier de sauvegarde invalide.')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const links = [
    { to: '/exams', label: 'Examens', icon: GraduationCap },
    { to: '/stats', label: 'Statistiques', icon: BarChart3 },
    { to: '/assistant', label: 'Assistant IA', icon: Bot },
  ]

  return (
    <div>
      <TopBar title="Plus" />
      <div className="px-4 sm:px-8 sm:pt-8 max-w-2xl mx-auto sm:hidden">
        <section className="rounded-2xl bg-[var(--color-surface)] overflow-hidden mb-5">
          {links.map(({ to, label, icon: Icon }, i) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${
                i > 0 ? 'border-t' : ''
              }`}
            >
              <Icon size={19} className="text-[var(--color-text-muted)]" />
              <span className="grow font-medium">{label}</span>
              <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
            </button>
          ))}
        </section>

        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] px-1 mb-2">
          Apparence
        </p>
        <section className="rounded-2xl bg-[var(--color-surface)] p-1.5 flex gap-1 mb-5">
          {([
            ['light', 'Clair', Sun],
            ['dark', 'Sombre', Moon],
            ['system', 'Système', Laptop],
          ] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium ${
                theme === value ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)]'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </section>
      </div>

      <div className="px-4 sm:px-8 max-w-2xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] px-1 mb-2">
          Révision
        </p>
        <section className="rounded-2xl bg-[var(--color-surface)] divide-y mb-5">
          <button onClick={() => navigate('/focus')} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
            <Timer size={19} className="text-[var(--color-text-muted)]" />
            <span className="grow font-medium text-sm">Mode concentration</span>
            <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
          </button>
          <button onClick={() => navigate('/notions')} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
            <ListTree size={19} className="text-[var(--color-text-muted)]" />
            <span className="grow font-medium text-sm">Mes notions</span>
            <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
          </button>

          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-2">
              <BellRing size={19} className="text-[var(--color-text-muted)] shrink-0" />
              <div className="grow">
                <p className="font-medium text-sm">Rappel de révision quotidien</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {notifPermission === 'unsupported'
                    ? "Non disponible sur ce navigateur."
                    : "Ne fonctionne que si StudyFlow est ouvert dans un onglet à ce moment-là — pas de notification en arrière-plan sans serveur."}
                </p>
              </div>
              <button
                onClick={() => toggleReminder(!reminderSettings?.enabled)}
                disabled={notifPermission === 'unsupported'}
                className={`w-11 h-6 rounded-full shrink-0 relative transition-colors disabled:opacity-40 ${
                  reminderSettings?.enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-muted)]'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    reminderSettings?.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {reminderSettings?.enabled && (
              <input
                type="time"
                value={reminderSettings.time}
                onChange={(e) => setReminder(true, e.target.value)}
                className="rounded-lg px-3 py-1.5 bg-[var(--color-surface-muted)] text-sm outline-none"
              />
            )}
          </div>

          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-2">
              <Trophy size={19} className="text-[var(--color-text-muted)] shrink-0" />
              <span className="grow font-medium text-sm">Gamification (XP, séries, objectif)</span>
              <button
                onClick={() => setGamificationEnabled(!gamification?.enabled)}
                className={`w-11 h-6 rounded-full shrink-0 relative transition-colors ${
                  gamification?.enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-muted)]'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    gamification?.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {gamification?.enabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">Objectif quotidien :</span>
                <input
                  type="number"
                  min={1}
                  value={gamification.dailyGoalCards}
                  onChange={(e) => setDailyGoal(Number(e.target.value) || 1)}
                  className="w-16 rounded-lg px-2 py-1 bg-[var(--color-surface-muted)] text-sm outline-none"
                />
                <span className="text-xs text-[var(--color-text-muted)]">cartes/jour</span>
              </div>
            )}
          </div>
        </section>

        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] px-1 mb-2">
          Données
        </p>
        <section className="rounded-2xl bg-[var(--color-surface)] divide-y mb-5">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <HardDrive size={19} className="text-[var(--color-text-muted)]" />
            <div className="grow">
              <p className="font-medium text-sm">Stockage utilisé</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {storage ? `${formatBytes(storage.usage)} sur ${formatBytes(storage.quota)} disponibles` : 'Calcul...'}
              </p>
            </div>
          </div>
          <button onClick={() => exportBackup()} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
            <Download size={19} className="text-[var(--color-text-muted)]" />
            <div className="grow">
              <p className="font-medium text-sm">Exporter une sauvegarde</p>
              <p className="text-xs text-[var(--color-text-muted)]">Toutes tes matières, documents et notes en un fichier</p>
            </div>
          </button>
          <label className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer">
            <Upload size={19} className="text-[var(--color-text-muted)]" />
            <div className="grow">
              <p className="font-medium text-sm">{importing ? 'Restauration...' : 'Restaurer une sauvegarde'}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Remplace les données actuelles par celles du fichier</p>
            </div>
            <input type="file" accept="application/json" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </section>

        {message && (
          <p className="text-sm text-[var(--color-primary)] mb-5 px-1">{message}</p>
        )}

        <section className="rounded-2xl bg-[var(--color-surface-muted)] p-4 flex items-start gap-3 text-sm text-[var(--color-text-muted)] mb-8">
          <Info size={18} className="shrink-0 mt-0.5" />
          <p>
            Tes données sont stockées uniquement sur cet appareil (dans ce navigateur). Si tu désinstalles
            StudyFlow, changes de téléphone ou vides les données du navigateur, elles seront perdues — pense à
            exporter une sauvegarde régulièrement.
          </p>
        </section>
      </div>
    </div>
  )
}
