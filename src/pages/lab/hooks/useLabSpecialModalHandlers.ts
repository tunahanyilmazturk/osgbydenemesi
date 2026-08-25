import { openAudiometryPdf } from '@/features/examinations/audiometry/lib/audiometryReport'
import { openEyeExaminationPdf } from '@/features/examinations/eye-examination/lib/eyeExaminationReport'
import { openTetanusVaccinationPdf } from '@/features/vaccinations/tetanus/lib/tetanusVaccinationReport'
import { nowLocalDateTime } from '@/shared/lib/date'
import { isAudiometryServiceName, isEyeExaminationServiceName } from '@/shared/lib/specialServices'
import type { AudiometryData, EyeExaminationData, PatientDetail, Protocol, ProtocolService, TetanusVaccinationData } from '@/shared/types'

type ShowToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void
type UpdateServiceInProtocol = (protocolId: number, serviceId: number, updates: Partial<ProtocolService>) => void

interface AppUserLike {
  displayName?: string
  stamp?: string
}

interface UseLabSpecialModalHandlersParams {
  selectedProtocol: Protocol | null
  selectedPatient: PatientDetail | null | undefined
  selectedServices: ProtocolService[]
  selectedAudiometryService: ProtocolService | null
  selectedEyeExaminationService: ProtocolService | null
  selectedTetanusService: ProtocolService | null
  users: AppUserLike[]
  currentUser: AppUserLike | null | undefined
  updateServiceInProtocol: UpdateServiceInProtocol
  showToast: ShowToast
  openPdfViewer: (serviceId: number) => void
  selectedServiceIds: number[]
  setSelectedServiceIds: React.Dispatch<React.SetStateAction<number[]>>
  setSelectedAudiometryService: (service: ProtocolService | null) => void
  setIsAudiometryModalOpen: (open: boolean) => void
  setSelectedEyeExaminationService: (service: ProtocolService | null) => void
  setIsEyeExaminationModalOpen: (open: boolean) => void
  setSelectedTetanusService: (service: ProtocolService | null) => void
  setIsTetanusModalOpen: (open: boolean) => void
}

export function useLabSpecialModalHandlers({
  selectedProtocol,
  selectedPatient,
  selectedServices,
  selectedAudiometryService,
  selectedEyeExaminationService,
  selectedTetanusService,
  users,
  currentUser,
  updateServiceInProtocol,
  showToast,
  openPdfViewer,
  selectedServiceIds,
  setSelectedServiceIds,
  setSelectedAudiometryService,
  setIsAudiometryModalOpen,
  setSelectedEyeExaminationService,
  setIsEyeExaminationModalOpen,
  setSelectedTetanusService,
  setIsTetanusModalOpen,
}: UseLabSpecialModalHandlersParams) {
  const handleRowDoubleClick = (id: number) => {
    const service = selectedServices.find((s) => s.id === id)
    if (!service || !selectedProtocol || !selectedPatient) return

    // PDF varsa çift tıklayınca yeni sekmede aç
    if (service.pdfData || service.pdfId) {
      openPdfViewer(id)
      return
    }

    const normalizedName = service.name.toLocaleLowerCase('tr-TR')
    const isTetanusService = normalizedName.includes('tetanoz') || normalizedName.includes('tetanos')

    if (isTetanusService) {
      if (service.status === 'Onaylandı' && service.tetanusVaccinationData) {
        try {
          const data = JSON.parse(service.tetanusVaccinationData) as TetanusVaccinationData
          void openTetanusVaccinationPdf({
            patient: selectedPatient,
            protocol: selectedProtocol,
            service,
            data,
            recordedBy: service.recordedBy,
            approvedBy: service.approvedBy,
            approvedAt: service.approvedAt,
            approvedByStamp: service.approvedBy
              ? users.find((user) => user.displayName === service.approvedBy)?.stamp
              : undefined,
          }).catch((error) => {
            console.error('Tetanoz PDF raporu açılamadı:', error)
            showToast('error', 'Tetanoz belgesi açılamadı', error instanceof Error ? error.message : 'Bilinmeyen hata')
          })
      } catch {
        showToast('warning', 'Aşı kaydı okunamadı', 'Uygulama bilgilerini kontrol edip yeniden kaydedin.')
        setSelectedTetanusService(service)
        setIsTetanusModalOpen(true)
      }
      } else {
        if (service.status === 'Onaylandı') {
          showToast('warning', 'Aşı uygulama bilgisi eksik', 'PDF oluşturmak için aşı uygulama kaydını doldurun.')
        }
        setSelectedTetanusService(service)
        setIsTetanusModalOpen(true)
      }
    } else if (isAudiometryServiceName(service.name)) {
      if (service.status === 'Onaylandı' && service.audiometryData) {
        try {
          const data = JSON.parse(service.audiometryData) as AudiometryData
          void openAudiometryPdf({
            patient: selectedPatient,
            protocol: selectedProtocol,
            service,
            data,
            recordedBy: service.recordedBy,
            recordedByStamp: service.recordedBy
              ? users.find((u) => u.displayName === service.recordedBy)?.stamp
              : undefined,
            approvedBy: service.approvedBy,
            approvedAt: service.approvedAt,
            approvedByStamp: service.approvedBy
              ? users.find((u) => u.displayName === service.approvedBy)?.stamp
              : undefined,
          }).catch((error) => {
            // eslint-disable-next-line no-console
            console.error('PDF raporu açılamadı:', error)
            showToast('error', 'PDF raporu açılamadı', error instanceof Error ? error.message : 'Bilinmeyen hata')
            setSelectedAudiometryService(service)
            setIsAudiometryModalOpen(true)
          })
        } catch {
          // parse hatası durumunda modalı aç
          setSelectedAudiometryService(service)
          setIsAudiometryModalOpen(true)
        }
      } else {
        setSelectedAudiometryService(service)
        setIsAudiometryModalOpen(true)
      }
    } else if (isEyeExaminationServiceName(service.name)) {
      if (service.status === 'Onaylandı' && service.eyeExaminationData) {
        try {
          const data = JSON.parse(service.eyeExaminationData) as EyeExaminationData
          void openEyeExaminationPdf({
            patient: selectedPatient,
            protocol: selectedProtocol,
            service,
            data,
            recordedBy: service.recordedBy,
            approvedBy: service.approvedBy,
            approvedAt: service.approvedAt,
            approvedByStamp: service.approvedBy
              ? users.find((u) => u.displayName === service.approvedBy)?.stamp
              : undefined,
          }).catch((error) => {
            // eslint-disable-next-line no-console
            console.error('PDF raporu açılamadı:', error)
            showToast('error', 'PDF raporu açılamadı', error instanceof Error ? error.message : 'Bilinmeyen hata')
            setSelectedEyeExaminationService(service)
            setIsEyeExaminationModalOpen(true)
          })
        } catch {
          setSelectedEyeExaminationService(service)
          setIsEyeExaminationModalOpen(true)
        }
      } else {
        setSelectedEyeExaminationService(service)
        setIsEyeExaminationModalOpen(true)
      }
    }
  }

  const handleAudiometrySave = (data: string, resultText: string, approve?: boolean) => {
    if (!selectedProtocol || !selectedAudiometryService) return
    const serviceId = selectedAudiometryService.id
    updateServiceInProtocol(selectedProtocol.id, serviceId, {
      audiometryData: data,
      resultText,
      result: 'Tamamlandı',
      status: approve ? 'Onaylandı' : 'Sonuç Girildi',
      approvedBy: approve ? currentUser?.displayName : undefined,
      approvedAt: approve ? nowLocalDateTime() : undefined,
    })
    if (approve && !selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds((prev) => [...prev, serviceId])
    }
    setIsAudiometryModalOpen(false)
    setSelectedAudiometryService(null)
  }

  const handleEyeExaminationSave = (data: string, resultText: string, approve?: boolean) => {
    if (!selectedProtocol || !selectedEyeExaminationService) return
    const serviceId = selectedEyeExaminationService.id
    updateServiceInProtocol(selectedProtocol.id, serviceId, {
      eyeExaminationData: data,
      resultText,
      result: 'Tamamlandı',
      status: approve ? 'Onaylandı' : 'Sonuç Girildi',
      approvedBy: approve ? currentUser?.displayName : undefined,
      approvedAt: approve ? nowLocalDateTime() : undefined,
    })
    if (approve && !selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds((prev) => [...prev, serviceId])
    }
    setIsEyeExaminationModalOpen(false)
    setSelectedEyeExaminationService(null)
  }

  const handleTetanusSave = (data: string, resultText: string) => {
    if (!selectedProtocol || !selectedTetanusService) return
    updateServiceInProtocol(selectedProtocol.id, selectedTetanusService.id, {
      tetanusVaccinationData: data,
      resultText,
      result: 'Uygulandı',
      status: 'Sonuç Girildi',
      recordedBy: currentUser?.displayName ?? selectedTetanusService.recordedBy,
      processDate: nowLocalDateTime(),
      approvedBy: undefined,
      approvedAt: undefined,
    })
    setIsTetanusModalOpen(false)
    setSelectedTetanusService(null)
    showToast('success', 'Tetanoz aşı uygulaması kaydedildi', 'PDF için hizmeti onaylayabilirsiniz.')
  }

  return {
    handleRowDoubleClick,
    handleAudiometrySave,
    handleEyeExaminationSave,
    handleTetanusSave,
  }
}
