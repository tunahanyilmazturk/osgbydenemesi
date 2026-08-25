import type { MouseEvent } from 'react'
import { ArrowDown, ArrowUp, Banknote, ClipboardList, FileText, FlaskConical, StickyNote } from 'lucide-react'
import { Pagination } from '@/shared/components/ui/Pagination'
import { VezneTransactions } from '@/features/cashier/components/VezneTransactions'
import type { Protocol, ProtocolService, ServiceCatalogItem, ServiceGroup, ServiceTubeType } from '@/shared/types'
import { isAudiometryServiceName, isEyeExaminationServiceName } from '@/shared/lib/specialServices'
import {
  formatDateTime,
  getMeta,
  calculateHL,
  getLabName,
  statusColor,
  statusDot,
  initialResult,
} from '@/pages/lab/lib/labUtils'

interface VezneSummary {
  total: number
  paid: number
  discount: number
  remaining: number
}

interface ResultsTableProps {
  resultsTab: 'results' | 'vezne'
  onResultsTabChange: (tab: 'results' | 'vezne') => void
  selectedServices: ProtocolService[]
  paginatedServices: ProtocolService[]
  servicePage: number
  totalServicePages: number
  onServicePageChange: (page: number) => void
  servicePageSize: number
  onServicePageSizeChange: (size: number) => void
  selectedServiceIds: number[]
  selectedProtocol: Protocol | null
  vezneSummary: VezneSummary
  catalog: ServiceCatalogItem[]
  groups: ServiceGroup[]
  tubeTypes: ServiceTubeType[]
  onRowClick: (e: MouseEvent<HTMLTableRowElement>, id: number) => void
  onRowDoubleClick: (id: number) => void
  onContextMenu: (e: MouseEvent<HTMLTableRowElement>, serviceId: number) => void
  onResultChange: (serviceId: number, value: string) => void
  onOpenPdfViewer: (serviceId: number) => void
  onOpenNoteModal: (serviceId: number) => void
  resolveTubeTypeName: (service: ProtocolService, catalog: ServiceCatalogItem[], groups: ServiceGroup[], tubeTypes: ServiceTubeType[]) => string
}

export function ResultsTable({
  resultsTab,
  onResultsTabChange,
  selectedServices,
  paginatedServices,
  servicePage,
  totalServicePages,
  onServicePageChange,
  servicePageSize,
  onServicePageSizeChange,
  selectedServiceIds,
  selectedProtocol,
  vezneSummary,
  catalog,
  groups,
  tubeTypes,
  onRowClick,
  onRowDoubleClick,
  onContextMenu,
  onResultChange,
  onOpenPdfViewer,
  onOpenNoteModal,
  resolveTubeTypeName,
}: ResultsTableProps) {
  return (
    <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Sekme başlığı */}
      <div className="px-3 pt-2 bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onResultsTabChange('results')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg whitespace-nowrap transition-all ${
              resultsTab === 'results'
                ? 'text-blue-600 bg-white border-x border-t border-slate-200 -mb-px'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Tetkik Sonuçları
            <span className="px-1.5 py-0 text-[9px] font-bold bg-blue-100 text-blue-600 rounded">
              {selectedServices.length}
            </span>
          </button>
          <button
            onClick={() => onResultsTabChange('vezne')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg whitespace-nowrap transition-all ${
              resultsTab === 'vezne'
                ? 'text-emerald-600 bg-white border-x border-t border-slate-200 -mb-px'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            Vezne
            {vezneSummary.remaining > 0 ? (
              <span className="px-1.5 py-0 text-[9px] font-bold bg-red-100 text-red-600 rounded">
                ₺{vezneSummary.remaining.toFixed(0)}
              </span>
            ) : (
              <span className="px-1.5 py-0 text-[9px] font-bold bg-emerald-100 text-emerald-600 rounded">
                ✓
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tetkik Sonuçları sekmesi */}
      {resultsTab === 'results' && (
        <>
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500">{selectedServices.length} hizmet</span>
            <select
              value={servicePageSize}
              onChange={(e) => onServicePageSizeChange(Number(e.target.value))}
              className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {[10, 25, 50, 100].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {paginatedServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FlaskConical className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">Bu protokolde henüz hizmet bulunmuyor.</p>
              </div>
            ) : (
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Durum</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Barkod No</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Hizmet</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Sonuç</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Referans</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Eski Sonuç</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Lab</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">İstem Tarihi</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Kabul Tarihi</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Onaylayan</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Onay Tarihi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedServices.map((service) => {
                    const meta = getMeta(service, catalog)
                    const isSelected = selectedServiceIds.includes(service.id)
                    const resultValue = service.result ?? initialResult(service.status, meta)
                    const hl = calculateHL(resultValue, meta.range)
                    const isEk2 = service.name.toLocaleUpperCase('tr-TR').includes('EK-2')
                    const opensSpecialModal = isAudiometryServiceName(service.name) || isEyeExaminationServiceName(service.name)
                    return (
                      <tr
                        key={service.id}
                        onClick={(e) => onRowClick(e, service.id)}
                        onDoubleClick={() => onRowDoubleClick(service.id)}
                        onContextMenu={(e) => onContextMenu(e, service.id)}
                        className={`cursor-pointer transition-colors select-none ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-2 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${statusColor(service.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(service.status)}`} />
                            {service.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 font-mono text-slate-700">{service.barcode}</td>
                        <td className="px-2 py-2 text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[200px]" title={service.name}>
                                {service.name}
                              </p>
                              <p className="text-[10px] text-slate-500">{service.group}</p>
                              <p className="text-[10px] text-blue-600 truncate" title={`Tüp: ${resolveTubeTypeName(service, catalog, groups, tubeTypes)}`}>
                                Tüp: {resolveTubeTypeName(service, catalog, groups, tubeTypes)}
                              </p>
                            </div>
                            {(service.pdfData || service.pdfId) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onOpenPdfViewer(service.id) }}
                                className="shrink-0 p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title={`PDF Görüntüle: ${service.pdfName ?? ''}`}
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {service.note && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onOpenNoteModal(service.id) }}
                                className="shrink-0 p-1 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                title={`Not: ${service.note}`}
                              >
                                <StickyNote className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          {isEk2 ? (
                            <button
                              type="button"
                              onClick={(event) => { event.stopPropagation(); onRowDoubleClick(service.id) }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              <ClipboardList className="h-3.5 w-3.5" />
                              {service.ek2Data ? service.result ?? 'Formu Aç' : 'Formu Doldur'}
                            </button>
                          ) : <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={resultValue}
                              onChange={(e) => onResultChange(service.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => {
                                if (!opensSpecialModal) return
                                e.preventDefault()
                                e.stopPropagation()
                                onRowDoubleClick(service.id)
                              }}
                              className={`w-28 px-1.5 py-1 bg-white border rounded text-[11px] text-slate-800 focus:outline-none focus:border-blue-500 ${
                                hl === 'Yüksek' ? 'border-red-300' : hl === 'Düşük' ? 'border-amber-300' : 'border-slate-200'
                              }`}
                              placeholder="-"
                            />
                            {hl === 'Yüksek' && (
                              <span className="flex items-center text-red-600 font-bold" title="Yüksek">
                                <ArrowUp className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {hl === 'Düşük' && (
                              <span className="flex items-center text-amber-600 font-bold" title="Düşük">
                                <ArrowDown className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>}
                        </td>
                        <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                          {meta.range && <span>{meta.range}</span>}
                          {meta.unit && <span className="text-slate-400 ml-1">{meta.unit}</span>}
                          {!meta.range && !meta.unit && <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-2 py-2 text-slate-600">{service.oldResult || '-'}</td>
                        <td className="px-2 py-2 text-slate-600">{service.lab || getLabName(service.group)}</td>
                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{formatDateTime(service.processDate)}</td>
                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{formatDateTime(service.acceptDate)}</td>
                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{service.approvedBy || '-'}</td>
                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{formatDateTime(service.approvedAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          <Pagination page={servicePage} totalPages={totalServicePages} onPageChange={onServicePageChange} />
          <div className="px-3 py-2 border-t border-slate-100 text-[10px] text-slate-400 text-center shrink-0">
            {(servicePage - 1) * servicePageSize + 1}-{Math.min(servicePage * servicePageSize, selectedServices.length)} / {selectedServices.length}
          </div>
        </>
      )}

      {/* Vezne sekmesi */}
      {resultsTab === 'vezne' && selectedProtocol && (
        <div className="flex-1 min-h-0 overflow-auto p-3">
          <VezneTransactions protocol={selectedProtocol} />
        </div>
      )}
    </div>
  )
}
