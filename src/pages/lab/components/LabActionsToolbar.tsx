import type { RefObject } from 'react'
import { Barcode, Check, CheckCircle2, ChevronDown, Mail, MoreHorizontal, Printer, StickyNote, Upload, X } from 'lucide-react'
import type { Protocol } from '@/shared/types'

interface LabActionsToolbarProps {
  selectedServiceIds: number[]
  hasSelection: boolean
  selectedProtocolIds: number[]
  selectedProtocol: Protocol | null
  showMoreActions: boolean
  onToggleMoreActions: () => void
  onCloseMoreActions: () => void
  onSelectAllServices: () => void
  onPrintSelectedBarcodes: () => void
  onPrintAllBarcodesForProtocol: () => void
  onAccept: () => void
  onCancelAccept: () => void
  onApprove: () => void
  onCancelApprove: () => void
  bulkPdfUploadRef: RefObject<HTMLInputElement | null>
  onBulkNote: () => void
  onSendMail: () => void
}

export function LabActionsToolbar({
  selectedServiceIds,
  hasSelection,
  selectedProtocolIds,
  selectedProtocol,
  showMoreActions,
  onToggleMoreActions,
  onCloseMoreActions,
  onSelectAllServices,
  onPrintSelectedBarcodes,
  onPrintAllBarcodesForProtocol,
  onAccept,
  onCancelAccept,
  onApprove,
  onCancelApprove,
  bulkPdfUploadRef,
  onBulkNote,
  onSendMail,
}: LabActionsToolbarProps) {
  const multiCount = selectedProtocolIds.length
  const isMulti = multiCount > 1

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={onSelectAllServices}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Barcode className="w-3.5 h-3.5" />
        {selectedServiceIds.length > 0 ? 'Seçimi Temizle' : 'T.Seç'}
      </button>
      <button
        onClick={onPrintSelectedBarcodes}
        disabled={!hasSelection}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Printer className="w-3.5 h-3.5" />
        B.Yazdır
      </button>
      <button
        onClick={onPrintAllBarcodesForProtocol}
        disabled={!selectedProtocol}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Seçili protokoldeki tüm barkodları yazdır"
      >
        <Barcode className="w-3.5 h-3.5" />
        T. Barkod
      </button>
      <button
        onClick={onAccept}
        disabled={!hasSelection}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        title={isMulti ? `${multiCount} protokolün tüm hizmetleri kabul edilecek` : undefined}
      >
        <Check className="w-3.5 h-3.5" />
        {isMulti ? `Toplu Kabul (${multiCount})` : 'Kabul'}
      </button>
      <button
        onClick={onCancelAccept}
        disabled={!hasSelection}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
        title={isMulti ? `${multiCount} protokolün kabulü iptal edilecek` : undefined}
      >
        <X className="w-3.5 h-3.5" />
        K.İptal
      </button>
      <button
        onClick={onApprove}
        disabled={!hasSelection}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
        title={isMulti ? `${multiCount} protokolün tüm hizmetleri onaylanacak` : undefined}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {isMulti ? `Toplu Onay (${multiCount})` : 'Onayla'}
      </button>
      <button
        onClick={onCancelApprove}
        disabled={!hasSelection}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
        title={isMulti ? `${multiCount} protokolün onayı kaldırılacak` : undefined}
      >
        <X className="w-3.5 h-3.5" />
        O.Kaldır
      </button>
      {/* Diğer İşlemler — dropdown */}
      <div className="relative">
        <button
          onClick={onToggleMoreActions}
          disabled={!hasSelection}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
          Diğer
          <ChevronDown className="w-3 h-3" />
        </button>
        {showMoreActions && hasSelection && (
          <>
            <div className="fixed inset-0 z-40" onClick={onCloseMoreActions} />
            <div className="absolute top-full right-0 mt-1 z-50 w-56 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                <span className="text-[10px] font-bold text-slate-700">
                  {selectedServiceIds.length > 0 ? `${selectedServiceIds.length} test seçili` : 'İşlemler'}
                </span>
              </div>
              <div className="p-1.5 space-y-0.5">
                {/* PDF Yükle */}
                {selectedServiceIds.length > 0 && (
                  <button
                    onClick={() => { bulkPdfUploadRef.current?.click(); onCloseMoreActions() }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] text-slate-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors text-left"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <div>
                      <p className="font-medium">PDF Yükle</p>
                      <p className="text-[9px] text-slate-400">Seçili {selectedServiceIds.length} teste tek PDF bağla</p>
                    </div>
                  </button>
                )}
                {/* Toplu Not Ekle */}
                {selectedServiceIds.length > 0 && (
                  <button
                    onClick={onBulkNote}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors text-left"
                  >
                    <StickyNote className="w-3.5 h-3.5" />
                    <div>
                      <p className="font-medium">Toplu Not Ekle</p>
                      <p className="text-[9px] text-slate-400">Seçili {selectedServiceIds.length} teste aynı notu ekle</p>
                    </div>
                  </button>
                )}
                {/* Mail Gönder */}
                <button
                  onClick={onSendMail}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors text-left"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <div>
                    <p className="font-medium">Mail Gönder</p>
                    <p className="text-[9px] text-slate-400">Hastaya sonuç e-postası gönder</p>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
