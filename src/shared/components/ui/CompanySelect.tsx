import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import type { Company } from '@/state/CompaniesContext'

interface CompanySelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  companies: Company[]
  placeholder?: string
}

export function CompanySelect({
  label,
  value,
  onChange,
  companies,
  placeholder = 'Firma ara veya seç...',
}: CompanySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const normalizedSearch = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    const list = [...companies]
    if (normalizedSearch) {
      return list.filter((c) => c.name.toLowerCase().includes(normalizedSearch))
    }
    return list
  }, [companies, normalizedSearch])

  const showBireysel = !normalizedSearch || 'bireysel'.includes(normalizedSearch)

  const openDropdown = () => {
    setIsOpen(true)
    setSearch('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSelect = (name: string) => {
    onChange(name)
    setSearch('')
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) {
        handleSelect(filtered[0].name)
      } else if (showBireysel) {
        handleSelect('Bireysel')
      }
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const isSelected = (name: string) => value.toLowerCase() === name.toLowerCase()

  return (
    <div ref={containerRef} className="relative">
      {label && <label htmlFor={triggerId} className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>}

      {/* Trigger button — shows selected value, opens dropdown on click */}
      <button
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={openDropdown}
        className={`w-full flex items-center gap-2 px-3 py-2 bg-slate-50 border rounded-xl text-sm transition-all ${
          isOpen
            ? 'border-blue-500 bg-white ring-4 ring-blue-500/10'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <span className={`flex-1 text-left truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search input inside dropdown */}
          <div className="relative p-2 border-b border-slate-100">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Firma ara..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {showBireysel && (
              <button
                type="button"
                onClick={() => handleSelect('Bireysel')}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 ${
                  isSelected('Bireysel') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                }`}
              >
                <span>Bireysel</span>
                {isSelected('Bireysel') && <Check className="w-4 h-4" />}
              </button>
            )}
            {filtered.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => handleSelect(company.name)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 ${
                  isSelected(company.name) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                }`}
              >
                <span className="text-left truncate">{company.name}</span>
                {isSelected(company.name) && <Check className="w-4 h-4 shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && !showBireysel && (
              <p className="px-3 py-3 text-xs text-slate-500 text-center">
                Firma bulunamadı. Önce Firma Tanımları ekranından ekleyin.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
