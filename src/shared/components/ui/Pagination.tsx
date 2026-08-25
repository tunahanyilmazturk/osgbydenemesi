import { ArrowLeft, ArrowRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

function getPageItems(page: number, totalPages: number): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const items: (number | 'ellipsis-start' | 'ellipsis-end')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)

  if (start > 2) items.push('ellipsis-start')
  for (let current = start; current <= end; current += 1) items.push(current)
  if (end < totalPages - 1) items.push('ellipsis-end')
  items.push(totalPages)
  return items
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label="Sayfalama"
      className="px-3 py-2 border-t border-slate-100 shrink-0 flex items-center justify-between gap-2"
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Önceki sayfa"
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40"
      >
        <ArrowLeft className="w-3 h-3" />
        Önceki
      </button>
      <div className="flex items-center gap-1 overflow-x-auto">
        {getPageItems(page, totalPages).map((item) =>
          typeof item === 'string' ? (
            <span key={item} className="w-7 text-center text-xs text-slate-400" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              type="button"
              key={item}
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
              aria-label={`${item}. sayfa`}
              className={`w-7 h-7 text-xs font-medium rounded-lg ${
                item === page ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item}
            </button>
          )
        )}
      </div>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Sonraki sayfa"
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40"
      >
        Sonraki
        <ArrowRight className="w-3 h-3" />
      </button>
    </nav>
  )
}
