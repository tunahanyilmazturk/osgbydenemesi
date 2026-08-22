import { Link } from 'react-router-dom'
import { Home, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction }: EmptyStateProps) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {Icon && (
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Icon className="w-8 h-8 text-slate-400" />
          </div>
        )}
        <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
        {description && <p className="text-sm text-slate-500 mb-4">{description}</p>}
        {actionLabel && (actionTo || onAction) && (
          actionTo ? (
            <Link
              to={actionTo}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Home className="w-4 h-4" />
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              {actionLabel}
            </button>
          )
        )}
      </div>
    </div>
  )
}

interface ErrorPageProps {
  code?: string
  title: string
  description?: string
  showHomeButton?: boolean
}

export function ErrorPage({ code = 'HATA', title, description, showHomeButton = true }: ErrorPageProps) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="relative inline-block mb-6">
          <span className="text-7xl font-black text-slate-100">{code}</span>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-400">
            {title}
          </span>
        </div>
        {description && <p className="text-sm text-slate-500 mb-6">{description}</p>}
        {showHomeButton && (
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Ana Sayfaya Dön
          </Link>
        )}
      </div>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Sayfa Bulunamadı"
      description="Aradığınız sayfa taşınmış veya hiç var olmamış olabilir. Adresi kontrol edip tekrar deneyin."
    />
  )
}

export function ServerErrorPage() {
  return (
    <ErrorPage
      code="500"
      title="Sunucu Hatası"
      description="Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin veya destek ekibine başvurun."
    />
  )
}
