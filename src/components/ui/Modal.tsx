import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
  size?: 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

export function Modal({ isOpen, onClose, title, subtitle, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    md: 'max-w-md max-h-[90vh] rounded-2xl',
    lg: 'max-w-2xl max-h-[92vh] rounded-2xl',
    xl: 'max-w-5xl max-h-[95vh] rounded-2xl',
    '2xl': 'max-w-7xl w-[95vw] max-h-[96vh] rounded-2xl',
    full: 'w-full h-full max-w-none rounded-none',
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${size === 'full' ? '' : 'p-4'} bg-black/50 backdrop-blur-sm`}
    >
      <div className={`bg-white shadow-2xl overflow-y-auto flex flex-col ${sizeClasses[size]}`}>
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-lg font-bold text-slate-800 shrink-0">{title}</h3>
            {subtitle && <div className="min-w-0 flex-1">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        <div className={`flex-1 ${size === 'full' ? 'p-6 lg:p-8' : 'p-6'}`}>{children}</div>
      </div>
    </div>
  )
}
