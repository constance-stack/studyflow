import { db } from '../db/schema'
import { startOfDay } from './dates'

const KEY = 'reminder_settings'

export interface ReminderSettings {
  enabled: boolean
  time: string // "HH:MM"
  lastShownDay: number | null
}

const DEFAULT: ReminderSettings = { enabled: false, time: '18:00', lastShownDay: null }

export async function getReminderSettings(): Promise<ReminderSettings> {
  const row = await db.settings.get(KEY)
  return { ...DEFAULT, ...((row?.value as Partial<ReminderSettings>) ?? {}) }
}

async function save(settings: ReminderSettings): Promise<void> {
  await db.settings.put({ key: KEY, value: settings })
}

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationSupported()) return 'denied'
  return Notification.requestPermission()
}

export async function setReminder(enabled: boolean, time: string): Promise<void> {
  const current = await getReminderSettings()
  await save({ ...current, enabled, time })
}

// Best-effort only: this can only fire while the app is open in a tab (no backend push server),
// so it is not a reliable background notification — disclosed in the UI, never presented as guaranteed.
export async function checkAndShowReminder(): Promise<void> {
  if (!notificationSupported() || Notification.permission !== 'granted') return
  const settings = await getReminderSettings()
  if (!settings.enabled) return

  const today = startOfDay(Date.now())
  if (settings.lastShownDay === today) return

  const [h, m] = settings.time.split(':').map(Number)
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (Date.now() < target.getTime()) return

  new Notification('StudyFlow', { body: "C'est l'heure de réviser ! 📚", icon: `${import.meta.env.BASE_URL}icons/icon-192.png` })
  await save({ ...settings, lastShownDay: today })
}
