import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '— Seçiniz —',
  searchPlaceholder = 'Ara...',
  emptyText = 'Sonuç bulunamadı.',
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [options, query])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
      >
        <span className={value ? 'truncate' : 'text-slate-400 truncate'}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-xl max-h-56 flex flex-col">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full pl-7 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] focus:outline-none focus:border-blue-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-300 hover:text-slate-500"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          {/* Options */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-3">{emptyText}</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-blue-50 transition-colors ${
                    opt === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                  }`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
