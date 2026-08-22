import { Activity, Building2, ClipboardList, Clock, FlaskConical, Stethoscope, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import type { StatItem } from '../../types'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Activity,
  FlaskConical,
  Wallet,
  Building2,
  ClipboardList,
  Clock,
  Stethoscope,
}

interface StatCardProps {
  stat: StatItem
}

export function StatCard({ stat }: StatCardProps) {
  const Icon = iconMap[stat.icon] ?? Users
  const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown
  const trendColor = stat.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
  const trendBg = stat.trend === 'up' ? 'bg-emerald-50' : 'bg-rose-50'

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`${stat.color} p-3 rounded-xl text-white shadow-lg shadow-black/10`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${trendBg} ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          {stat.change}
        </div>
      </div>
      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
    </div>
  )
}
