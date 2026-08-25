import type { KeyboardEvent, MouseEvent } from 'react'
import { Barcode, Search } from 'lucide-react'
import type { PatientDetail, Protocol } from '@/shared/types'
import { Pagination } from '@/shared/components/ui/Pagination'
import { ProtocolCard } from '@/pages/lab/components/ProtocolCard'
import { PrintResultsDropdown } from '@/pages/lab/components/PrintResultsDropdown'

type SortField = 'protocolNo' | 'patientName' | 'company' | 'tc'
type SortConfig = { field: SortField; direction: 'asc' | 'desc' } | null

interface ProtocolStats {
  pending: number
  approved: number
  total: number
}

interface ProtocolListPanelProps {
  selectedProtocolIds: number[]
  searchFilteredProtocols: Protocol[]
  paginatedProtocolsAll: Protocol[]
  patients: PatientDetail[]
  selectedProtocolId: number | null
  protocolStats: Map<number, ProtocolStats>
  currentTimestamp: number
  searchAll: string
  onSearchAllChange: (value: string) => void
  sortConfig: SortConfig
  sortOptions: Array<{ field: SortField; label: string }>
  onSort: (field: SortField) => void
  onSortConfigChange: (config: SortConfig) => void
  onSelectAllProtocols: () => void
  onProtocolCardClick: (event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>, id: number) => void
  protocolPageSize: number
  onProtocolPageSizeChange: (size: number) => void
  protocolPage: number
  totalProtocolPagesAll: number
  onProtocolPageChange: (page: number) => void
  selectedProtocol: Protocol | null
  onOpenBarcodeModal: () => void
  showPrintDropdown: boolean
  onTogglePrintDropdown: () => void
  onClosePrintDropdown: () => void
  isPrintingAll: boolean
  isZippingAll: boolean
  onPrintSingle: () => void
  onDownloadZip: () => void
  onDownloadZipByCompany: () => void
}

export function ProtocolListPanel({
  selectedProtocolIds,
  searchFilteredProtocols,
  paginatedProtocolsAll,
  patients,
  selectedProtocolId,
  protocolStats,
  currentTimestamp,
  searchAll,
  onSearchAllChange,
  sortConfig,
  sortOptions,
  onSort,
  onSortConfigChange,
  onSelectAllProtocols,
  onProtocolCardClick,
  protocolPageSize,
  onProtocolPageSizeChange,
  protocolPage,
  totalProtocolPagesAll,
  onProtocolPageChange,
  selectedProtocol,
  onOpenBarcodeModal,
  showPrintDropdown,
  onTogglePrintDropdown,
  onClosePrintDropdown,
  isPrintingAll,
  isZippingAll,
  onPrintSingle,
  onDownloadZip,
  onDownloadZipByCompany,
}: ProtocolListPanelProps) {
  return (
    <div className="lg:col-span-4 lg:order-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 shrink-0 bg-slate-50 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-700">Hasta / Protokol Listesi</h3>
          <div className="flex items-center gap-2">
            {selectedProtocolIds.length > 0 && (
              <span className="text-[10px] text-blue-600 font-medium">{selectedProtocolIds.length} seçili</span>
            )}
            <span className="text-[10px] text-slate-400">{searchFilteredProtocols.length} kayıt</span>
          </div>
        </div>
        {/* Toplu seç butonu */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onSelectAllProtocols}
            className="px-2 py-0.5 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
          >
            {selectedProtocolIds.length > 0 ? 'Seçimi Temizle' : 'Tümünü Seç'}
          </button>
          {selectedProtocolIds.length > 1 && (
            <span className="text-[9px] text-blue-500 font-medium">{selectedProtocolIds.length} protokol seçili</span>
          )}
          <span className="text-[9px] text-slate-400">Shift+Tık aralık · Ctrl+Tık tek tek</span>
        </div>
        {/* Tek arama kutusu */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchAll}
            onChange={(e) => onSearchAllChange(e.target.value)}
            placeholder="Protokol, hasta, TC veya firma ara..."
            className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        {/* Sıralama seçici */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 shrink-0">Sırala:</span>
          <select
            value={sortConfig?.field ?? 'protocolNo'}
            onChange={(e) => onSort(e.target.value as SortField)}
            className="flex-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-700 focus:outline-none focus:border-blue-500"
          >
            {sortOptions.map((opt) => (
              <option key={opt.field} value={opt.field}>
                {opt.label} {sortConfig?.field === opt.field ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (sortConfig) {
                onSortConfigChange({ ...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })
              } else {
                onSortConfigChange({ field: 'protocolNo', direction: 'desc' })
              }
            }}
            className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 hover:bg-slate-50 focus:outline-none"
            title="Sıralama yönü"
          >
            {sortConfig?.direction === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
        {paginatedProtocolsAll.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs text-slate-500">Protokol bulunamadı.</p>
            <p className="text-[10px] text-slate-400 mt-1">Filtreleri veya aramayı değiştirin.</p>
          </div>
        ) : (
          paginatedProtocolsAll.map((p) => (
            <ProtocolCard
              key={p.id}
              protocol={p}
              patient={patients.find((pt) => pt.id === p.patientId)}
              isSelected={p.id === selectedProtocolId}
              isMultiSelected={selectedProtocolIds.includes(p.id) && selectedProtocolIds.length > 1}
              stats={protocolStats.get(p.id) ?? { pending: 0, approved: 0, total: 0 }}
              currentTimestamp={currentTimestamp}
              onClick={(e) => onProtocolCardClick(e, p.id)}
            />
          ))
        )}
      </div>
      <div className="px-3 py-2 border-t border-slate-100 shrink-0 flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span>Sayfa başına</span>
          <select
            value={protocolPageSize}
            onChange={(e) => onProtocolPageSizeChange(Number(e.target.value))}
            className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
          >
            {[10, 25, 50, 100].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {/* Toplu Barkod Yazdır */}
          <button
            onClick={onOpenBarcodeModal}
            disabled={!selectedProtocol && selectedProtocolIds.length === 0}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title={selectedProtocolIds.length > 1 ? `${selectedProtocolIds.length} protokolün barkodlarını test bazında yazdır` : 'Barkodları test bazında yazdır'}
          >
            <Barcode className="w-3 h-3" />
            {selectedProtocolIds.length > 1 ? `Toplu Barkod (${selectedProtocolIds.length})` : 'Toplu Barkod'}
          </button>
          {/* Sonuç Yazdır Dropdown — yukarı açılır */}
          <PrintResultsDropdown
            show={showPrintDropdown}
            onToggle={onTogglePrintDropdown}
            onClose={onClosePrintDropdown}
            isPrintingAll={isPrintingAll}
            isZippingAll={isZippingAll}
            selectedProtocolIds={selectedProtocolIds}
            selectedProtocolId={selectedProtocolId}
            onPrintSingle={onPrintSingle}
            onDownloadZip={onDownloadZip}
            onDownloadZipByCompany={onDownloadZipByCompany}
          />
          <span>
            {(protocolPage - 1) * protocolPageSize + 1}-{Math.min(protocolPage * protocolPageSize, searchFilteredProtocols.length)} / {searchFilteredProtocols.length}
          </span>
        </div>
      </div>
      <Pagination page={protocolPage} totalPages={totalProtocolPagesAll} onPageChange={onProtocolPageChange} />
    </div>
  )
}
