import { createContext, useCallback, useContext, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void
  removeToast: (id: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

let toastIdSeq = 0

const toastConfig: Record<ToastType, { icon: typeof CheckCircle2; bg: string; border: string; iconColor: string; titleColor: string }> = {
  success: { icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-200', iconColor: 'text-emerald-600', titleColor: 'text-emerald-800' },
  error: { icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', iconColor: 'text-red-600', titleColor: 'text-red-800' },
  warning: { icon: AlertCircle, bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-600', titleColor: 'text-amber-800' },
  info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'text-blue-600', titleColor: 'text-blue-800' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000) => {
      const id = ++toastIdSeq + Date.now()
      setToasts((prev) => [...prev, { id, type, title, message, duration }])
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration)
      }
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type]
          const Icon = config.icon
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl border shadow-lg ${config.bg} ${config.border} animate-toast-in`}
              role="alert"
            >
              <Icon className={`w-5 h-5 ${config.iconColor} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${config.titleColor}`}>{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-slate-600 mt-0.5 break-words">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-white shrink-0"
                aria-label="Kapat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
