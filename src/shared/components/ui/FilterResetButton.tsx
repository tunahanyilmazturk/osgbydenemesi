import { RotateCcw } from 'lucide-react'

interface FilterResetButtonProps {
  onClick: () => void
  label?: string
  disabled?: boolean
}

export function FilterResetButton({ onClick, label = 'Sıfırla', disabled = false }: FilterResetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1 ml-auto disabled:opacity-40 disabled:pointer-events-none"
    >
      <RotateCcw className="w-3 h-3" />
      {label}
    </button>
  )
}
