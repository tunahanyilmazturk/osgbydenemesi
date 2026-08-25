import { incrementPdfRef } from '@/shared/lib/storage'
import { nowLocalDateTime } from '@/shared/lib/date'
import type { Protocol, ProtocolService } from '@/shared/types'
import { ServiceContextMenu } from '@/pages/lab/components/ServiceContextMenu'
import type { ContextMenuState } from '@/pages/lab/hooks/useLabContextMenu'

type ShowToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void
type UpdateServiceInProtocol = (protocolId: number, serviceId: number, updates: Partial<ProtocolService>) => void

interface AppUserLike {
  displayName?: string
}

interface LabServiceContextMenuProps {
  contextMenu: ContextMenuState | null
  services: ProtocolService[]
  selectedProtocol: Protocol | null
  currentUser: AppUserLike | null | undefined
  pdfUploadRef: React.RefObject<HTMLInputElement | null>
  setContextMenu: (menu: ContextMenuState | null) => void
  setContextServiceId: (id: number) => void
  openPdfViewer: (serviceId: number) => void
  openNoteModal: (serviceId: number) => void
  openRejectionModal: (serviceId: number) => void
  handleRowDoubleClick: (serviceId: number) => void
  updateServiceInProtocol: UpdateServiceInProtocol
  showToast: ShowToast
}

export function LabServiceContextMenu({
  contextMenu,
  services,
  selectedProtocol,
  currentUser,
  pdfUploadRef,
  setContextMenu,
  setContextServiceId,
  openPdfViewer,
  openNoteModal,
  openRejectionModal,
  handleRowDoubleClick,
  updateServiceInProtocol,
  showToast,
}: LabServiceContextMenuProps) {
  if (!contextMenu) return null

  return (
    <ServiceContextMenu
      menu={contextMenu}
      services={services}
      onClose={() => setContextMenu(null)}
      onUploadPdf={(serviceId) => {
        setContextServiceId(serviceId)
        setContextMenu(null)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            pdfUploadRef.current?.click()
          })
        })
      }}
      onViewPdf={(serviceId) => { openPdfViewer(serviceId); setContextMenu(null) }}
      onDeletePdf={(serviceId, pdfId) => {
        if (selectedProtocol) {
          if (pdfId) incrementPdfRef(pdfId, -1)
          updateServiceInProtocol(selectedProtocol.id, serviceId, { pdfData: undefined, pdfName: undefined, pdfId: undefined })
          showToast('info', 'PDF silindi', 'Yüklenen PDF sonuç kaldırıldı.')
        }
        setContextMenu(null)
      }}
      onOpenNote={(serviceId) => { openNoteModal(serviceId); setContextMenu(null) }}
      onOpenRejection={(serviceId) => { openRejectionModal(serviceId); setContextMenu(null) }}
      onChangeStatus={(serviceId, st) => {
        if (selectedProtocol) {
          const service = services.find((s) => s.id === serviceId)
          const updates: Partial<ProtocolService> = { status: st }
          if (st === 'Onaylandı') {
            updates.approvedBy = currentUser?.displayName ?? 'Sistem'
            updates.approvedAt = nowLocalDateTime()
          } else if (service?.status === 'Onaylandı') {
            updates.approvedBy = undefined
            updates.approvedAt = undefined
          }
          updateServiceInProtocol(selectedProtocol.id, serviceId, updates)
          showToast('success', 'Durum güncellendi', `${service?.name}: ${st}`)
        }
        setContextMenu(null)
      }}
      onOpenSpecialModal={(serviceId) => { handleRowDoubleClick(serviceId); setContextMenu(null) }}
    />
  )
}
