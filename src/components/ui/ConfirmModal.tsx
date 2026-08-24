import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary'
  skipKey?: string
  onSkipConfirm?: (key: string) => void
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Sil',
  cancelText = 'İptal',
  confirmVariant = 'danger',
  skipKey,
  onSkipConfirm,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const handleConfirmClick = () => {
    onConfirm()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${confirmVariant === 'danger' ? 'text-red-500' : 'text-blue-500'}`} />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600">{message}</p>
          {skipKey && (
            <label className="flex items-center gap-2 mt-4 text-xs text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                id="skip-confirm"
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                onChange={(e) => {
                  if (e.target.checked && onSkipConfirm) {
                    onSkipConfirm(skipKey)
                  }
                }}
              />
              Bu işlem için tekrar sorma
            </label>
          )}
        </div>
        <div className="px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
          {cancelText && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirmClick}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
