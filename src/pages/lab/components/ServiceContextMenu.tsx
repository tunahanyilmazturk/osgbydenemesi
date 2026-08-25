import { FileText, FlaskConical, StickyNote, Trash2, Upload, X } from 'lucide-react'
import type { ProtocolService } from '@/shared/types'
import { statusDot } from '@/pages/lab/lib/labUtils'
import { isAudiometryServiceName, isEyeExaminationServiceName } from '@/shared/lib/specialServices'

interface ContextMenuState {
  x: number
  y: number
  serviceId: number
}

interface ServiceContextMenuProps {
  menu: ContextMenuState
  services: ProtocolService[]
  onClose: () => void
  onUploadPdf: (serviceId: number) => void
  onViewPdf: (serviceId: number) => void
  onDeletePdf: (serviceId: number, pdfId?: string) => void
  onOpenNote: (serviceId: number) => void
  onOpenRejection: (serviceId: number) => void
  onChangeStatus: (serviceId: number, status: string) => void
  onOpenSpecialModal: (serviceId: number) => void
}

const STATUS_OPTIONS = ['İşlem Bekliyor', 'Numune Kabul', 'Sonuç Bekleniyor', 'Sonuç Girildi', 'Onaylandı']

export function ServiceContextMenu({
  menu,
  services,
  onClose,
  onUploadPdf,
  onViewPdf,
  onDeletePdf,
  onOpenNote,
  onOpenRejection,
  onChangeStatus,
  onOpenSpecialModal,
}: ServiceContextMenuProps) {
  const service = services.find((s) => s.id === menu.serviceId)
  if (!service) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[60]"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose() }}
      />
      <div
        className="fixed z-[61] bg-white rounded-lg shadow-xl border border-slate-200 py-1 w-[200px] text-[11px]"
        style={{ left: menu.x, top: menu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
          <p className="font-semibold text-slate-800 truncate">{service.name}</p>
          <p className="text-[9px] text-slate-500">{service.group} — {service.barcode}</p>
        </div>

        {/* PDF Yükle */}
        <button
          onClick={(e) => { e.stopPropagation(); onUploadPdf(menu.serviceId) }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
        >
          <Upload className="w-3.5 h-3.5" />
          PDF Yükle
        </button>

        {/* PDF Görüntüle */}
        {(service.pdfData || service.pdfId) && (
          <button
            onClick={() => onViewPdf(menu.serviceId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
          >
            <FileText className="w-3.5 h-3.5" />
            PDF Görüntüle
          </button>
        )}

        {/* PDF Sil */}
        {(service.pdfData || service.pdfId) && (
          <button
            onClick={() => onDeletePdf(menu.serviceId, service.pdfId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            PDF Sil
          </button>
        )}

        {/* Not Ekle / Düzenle */}
        <button
          onClick={() => onOpenNote(menu.serviceId)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 transition-colors text-left ${
            service.note
              ? 'text-amber-600 font-medium hover:bg-amber-50'
              : 'text-slate-700 hover:bg-amber-50 hover:text-amber-600'
          }`}
        >
          <StickyNote className="w-3.5 h-3.5" />
          {service.note ? 'Notu Düzenle' : 'Not Ekle'}
        </button>

        {/* Ayraç */}
        <div className="h-px bg-slate-100 my-1" />

        <button
          onClick={() => onOpenRejection(menu.serviceId)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-red-700 hover:bg-red-50 transition-colors text-left"
        >
          <X className="w-3.5 h-3.5" />
          Numune Reddet
        </button>

        {/* Durum değiştir */}
        <div className="px-3 py-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Durum</div>
        {STATUS_OPTIONS.map((st) => (
          <button
            key={st}
            onClick={() => onChangeStatus(menu.serviceId, st)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 whitespace-nowrap transition-colors text-left ${
              service.status === st
                ? 'text-blue-600 font-medium bg-blue-50'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(st)}`} />
            {st}
          </button>
        ))}

        {/* Ayraç */}
        <div className="h-px bg-slate-100 my-1" />

        {/* Odyometri / Göz taraması kısayolları */}
        {isAudiometryServiceName(service.name) && (
          <button
            onClick={() => onOpenSpecialModal(menu.serviceId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-600 transition-colors text-left"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Odyometri Modal
          </button>
        )}
        {isEyeExaminationServiceName(service.name) && (
          <button
            onClick={() => onOpenSpecialModal(menu.serviceId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-cyan-50 hover:text-cyan-600 transition-colors text-left"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Göz Taraması Modal
          </button>
        )}
        {service.name.toLocaleUpperCase('tr-TR').includes('EK-2') && (
          <button
            onClick={() => onOpenSpecialModal(menu.serviceId)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-left"
          >
            <FileText className="w-3.5 h-3.5" />
            EK-2 Formunu Aç
          </button>
        )}
      </div>
    </>
  )
}
