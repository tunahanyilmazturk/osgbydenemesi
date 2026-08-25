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
    <div className={`shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 ${className}`}>
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-white/70 bg-white/80 shadow-sm text-slate-500 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-all"
            title="Geri"
            aria-label="Önceki sayfaya dön"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
