import { useRef, useState } from 'react'
import { nowLocalDateTime } from '@/shared/lib/date'
import { saveSharedPdf, getSharedPdf, incrementPdfRef } from '@/shared/lib/storage'
import type { ProtocolService } from '@/shared/types'

type ShowToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void
type UpdateServiceInProtocol = (protocolId: number, serviceId: number, updates: Partial<ProtocolService>) => void

interface CurrentUserLike {
  displayName?: string
}

interface UseLabPdfHandlersParams {
  selectedProtocolId: number | null
  selectedServices: ProtocolService[]
  selectedServiceIds: number[]
  currentUser: CurrentUserLike | null | undefined
  updateServiceInProtocol: UpdateServiceInProtocol
  showToast: ShowToast
  setContextMenu: (menu: null) => void
}

function base64ToBlob(dataUrl: string) {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'application/pdf'
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export function useLabPdfHandlers({
  selectedProtocolId,
  selectedServices,
  selectedServiceIds,
  currentUser,
  updateServiceInProtocol,
  showToast,
  setContextMenu,
}: UseLabPdfHandlersParams) {
  const pdfUploadRef = useRef<HTMLInputElement>(null)
  const bulkPdfUploadRef = useRef<HTMLInputElement>(null)
  const [contextServiceId, setContextServiceId] = useState<number | null>(null)

  const openPdfViewer = (serviceId: number) => {
    const service = selectedServices.find((s) => s.id === serviceId)
    if (!service) return
    let pdfData = service.pdfData
    if (service.pdfId) {
      const shared = getSharedPdf(service.pdfId)
      if (shared) {
        pdfData = shared.data
      } else {
        return
      }
    }
    if (!pdfData) return
    const blob = base64ToBlob(pdfData)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  const handleContextMenuPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProtocolId || contextServiceId === null) return
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Dosya çok büyük', 'PDF dosyası 5MB\'dan küçük olmalıdır.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const service = selectedServices.find((s) => s.id === contextServiceId)
      const updates: Partial<ProtocolService> = {
        pdfData: base64,
        pdfName: file.name,
      }
      if (service && service.status !== 'Onaylandı') {
        updates.status = 'Onaylandı'
        updates.approvedBy = currentUser?.displayName ?? 'Sistem'
        updates.approvedAt = nowLocalDateTime()
      }
      updateServiceInProtocol(selectedProtocolId, contextServiceId, updates)
      showToast('success', 'PDF yüklendi ve onaylandı', `"${file.name}" yüklendi, test durumu "Onaylandı" olarak işaretlendi.`)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
    setContextMenu(null)
  }

  const handleBulkPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProtocolId || selectedServiceIds.length === 0) return
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Dosya çok büyük', 'PDF dosyası 5MB\'dan küçük olmalıdır.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const pdfId = saveSharedPdf(base64, file.name)
      incrementPdfRef(pdfId, selectedServiceIds.length)
      const now = nowLocalDateTime()
      const approver = currentUser?.displayName ?? 'Sistem'
      selectedServiceIds.forEach((sid) => {
        const service = selectedServices.find((s) => s.id === sid)
        if (service?.pdfId) incrementPdfRef(service.pdfId, -1)
        const updates: Partial<ProtocolService> = {
          pdfId,
          pdfName: file.name,
          pdfData: undefined,
        }
        if (service && service.status !== 'Onaylandı') {
          updates.status = 'Onaylandı'
          updates.approvedBy = approver
          updates.approvedAt = now
        }
        updateServiceInProtocol(selectedProtocolId, sid, updates)
      })
      showToast('success', 'PDF toplu yüklendi', `"${file.name}" ${selectedServiceIds.length} teste bağlandı (tek PDF) ve onaylandı.`)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return {
    pdfUploadRef,
    bulkPdfUploadRef,
    contextServiceId,
    setContextServiceId,
    openPdfViewer,
    handleContextMenuPdfUpload,
    handleBulkPdfUpload,
  }
}
