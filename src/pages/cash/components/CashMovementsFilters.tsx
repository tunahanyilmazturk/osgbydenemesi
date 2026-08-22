import { Filter, Search } from 'lucide-react'
import { FilterResetButton } from '../../../components/ui/FilterResetButton'

interface CashMovementsFiltersProps {
  startDate: string
  endDate: string
  paymentTypeFilter: string
  kasaFilter: string
  search: string
  paymentTypes: string[]
  kasaOptions: string[]
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onPaymentTypeFilterChange: (value: string) => void
  onKasaFilterChange: (value: string) => void
  onSearchChange: (value: string) => void
  onReset: () => void
}

export function CashMovementsFilters({
  startDate,
  endDate,
  paymentTypeFilter,
  kasaFilter,
  search,
  paymentTypes,
  kasaOptions,
  onStartDateChange,
  onEndDateChange,
  onPaymentTypeFilterChange,
  onKasaFilterChange,
  onSearchChange,
  onReset,
}: CashMovementsFiltersProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          Filtreler
        </div>
        <FilterResetButton onClick={onReset} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Başlangıç</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Bitiş</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Ödeme Tipi</label>
          <select
            value={paymentTypeFilter}
            onChange={(e) => onPaymentTypeFilterChange(e.target.value)}
            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
          >
            {paymentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Kasa</label>
          <select
            value={kasaFilter}
            onChange={(e) => onKasaFilterChange(e.target.value)}
            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
          >
            {kasaOptions.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Ara</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Kasa, hasta, protokol..."
              className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
