import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
  showBack?: boolean
}

export function PageHeader({ title, subtitle, action, className = '', showBack = true }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 ${className}`}>
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Geri"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
