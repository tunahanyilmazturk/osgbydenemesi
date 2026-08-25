import { FileText, FlaskConical, Stethoscope, UserPlus } from 'lucide-react'
import type { QuickAction } from '@/shared/types'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  UserPlus,
  FileText,
  FlaskConical,
  Stethoscope,
}

interface QuickActionButtonProps {
  action: QuickAction
}

export function QuickActionButton({ action }: QuickActionButtonProps) {
  const Icon = iconMap[action.icon] ?? UserPlus

  return (
    <button className={`flex flex-col items-center gap-3 p-5 rounded-2xl text-white font-medium shadow-lg shadow-black/10 ${action.color}`}>
      <Icon className="w-7 h-7" />
      <span>{action.label}</span>
    </button>
  )
}
