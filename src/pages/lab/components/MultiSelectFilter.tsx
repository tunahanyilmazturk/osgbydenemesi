import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

interface MultiSelectFilterProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  width?: string
}

const colorMap = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  width = 'w-[130px]',
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filteredOptions = options.filter((o) =>
    o.toLowerCase().includes(search.trim().toLowerCase())
  )

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className="flex flex-col gap-0.5" ref={ref}>
      <label className="text-[9px] text-slate-500">{label}</label>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={`${width} flex items-center justify-between gap-1 px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500 hover:border-slate-300 transition-colors`}
        >
          <span className="truncate">
            {selected.length === 0
              ? 'Tümü'
              : selected.length === 1
              ? selected[0]
              : `${selected.length} seçili`}
          </span>
          <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-50 top-full left-0 mt-1 w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            {/* Search */}
            <div className="relative p-1.5 border-b border-slate-100">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ara..."
                autoFocus
                className="w-full pl-5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Options */}
            <div className="max-h-[180px] overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <p className="px-2 py-3 text-[10px] text-slate-400 text-center">Sonuç yok.</p>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selected.includes(opt)
                  return (
                    <button
                      key={opt}
                      onClick={() => toggle(opt)}
                      className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-left transition-colors ${
                        isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="truncate">{opt}</span>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {selected.length > 0 && (
              <div className="border-t border-slate-100 p-1">
                <button
                  onClick={() => onChange([])}
                  className="w-full py-1 text-[10px] font-medium text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  Seçimi Temizle
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Aktif filtre chip'leri satırı
 */
interface FilterChipsProps {
  chips: Array<{ label: string; value: string; onRemove: () => void; color?: keyof typeof colorMap }>
  onClearAll: () => void
}

export function FilterChips({ chips, onClearAll }: FilterChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap py-1">
      {chips.map((chip, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${colorMap[chip.color ?? 'slate']}`}
        >
          <span className="text-slate-500 font-normal">{chip.label}:</span>
          <span className="truncate max-w-[120px]">{chip.value}</span>
          <button
            onClick={chip.onRemove}
            className="hover:bg-white/50 rounded p-0.5 transition-colors"
            title="Kaldır"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="px-2 py-0.5 text-[10px] font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors"
      >
        Tümünü Temizle
      </button>
    </div>
  )
}
