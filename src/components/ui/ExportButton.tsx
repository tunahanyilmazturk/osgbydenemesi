import { Download } from 'lucide-react'

interface ExportButtonProps {
  onClick: () => void
  disabled?: boolean
  label?: string
}

export function ExportButton({ onClick, disabled, label = "Excel'e Aktar" }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  )
}
