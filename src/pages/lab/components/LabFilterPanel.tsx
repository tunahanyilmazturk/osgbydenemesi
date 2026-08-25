import { DateRangeFilter } from '@/pages/lab/components/DateRangeFilter'
import { MultiSelectFilter, FilterChips } from '@/pages/lab/components/MultiSelectFilter'

export interface LabFilters {
  company: string[]
  examType: string[]
  group: string[]
  service: string[]
  status: string[]
  tc: string
  protocolNo: string
  barcode: string
}

interface LabFilterPanelProps {
  filters: LabFilters
  onFiltersChange: (filters: LabFilters) => void
  dateStart: string
  dateEnd: string
  todayStr: string
  onDateStartChange: (value: string) => void
  onDateEndChange: (value: string) => void
  companies: string[]
  examTypes: string[]
  groupNames: string[]
  serviceNames: string[]
  statusOptions: string[]
}

const EMPTY_FILTERS: LabFilters = {
  company: [],
  examType: [],
  group: [],
  service: [],
  status: [],
  tc: '',
  protocolNo: '',
  barcode: '',
}

export function LabFilterPanel({
  filters,
  onFiltersChange,
  dateStart,
  dateEnd,
  todayStr,
  onDateStartChange,
  onDateEndChange,
  companies,
  examTypes,
  groupNames,
  serviceNames,
  statusOptions,
}: LabFilterPanelProps) {
  const clearAll = () => {
    onFiltersChange({ ...EMPTY_FILTERS })
    onDateStartChange('')
    onDateEndChange('')
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1px_1fr] gap-x-4 gap-y-2.5">
        <DateRangeFilter
          startDate={dateStart}
          endDate={dateEnd}
          today={todayStr}
          onStartDateChange={onDateStartChange}
          onEndDateChange={onDateEndChange}
        />

        {/* Dikey ayraç */}
        <div className="hidden lg:block w-px bg-slate-200" />

        {/* Sağ: Filtreler — 2 alt satır */}
        <div className="flex flex-col gap-1.5">
          {/* Satır 1: Kategorisel filtreler */}
          <div className="flex items-end gap-2 flex-wrap">
            <MultiSelectFilter label="Firma" options={companies} selected={filters.company} onChange={(v) => onFiltersChange({ ...filters, company: v })} width="w-[130px]" />
            <MultiSelectFilter label="Tür" options={examTypes} selected={filters.examType} onChange={(v) => onFiltersChange({ ...filters, examType: v })} width="w-[105px]" />
            <MultiSelectFilter label="Grup" options={groupNames} selected={filters.group} onChange={(v) => onFiltersChange({ ...filters, group: v })} width="w-[105px]" />
            <MultiSelectFilter label="Hizmet" options={serviceNames} selected={filters.service} onChange={(v) => onFiltersChange({ ...filters, service: v })} width="w-[150px]" />
            <MultiSelectFilter label="Durum" options={statusOptions} selected={filters.status} onChange={(v) => onFiltersChange({ ...filters, status: v })} width="w-[120px]" />
          </div>

          {/* Satır 2: Metin aramaları + Temizle */}
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] text-slate-500">TC No</label>
              <input
                type="text"
                value={filters.tc}
                onChange={(e) => onFiltersChange({ ...filters, tc: e.target.value })}
                placeholder="12345678901"
                className="w-[110px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] text-slate-500">Protokol</label>
              <input
                type="text"
                value={filters.protocolNo}
                onChange={(e) => onFiltersChange({ ...filters, protocolNo: e.target.value })}
                placeholder="2026000001"
                className="w-[100px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] text-slate-500">Barkod</label>
              <input
                type="text"
                value={filters.barcode}
                onChange={(e) => onFiltersChange({ ...filters, barcode: e.target.value })}
                placeholder="Barkod..."
                className="w-[100px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <button
              onClick={clearAll}
              className="ml-auto px-2.5 py-1.5 text-[10px] font-medium text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors shrink-0"
            >
              ✕ Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Aktif filtre chip'leri */}
      <FilterChips
        chips={[
          ...filters.company.map((v) => ({ label: 'Firma', value: v, onRemove: () => onFiltersChange({ ...filters, company: filters.company.filter((x) => x !== v) }), color: 'blue' as const })),
          ...filters.examType.map((v) => ({ label: 'Tür', value: v, onRemove: () => onFiltersChange({ ...filters, examType: filters.examType.filter((x) => x !== v) }), color: 'purple' as const })),
          ...filters.group.map((v) => ({ label: 'Grup', value: v, onRemove: () => onFiltersChange({ ...filters, group: filters.group.filter((x) => x !== v) }), color: 'emerald' as const })),
          ...filters.service.map((v) => ({ label: 'Hizmet', value: v, onRemove: () => onFiltersChange({ ...filters, service: filters.service.filter((x) => x !== v) }), color: 'cyan' as const })),
          ...filters.status.map((v) => ({ label: 'Durum', value: v, onRemove: () => onFiltersChange({ ...filters, status: filters.status.filter((x) => x !== v) }), color: 'amber' as const })),
          ...(filters.tc ? [{ label: 'TC', value: filters.tc, onRemove: () => onFiltersChange({ ...filters, tc: '' }), color: 'slate' as const }] : []),
          ...(filters.protocolNo ? [{ label: 'Protokol', value: filters.protocolNo, onRemove: () => onFiltersChange({ ...filters, protocolNo: '' }), color: 'slate' as const }] : []),
          ...(filters.barcode ? [{ label: 'Barkod', value: filters.barcode, onRemove: () => onFiltersChange({ ...filters, barcode: '' }), color: 'slate' as const }] : []),
        ]}
        onClearAll={clearAll}
      />
    </div>
  )
}
