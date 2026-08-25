export type Page = 'dashboard' | 'patients' | 'lab' | 'accounting' | 'stats' | 'settings'

export interface ScheduleItem { title: string; time: string }
export interface Activity { text: string; time: string }
export interface QuickAction { label: string; icon: string; color: string }

export interface StatItem {
  label: string
  value: string | number
  change: string
  trend: 'up' | 'down'
  icon: string
  color: string
}
