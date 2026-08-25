import { useEffect, useState } from 'react'
import { nowLocalDateTime } from '@/shared/lib/date'
import type { ProtocolService } from '@/shared/types'

type ShowToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void
type UpdateServiceInProtocol = (protocolId: number, serviceId: number, updates: Partial<ProtocolService>) => void

interface CurrentUserLike {
  displayName?: string
}

interface UseLabNoteHandlersParams {
  selectedProtocolId: number | null
  selectedServices: ProtocolService[]
  selectedServiceIds: number[]
  currentUser: CurrentUserLike | null | undefined
  updateServiceInProtocol: UpdateServiceInProtocol
  showToast: ShowToast
  setContextMenu: (menu: null) => void
  setSelectedServiceIds: (ids: number[]) => void
}

export function useLabNoteHandlers({
  selectedProtocolId,
  selectedServices,
  selectedServiceIds,
  currentUser,
  updateServiceInProtocol,
  showToast,
  setContextMenu,
  setSelectedServiceIds,
}: UseLabNoteHandlersParams) {
  const [noteModal, setNoteModal] = useState<{ serviceId: number; serviceName: string; note: string } | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [rejectionModal, setRejectionModal] = useState<{ serviceId: number; serviceName: string } | null>(null)
  const [rejectionDraft, setRejectionDraft] = useState('')

  // Not şablonları — localStorage'da saklanır
  const [noteTemplates, setNoteTemplates] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('cetka-note-templates')
      return stored ? JSON.parse(stored) : [
        'Hasta teste gelmedi, randevu yenilenecek.',
        'Numune alınamadı, hasta uygun değil.',
        'Dış laboratuvara gönderildi, sonuç bekleniyor.',
        'Hastadan numune alındı, işleme alındı.',
        'Sonuç bekleniyor, dış lab henüz göndermedi.',
        'Hasta reddetti, işlem yapılmadı.',
      ]
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('cetka-note-templates', JSON.stringify(noteTemplates))
  }, [noteTemplates])

  const [newTemplateName, setNewTemplateName] = useState('')
  const [showTemplateForm, setShowTemplateForm] = useState(false)

  const addTemplate = () => {
    const trimmed = newTemplateName.trim()
    if (!trimmed) return
    if (noteTemplates.includes(trimmed)) {
      showToast('error', 'Zaten var', 'Bu şablon zaten mevcut.')
      return
    }
    setNoteTemplates([...noteTemplates, trimmed])
    setNewTemplateName('')
    setShowTemplateForm(false)
    showToast('success', 'Şablon eklendi', 'Yeni not şablonu kaydedildi.')
  }

  const removeTemplate = (tpl: string) => {
    setNoteTemplates(noteTemplates.filter((t) => t !== tpl))
  }

  const openNoteModal = (serviceId: number) => {
    const service = selectedServices.find((s) => s.id === serviceId)
    setNoteDraft(service?.note ?? '')
    setNoteModal({ serviceId, serviceName: service?.name ?? '', note: service?.note ?? '' })
  }

  const openRejectionModal = (serviceId: number) => {
    const service = selectedServices.find((item) => item.id === serviceId)
    setRejectionDraft('')
    setRejectionModal({ serviceId, serviceName: service?.name ?? '' })
  }

  const handleRejectSample = () => {
    if (!selectedProtocolId || !rejectionModal || !rejectionDraft.trim()) return
    updateServiceInProtocol(selectedProtocolId, rejectionModal.serviceId, {
      status: 'Numune Red',
      rejectionReason: rejectionDraft.trim(),
      rejectedBy: currentUser?.displayName ?? 'Sistem',
      rejectedAt: nowLocalDateTime(),
    })
    showToast('warning', 'Numune reddedildi', `${rejectionModal.serviceName} N.Red nedenlerine eklendi.`)
    setRejectionModal(null)
    setRejectionDraft('')
    setContextMenu(null)
    setSelectedServiceIds([])
  }

  const handleSaveNote = () => {
    if (!selectedProtocolId || !noteModal) return
    const noteValue = noteDraft.trim() || undefined
    // Toplu not — serviceName "N test" formatındaysa tüm seçili testlere uygula
    if (/^\d+ test$/.test(noteModal.serviceName) && selectedServiceIds.length > 0) {
      selectedServiceIds.forEach((sid) => {
        updateServiceInProtocol(selectedProtocolId, sid, { note: noteValue })
      })
      showToast('success', 'Toplu not kaydedildi', `${selectedServiceIds.length} teste not eklendi.`)
    } else {
      updateServiceInProtocol(selectedProtocolId, noteModal.serviceId, {
        note: noteValue,
      })
      showToast('success', 'Not kaydedildi', noteModal.serviceName)
    }
    setNoteModal(null)
    setNoteDraft('')
  }

  return {
    noteModal,
    setNoteModal,
    noteDraft,
    setNoteDraft,
    rejectionModal,
    setRejectionModal,
    rejectionDraft,
    setRejectionDraft,
    noteTemplates,
    setNoteTemplates,
    newTemplateName,
    setNewTemplateName,
    showTemplateForm,
    setShowTemplateForm,
    addTemplate,
    removeTemplate,
    openNoteModal,
    openRejectionModal,
    handleRejectSample,
    handleSaveNote,
  }
}
