import { Building2, FileText, Printer } from 'lucide-react'

interface PrintResultsDropdownProps {
  show: boolean
  onToggle: () => void
  onClose: () => void
  isPrintingAll: boolean
  isZippingAll: boolean
  selectedProtocolIds: number[]
  selectedProtocolId: number | null
  onPrintSingle: () => void
  onDownloadZip: () => void
  onDownloadZipByCompany: () => void
}

export function PrintResultsDropdown({
  show,
  onToggle,
  onClose,
  isPrintingAll,
  isZippingAll,
  selectedProtocolIds,
  selectedProtocolId,
  onPrintSingle,
  onDownloadZip,
  onDownloadZipByCompany,
}: PrintResultsDropdownProps) {
  const multiCount = selectedProtocolIds.length
  const isMulti = multiCount > 1
  const disabled = isPrintingAll || isZippingAll || (multiCount === 0 && !selectedProtocolId)

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        disabled={disabled}
        className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Seçili protokollerin onaylı sonuç raporlarını yazdır veya indir"
      >
        <Printer className="w-3 h-3" />
        {isPrintingAll ? 'PDF Hazırlanıyor...' : isZippingAll ? 'ZIP Hazırlanıyor...' : 'Sonuç Yazdır'}
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="absolute bottom-full right-0 mb-1 z-50 w-64 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
              <span className="text-[10px] font-bold text-slate-700">Sonuç Yazdır / İndir</span>
            </div>
            <div className="p-1.5 space-y-1">
              {/* Tek PDF olarak aç */}
              <button
                onClick={onPrintSingle}
                disabled={isPrintingAll || isZippingAll}
                className="w-full text-left px-2.5 py-2 text-[10px] text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors disabled:opacity-40"
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <Printer className="w-3 h-3" />
                  {isMulti ? `Tek PDF (${multiCount} protokol)` : 'Tek PDF olarak aç'}
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">Tüm raporları tek PDF'de birleştirip yeni sekmede aç</p>
              </button>
              {/* ZIP — her rapor ayrı PDF */}
              <button
                onClick={onDownloadZip}
                disabled={isPrintingAll || isZippingAll}
                className="w-full text-left px-2.5 py-2 text-[10px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors disabled:opacity-40"
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <FileText className="w-3 h-3" />
                  {isMulti ? `ZIP indir (${multiCount} protokol)` : 'ZIP olarak indir'}
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">Her raporu ayrı PDF olarak ZIP dosyasında indir</p>
              </button>
              {/* ZIP — firma bazlı klasörler, hasta bazlı tek PDF */}
              <button
                onClick={onDownloadZipByCompany}
                disabled={isPrintingAll || isZippingAll}
                className="w-full text-left px-2.5 py-2 text-[10px] text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-lg transition-colors disabled:opacity-40"
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3 h-3" />
                  {isMulti ? `Firma bazlı ZIP (${multiCount} protokol)` : 'Firma bazlı ZIP indir'}
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">Firma klasörleri altında, her hastanın tüm testleri tek PDF'de birleşik</p>
              </button>
              <div className="border-t border-slate-100 my-1" />
              <p className="px-2.5 text-[9px] text-slate-400 leading-relaxed">
                Önce protokol kartlarına Ctrl+Tık ile çoklu seçim yapın, sonra buradan yazdırın.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
