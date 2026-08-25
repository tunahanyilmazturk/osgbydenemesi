interface ServiceStats {
  pending: number
  accepted: number
  resulted: number
  approved: number
  total: number
}

type ServiceStatus = 'pending' | 'accepted' | 'resulted' | 'approved'

interface ServiceStatusSummaryProps {
  protocolNo: string
  examType: string
  stats: ServiceStats
  activeFilter: string | null
  onFilterChange: (filter: string | null) => void
}

export function ServiceStatusSummary({ protocolNo, examType, stats, activeFilter, onFilterChange }: ServiceStatusSummaryProps) {
  const filters: { key: ServiceStatus; label: string; count: number; activeClass: string; inactiveClass: string }[] = [
    { key: 'pending', label: 'Bekleyen', count: stats.pending, activeClass: 'bg-slate-600 text-white ring-2 ring-slate-300', inactiveClass: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
    { key: 'accepted', label: 'Kabul', count: stats.accepted, activeClass: 'bg-amber-600 text-white ring-2 ring-amber-300', inactiveClass: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
    { key: 'resulted', label: 'Sonuç Girildi', count: stats.resulted, activeClass: 'bg-blue-600 text-white ring-2 ring-blue-300', inactiveClass: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { key: 'approved', label: 'Onaylandı', count: stats.approved, activeClass: 'bg-emerald-600 text-white ring-2 ring-emerald-300', inactiveClass: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  ]

  return (
    <div className="flex items-center gap-2 flex-wrap text-[11px]">
      <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-100">
        Protokol: {protocolNo}
      </span>
      <span className="px-2 py-1 text-xs bg-slate-50 text-slate-600 rounded-lg border border-slate-100">
        {examType}
      </span>
      <span className="w-px h-4 bg-slate-200" />
      <span className="text-slate-500 font-medium">Özet:</span>
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onFilterChange(activeFilter === f.key ? null : f.key)}
          className={`px-2 py-0.5 rounded-full font-medium transition-all ${activeFilter === f.key ? f.activeClass : f.inactiveClass}`}
        >
          {f.label}: {f.count}
        </button>
      ))}
      {activeFilter && (
        <button
          onClick={() => onFilterChange(null)}
          className="px-2 py-0.5 rounded-full font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Filtreyi temizle"
        >
          ✕ Filtre
        </button>
      )}
      <span className="text-slate-400">/ Toplam: {stats.total}</span>
    </div>
  )
}
