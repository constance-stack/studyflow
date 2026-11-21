import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { SideNav } from '../components/SideNav'
import { checkAndShowReminder } from '../lib/reminders'

export function AppLayout() {
  useEffect(() => {
    checkAndShowReminder()
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkAndShowReminder()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <SideNav />
      <div className="flex-1 min-w-0 pb-20 sm:pb-0">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
