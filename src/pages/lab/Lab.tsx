import { useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  Barcode,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  FileText,
  FlaskConical,
  Phone,
  Printer,
  Save,
  Search,
  User,
  X,
} from 'lucide-react'
import { useProtocols } from '../../context/ProtocolsContext'
import { usePatients } from '../../context/PatientsContext'
import { useServices } from '../../context/ServicesContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { AudiometryModal } from '../../pages/audiometry/AudiometryModal'
import { EyeExaminationModal } from '../../pages/eye-examination/EyeExaminationModal'
import { openAudiometryPdf } from '../../utils/audiometryReport'
import { openEyeExaminationPdf } from '../../utils/eyeExaminationReport'
import { nowLocalDateTime, formatDateLocal, addDays } from '../../utils/date'
import { Pagination } from '../../components/ui/Pagination'
import type { AudiometryData, EyeExaminationData, PatientDetail, ProtocolService } from '../../types'
import { CopyButton } from '../../components/ui/CopyButton'
import { SmsPreviewModal, type SmsPreviewItem } from './components/SmsPreviewModal'
import { buildSmsMessage, sendSms } from '../../utils/sms'
import { useCompanies } from '../../context/CompaniesContext'
import {
  statusOptions,
  formatDateTime,
  getMeta,
  calculateHL,
  getResultText,
  getLabName,
  statusColor,
  initialResult,
} from './labUtils'
import { BarcodeModal, type BarcodeTestItem } from './components/BarcodeModal'

export function Lab() {
  const navigate = useNavigate()
  const { protocols, updateServiceInProtocol } = useProtocols()
  const { patients, updatePatient } = usePatients()
  const { catalog, groups } = useServices()
  const { currentUser, users } = useAuth()
  const { companies: companyList } = useCompanies()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [selectedProtocolId, setSelectedProtocolId] = useState<number | null>(protocols[0]?.id ?? null)
  const [selectedProtocolIds, setSelectedProtocolIds] = useState<number[]>([])
  const [lastSelectedProtocolId, setLastSelectedProtocolId] = useState<number | null>(null)
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([])
  const [lastSelectedServiceId, setLastSelectedServiceId] = useState<number | null>(null)
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false)
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false)
  const [pendingSmsList, setPendingSmsList] = useState<SmsPreviewItem[]>([])
  const [patientForm, setPatientForm] = useState<Partial<PatientDetail>>({})
  const [isAudiometryModalOpen, setIsAudiometryModalOpen] = useState(false)
  const [selectedAudiometryService, setSelectedAudiometryService] = useState<ProtocolService | null>(null)
  const [isEyeExaminationModalOpen, setIsEyeExaminationModalOpen] = useState(false)
  const [selectedEyeExaminationService, setSelectedEyeExaminationService] = useState<ProtocolService | null>(null)
  const [showPrintDropdown, setShowPrintDropdown] = useState(false)
  const [isPrintingAll, setIsPrintingAll] = useState(false)
  const [isZippingAll, setIsZippingAll] = useState(false)
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false)
  const [selectedBarcodeTests, setSelectedBarcodeTests] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<{ field: 'protocolNo' | 'patientName' | 'company' | 'tc'; direction: 'asc' | 'desc' } | null>(null)
  const todayStr = formatDateLocal(new Date())
  const [dateStart, setDateStart] = useState(todayStr)
  const [dateEnd, setDateEnd] = useState(todayStr)

  const [protocolPage, setProtocolPage] = useState(1)
  const [protocolPageSize, setProtocolPageSize] = useState(10)
  const [servicePage, setServicePage] = useState(1)
  const [servicePageSize, setServicePageSize] = useState(10)

  const [filters, setFilters] = useState({
    company: 'Tümü',
    examType: 'Tümü',
    group: 'Tümü',
    service: 'Tümü',
    status: 'Tümü',
    tc: '',
    protocolNo: '',
    barcode: '',
  })

  const companies = useMemo(
    () => Array.from(new Set(['Tümü', ...protocols.map((p) => p.company)])),
    [protocols]
  )

  const examTypes = useMemo(
    () => Array.from(new Set(['Tümü', ...protocols.map((p) => p.examType)])),
    [protocols]
  )

  const groupNames = useMemo(
    () => ['Tümü', ...groups.map((g) => g.name)],
    [groups]
  )

  const serviceNames = useMemo(
    () => ['Tümü', ...catalog.map((c) => c.name)],
    [catalog]
  )

  const filteredProtocols = useMemo(() => {
    let list = protocols.filter((p) => {
      const patient = patients.find((pt) => pt.id === p.patientId)
      const date = new Date(p.protocolDate).getTime()
      const start = dateStart ? new Date(`${dateStart}T00:00:00`).getTime() : null
      const end = dateEnd ? new Date(`${dateEnd}T23:59:59.999`).getTime() : null
      if (start !== null && date < start) return false
      if (end !== null && date > end) return false
      if (filters.company !== 'Tümü' && p.company !== filters.company) return false
      if (filters.examType !== 'Tümü' && p.examType !== filters.examType) return false
      if (filters.tc && !patient?.tc?.includes(filters.tc)) return false
      if (filters.protocolNo && !p.protocolNo.includes(filters.protocolNo)) return false
      if (filters.barcode && !p.services.some((s) => s.barcode.includes(filters.barcode))) return false

      const groupMatch = filters.group === 'Tümü' || p.services.some((s) => s.group === filters.group)
      const serviceMatch = filters.service === 'Tümü' || p.services.some((s) => s.name === filters.service)
      const statusMatch =
        filters.status === 'Tümü' ||
        p.services.some((s) => (filters.status === 'Sonuç Bekleniyor' ? s.status === 'Sonuç Bekleniyor' || s.status === 'Numune Bekliyor' : s.status === filters.status))

      return groupMatch && serviceMatch && statusMatch
    })

    if (sortConfig) {
      list = [...list].sort((a, b) => {
        const patientA = patients.find((pt) => pt.id === a.patientId)
        const patientB = patients.find((pt) => pt.id === b.patientId)
        let valA = ''
        let valB = ''
        switch (sortConfig.field) {
          case 'protocolNo':
            valA = a.protocolNo
            valB = b.protocolNo
            break
          case 'patientName':
            valA = patientA?.name ?? ''
            valB = patientB?.name ?? ''
            break
          case 'company':
            valA = a.company
            valB = b.company
            break
          case 'tc':
            valA = patientA?.tc ?? ''
            valB = patientB?.tc ?? ''
            break
        }
        const cmp = valA.localeCompare(valB, 'tr')
        return sortConfig.direction === 'asc' ? cmp : -cmp
      })
    }

    return list
  }, [protocols, patients, filters, sortConfig, dateStart, dateEnd])

  // Tek arama kutusu için birleşik arama
  const [searchAll, setSearchAll] = useState('')
  const searchFilteredProtocols = useMemo(() => {
    if (!searchAll.trim()) return filteredProtocols
    const term = searchAll.trim().toLowerCase()
    return filteredProtocols.filter((p) => {
      const patient = patients.find((pt) => pt.id === p.patientId)
      return (
        p.protocolNo.toLowerCase().includes(term) ||
        p.company.toLowerCase().includes(term) ||
        patient?.name?.toLowerCase().includes(term) ||
        patient?.tc?.toLowerCase().includes(term)
      )
    })
  }, [filteredProtocols, searchAll, patients])

  const totalProtocolPagesAll = useMemo(
    () => Math.ceil(searchFilteredProtocols.length / protocolPageSize),
    [searchFilteredProtocols, protocolPageSize]
  )
  const paginatedProtocolsAll = useMemo(
    () => searchFilteredProtocols.slice((protocolPage - 1) * protocolPageSize, protocolPage * protocolPageSize),
    [searchFilteredProtocols, protocolPage, protocolPageSize]
  )

  useEffect(() => {
    setProtocolPage(1)
  }, [searchFilteredProtocols])

  const selectedProtocol = useMemo(
    () => protocols.find((p) => p.id === selectedProtocolId) || null,
    [protocols, selectedProtocolId]
  )

  const selectedPatient = useMemo(
    () => (selectedProtocol ? patients.find((p) => p.id === selectedProtocol.patientId) || null : null),
    [selectedProtocol, patients]
  )

  const selectedServices = useMemo(() => selectedProtocol?.services ?? [], [selectedProtocol])

  const totalServicePages = useMemo(() => Math.ceil(selectedServices.length / servicePageSize), [selectedServices, servicePageSize])
  const paginatedServices = useMemo(
    () => selectedServices.slice((servicePage - 1) * servicePageSize, servicePage * servicePageSize),
    [selectedServices, servicePage, servicePageSize]
  )

  useEffect(() => {
    setServicePage(1)
  }, [selectedServices])

  const selectAllServices = () => {
    const all = selectedServices.map((s) => s.id)
    const next = selectedServiceIds.length === all.length && all.length > 0 ? [] : all
    setSelectedServiceIds(next)
    setLastSelectedServiceId(next[next.length - 1] ?? null)
  }

  const selectAllProtocols = () => {
    const all = searchFilteredProtocols.map((p) => p.id)
    const next = selectedProtocolIds.length === all.length && all.length > 0 ? [] : all
    setSelectedProtocolIds(next)
    setLastSelectedProtocolId(next[next.length - 1] ?? null)
  }

  const handleProtocolCardClick = (e: React.MouseEvent, id: number) => {
    // Shift seçiminde aktif protokolü değiştirme — sadece seçim aralığını güncelle
    if (e.shiftKey) {
      const anchorId = lastSelectedProtocolId ?? selectedProtocolId
      if (anchorId === null) {
        // İlk tıklama — normal seçim yap
        setSelectedProtocolId(id)
        setSelectedServiceIds([])
        setSelectedProtocolIds([id])
        setLastSelectedProtocolId(id)
        return
      }
      const ids = searchFilteredProtocols.map((p) => p.id)
      const start = ids.indexOf(anchorId)
      const end = ids.indexOf(id)
      if (start === -1 || end === -1) {
        // Anchor bulunamadı — normal seçim yap
        setSelectedProtocolIds([id])
        setLastSelectedProtocolId(id)
        return
      }
      const range = ids.slice(Math.min(start, end), Math.max(start, end) + 1)
      // Shift seçiminde önceki seçimi temizle, sadece aralığı seç
      setSelectedProtocolIds(range)
      setLastSelectedProtocolId(id)
      return
    }

    // Aktif protokol olarak ayarla
    setSelectedProtocolId(id)
    setSelectedServiceIds([])

    if (e.ctrlKey || e.metaKey) {
      setSelectedProtocolIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        setLastSelectedProtocolId(id)
        return next
      })
    } else {
      setSelectedProtocolIds([id])
      setLastSelectedProtocolId(id)
    }
  }

  // Seçili protokollerin tüm hizmetlerini getir
  const allSelectedProtocolServices = useMemo(() => {
    if (selectedProtocolIds.length <= 1) return []
    const protocolsMap = new Map(protocols.map((p) => [p.id, p]))
    return selectedProtocolIds
      .filter((id) => id !== selectedProtocolId)
      .flatMap((id) => {
        const p = protocolsMap.get(id)
        return p?.services ?? []
      })
  }, [selectedProtocolIds, selectedProtocolId, protocols])
  void allSelectedProtocolServices

  // Toplu barkod için: seçili protokollerdeki benzersiz test (hizmet) listesi
  const barcodeTestList = useMemo(() => {
    const targetIds = selectedProtocolIds.length > 0
      ? selectedProtocolIds
      : selectedProtocolId
      ? [selectedProtocolId]
      : []
    if (targetIds.length === 0) return []

    const protocolsMap = new Map(protocols.map((p) => [p.id, p]))
    const testMap = new Map<string, { name: string; group: string; count: number; protocols: number }>()

    targetIds.forEach((pid) => {
      const protocol = protocolsMap.get(pid)
      if (!protocol) return
      const seenInThisProtocol = new Set<string>()
      protocol.services.forEach((s) => {
        const key = s.name
        if (!testMap.has(key)) {
          testMap.set(key, { name: s.name, group: s.group, count: 0, protocols: 0 })
        }
        const entry = testMap.get(key)!
        entry.count++
        if (!seenInThisProtocol.has(key)) {
          entry.protocols++
          seenInThisProtocol.add(key)
        }
      })
    })

    return Array.from(testMap.values()).sort((a, b) => a.group.localeCompare(b.group, 'tr') || a.name.localeCompare(b.name, 'tr'))
  }, [selectedProtocolIds, selectedProtocolId, protocols])

  // Toplu barkod yazdırma — sadece seçili testler, her protokol ayrı gönderilir
  const handlePrintSelectedBarcodesByTest = () => {
    const targetIds = selectedProtocolIds.length > 0
      ? selectedProtocolIds
      : selectedProtocolId
      ? [selectedProtocolId]
      : []
    if (targetIds.length === 0 || selectedBarcodeTests.size === 0) return

    const protocolsMap = new Map(protocols.map((p) => [p.id, p]))
    let totalBarcodes = 0
    let protocolCount = 0

    targetIds.forEach((pid) => {
      const protocol = protocolsMap.get(pid)
      if (!protocol) return
      const patient = patients.find((pt) => pt.id === protocol.patientId)
      if (!patient) return

      // Sadece seçili testlere sahip hizmetleri al
      const filteredServices = protocol.services.filter((s) => selectedBarcodeTests.has(s.name))
      if (filteredServices.length === 0) return

      protocolCount++
      const baseValues = [
        '',
        '1',
        protocol.company,
        protocol.company,
        patient.name,
        formatDateTime(filteredServices[0].processDate),
        protocol.protocolNo,
        '',
        patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('tr-TR') : '',
        patient.gender || '',
      ]
      const serviceValues: string[] = []
      filteredServices.forEach((service) => {
        serviceValues.push(service.group, service.name, service.barcode || '')
        totalBarcodes++
      })
      const values = [...baseValues, ...serviceValues, '']
      const params = values.map(encodeURIComponent).join(encodeURIComponent('|'))
      const url = `infoMedBarkodPrinter:${params}`
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    })

    if (protocolCount === 0) {
      showToast('info', 'Barkod bulunamadı', 'Seçili testler için barkod bulunamadı.')
      return
    }

    showToast('info', 'Barkod yazdırma', `${protocolCount} protokol, ${selectedBarcodeTests.size} test, ${totalBarcodes} barkod yazıcıya gönderildi.`)
    setIsBarcodeModalOpen(false)
  }

  const sortOptions: Array<{ field: 'protocolNo' | 'patientName' | 'company' | 'tc'; label: string }> = [
    { field: 'protocolNo', label: 'Protokol No' },
    { field: 'patientName', label: 'Hasta Adı' },
    { field: 'company', label: 'Firma' },
    { field: 'tc', label: 'TC No' },
  ]

  const handleSort = (field: 'protocolNo' | 'patientName' | 'company' | 'tc') => {
    setSortConfig((prev) => {
      if (prev?.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { field, direction: 'asc' }
    })
  }

  const handleRowClick = (e: React.MouseEvent, id: number) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
      return
    }
    if (e.shiftKey) {
      const anchorId = lastSelectedServiceId ?? (selectedServiceIds.length > 0 ? selectedServiceIds[selectedServiceIds.length - 1] : null)
      if (anchorId === null) {
        setSelectedServiceIds([id])
        setLastSelectedServiceId(id)
        return
      }
      const ids = selectedServices.map((s) => s.id)
      const start = ids.indexOf(anchorId)
      const end = ids.indexOf(id)
      if (start === -1 || end === -1) {
        setSelectedServiceIds([id])
        setLastSelectedServiceId(id)
        return
      }
      const range = ids.slice(Math.min(start, end), Math.max(start, end) + 1)
      setSelectedServiceIds(range)
      setLastSelectedServiceId(id)
      return
    }
    if (e.ctrlKey || e.metaKey) {
      setSelectedServiceIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        setLastSelectedServiceId(id)
        return next
      })
    } else {
      setSelectedServiceIds([id])
      setLastSelectedServiceId(id)
    }
  }

  const handleRowDoubleClick = (id: number) => {
    const service = selectedServices.find((s) => s.id === id)
    if (!service || !selectedProtocol || !selectedPatient) return

    if (service.name === 'İşitme Testi (ODYOMETRİ)') {
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
    } else if (service.name === 'GÖZ TARAMASI (otorefraktometre)') {
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

  const handlePrintSelectedBarcodes = () => {
    if (!selectedProtocol || !selectedPatient || selectedServiceIds.length === 0) return
    const selectedServicesList = selectedServices.filter((s) => selectedServiceIds.includes(s.id))
    if (selectedServicesList.length === 0) return
    try {
      const baseValues = [
        '',
        '1',
        selectedProtocol.company,
        selectedProtocol.company,
        selectedPatient.name,
        formatDateTime(selectedServicesList[0].processDate),
        selectedProtocol.protocolNo,
        '',
        selectedPatient.birthDate ? new Date(selectedPatient.birthDate).toLocaleDateString('tr-TR') : '',
        selectedPatient.gender || '',
      ]
      const serviceValues: string[] = []
      selectedServicesList.forEach((service) => {
        serviceValues.push(service.group, service.name, service.barcode || '')
      })
      const values = [...baseValues, ...serviceValues, '']
      const params = values.map(encodeURIComponent).join(encodeURIComponent('|'))
      const url = `infoMedBarkodPrinter:${params}`
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      showToast('info', 'Barkod yazdırma', 'Barkod yazıcıya gönderildi. Yazıcının açık olduğundan emin olun.')
    } catch (error) {
      showToast('error', 'Barkod yazdırılamadı', 'Yazıcı uygulaması bulunamadı veya bir hata oluştu.')
    }
  }

  // Seçili protokollerin onaylı PDF raporlarını tek PDF'de topla
  const handlePrintSelectedResults = async () => {
    setShowPrintDropdown(false)
    const targetProtocolIds = selectedProtocolIds.length > 0 ? selectedProtocolIds : (selectedProtocolId ? [selectedProtocolId] : [])
    if (targetProtocolIds.length === 0) return

    setIsPrintingAll(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      let hasContent = false
      let reportCount = 0

      const protocolsMap = new Map(protocols.map((p) => [p.id, p]))
      // Sıralamayı koru: seçili protokol önce, sonra diğerleri
      const orderedIds = targetProtocolIds.includes(selectedProtocolId!)
        ? [selectedProtocolId!, ...targetProtocolIds.filter((id) => id !== selectedProtocolId)]
        : targetProtocolIds

      for (const pid of orderedIds) {
        const protocol = protocolsMap.get(pid)
        if (!protocol) continue
        const patient = patients.find((pt) => pt.id === protocol.patientId)
        if (!patient) continue

        for (const service of protocol.services) {
          if (service.status !== 'Onaylandı') continue

          if (service.name === 'İşitme Testi (ODYOMETRİ)' && service.audiometryData) {
            try {
              const data = JSON.parse(service.audiometryData) as AudiometryData
              await openAudiometryPdf({
                patient,
                protocol,
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
              }, doc, !hasContent)
              hasContent = true
              reportCount++
            } catch (err) {
              console.error('Odyometri PDF hatası:', err)
            }
          } else if (service.name === 'GÖZ TARAMASI (otorefraktometre)' && service.eyeExaminationData) {
            try {
              const data = JSON.parse(service.eyeExaminationData) as EyeExaminationData
              await openEyeExaminationPdf({
                patient,
                protocol,
                service,
                data,
                recordedBy: service.recordedBy,
                approvedBy: service.approvedBy,
                approvedAt: service.approvedAt,
                approvedByStamp: service.approvedBy
                  ? users.find((u) => u.displayName === service.approvedBy)?.stamp
                  : undefined,
              }, doc, !hasContent)
              hasContent = true
              reportCount++
            } catch (err) {
              console.error('Göz PDF hatası:', err)
            }
          }
        }
      }

      if (hasContent && reportCount > 0) {
        const dateStr = new Date().toISOString().slice(0, 10)
        const fileName = `Sonuclar_${dateStr}.pdf`
        // PDF metadata — tarayıcı sekme adı ve kaydetme ismi için
        doc.setProperties({
          title: fileName,
          subject: `${reportCount} onaylı rapor`,
          author: 'CETKA',
        })
        // Blob URL yerine data URL kullan — sekme adı daha temiz olur
        const blob = doc.output('blob')
        const blobUrl = URL.createObjectURL(blob)
        const newWin = window.open(blobUrl, '_blank')
        if (!newWin) {
          // Popup engelliyse direkt indir
          const a = document.createElement('a')
          a.href = blobUrl
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } else {
          // Sekme adını ayarla
          newWin.document.title = fileName
        }
        showToast('success', 'Sonuçlar yazdırıldı', `${reportCount} onaylı rapor tek PDF olarak açıldı.`)
      } else {
        showToast('info', 'Yazdırılacak rapor yok', 'Seçili protokollerde onaylı odyometri veya göz raporu bulunamadı.')
      }
    } catch (error) {
      showToast('error', 'PDF oluşturulamadı', error instanceof Error ? error.message : 'Bilinmeyen hata')
    } finally {
      setIsPrintingAll(false)
    }
  }

  // Seçili protokollerin onaylı raporlarını ZIP olarak indir
  const handleDownloadResultsAsZip = async () => {
    setShowPrintDropdown(false)
    const targetProtocolIds = selectedProtocolIds.length > 0 ? selectedProtocolIds : (selectedProtocolId ? [selectedProtocolId] : [])
    if (targetProtocolIds.length === 0) return

    setIsZippingAll(true)
    try {
      const zip = new JSZip()
      const protocolsMap = new Map(protocols.map((p) => [p.id, p]))
      let fileCount = 0
      const usedNames = new Set<string>()

      const orderedIds = targetProtocolIds.includes(selectedProtocolId!)
        ? [selectedProtocolId!, ...targetProtocolIds.filter((id) => id !== selectedProtocolId)]
        : targetProtocolIds

      for (const pid of orderedIds) {
        const protocol = protocolsMap.get(pid)
        if (!protocol) continue
        const patient = patients.find((pt) => pt.id === protocol.patientId)
        if (!patient) continue

        for (const service of protocol.services) {
          if (service.status !== 'Onaylandı') continue

          let blob: Blob | undefined
          let fileBase = ''
          // Hasta adını güvenli ve kısa dosya adına çevir
          const safeName = patient.name
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, '_')
            .trim()
            .slice(0, 30)

          if (service.name === 'İşitme Testi (ODYOMETRİ)' && service.audiometryData) {
            try {
              const data = JSON.parse(service.audiometryData) as AudiometryData
              const result = await openAudiometryPdf({
                patient,
                protocol,
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
              }, undefined, false, true)
              if (result instanceof Blob) blob = result
              fileBase = `Odyometri_${safeName}`
            } catch (err) {
              console.error('Odyometri ZIP hatası:', err)
            }
          } else if (service.name === 'GÖZ TARAMASI (otorefraktometre)' && service.eyeExaminationData) {
            try {
              const data = JSON.parse(service.eyeExaminationData) as EyeExaminationData
              const result = await openEyeExaminationPdf({
                patient,
                protocol,
                service,
                data,
                recordedBy: service.recordedBy,
                approvedBy: service.approvedBy,
                approvedAt: service.approvedAt,
                approvedByStamp: service.approvedBy
                  ? users.find((u) => u.displayName === service.approvedBy)?.stamp
                  : undefined,
              }, undefined, false, true)
              if (result instanceof Blob) blob = result
              fileBase = `Goz_${safeName}`
            } catch (err) {
              console.error('Göz ZIP hatası:', err)
            }
          }

          if (blob) {
            // Dosya adını benzersiz yap
            let fileName = `${fileBase}.pdf`
            let counter = 1
            while (usedNames.has(fileName)) {
              fileName = `${fileBase}_${counter}.pdf`
              counter++
            }
            usedNames.add(fileName)
            zip.file(fileName, blob)
            fileCount++
          }
        }
      }

      if (fileCount === 0) {
        showToast('info', 'İndirilecek rapor yok', 'Seçili protokollerde onaylı odyometri veya göz raporu bulunamadı.')
        return
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = `Sonuclar_${dateStr}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('success', 'ZIP indirildi', `${fileCount} rapor ZIP olarak indirildi.`)
    } catch (error) {
      showToast('error', 'ZIP oluşturulamadı', error instanceof Error ? error.message : 'Bilinmeyen hata')
    } finally {
      setIsZippingAll(false)
    }
  }

  // Seçili protokollerin onaylı raporlarını firma bazında klasörlere ayırarak ZIP indir
  // Her hasta için tüm testleri tek PDF'de birleştirir
  const handleDownloadResultsAsZipByCompany = async () => {
    setShowPrintDropdown(false)
    const targetProtocolIds = selectedProtocolIds.length > 0 ? selectedProtocolIds : (selectedProtocolId ? [selectedProtocolId] : [])
    if (targetProtocolIds.length === 0) return

    setIsZippingAll(true)
    try {
      const zip = new JSZip()
      const protocolsMap = new Map(protocols.map((p) => [p.id, p]))
      const usedNames = new Set<string>()
      let fileCount = 0

      const orderedIds = targetProtocolIds.includes(selectedProtocolId!)
        ? [selectedProtocolId!, ...targetProtocolIds.filter((id) => id !== selectedProtocolId)]
        : targetProtocolIds

      for (const pid of orderedIds) {
        const protocol = protocolsMap.get(pid)
        if (!protocol) continue
        const patient = patients.find((pt) => pt.id === protocol.patientId)
        if (!patient) continue

        // Onaylı raporları topla
        const approvedServices = protocol.services.filter((s) => s.status === 'Onaylandı')
        if (approvedServices.length === 0) continue

        // Bu protokol için tek PDF oluştur — tüm testler birleşik
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        let hasContent = false
        let testCount = 0

        for (const service of approvedServices) {
          if (service.name === 'İşitme Testi (ODYOMETRİ)' && service.audiometryData) {
            try {
              const data = JSON.parse(service.audiometryData) as AudiometryData
              await openAudiometryPdf({
                patient,
                protocol,
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
              }, doc, !hasContent)
              hasContent = true
              testCount++
            } catch (err) {
              console.error('Odyometri ZIP hatası:', err)
            }
          } else if (service.name === 'GÖZ TARAMASI (otorefraktometre)' && service.eyeExaminationData) {
            try {
              const data = JSON.parse(service.eyeExaminationData) as EyeExaminationData
              await openEyeExaminationPdf({
                patient,
                protocol,
                service,
                data,
                recordedBy: service.recordedBy,
                approvedBy: service.approvedBy,
                approvedAt: service.approvedAt,
                approvedByStamp: service.approvedBy
                  ? users.find((u) => u.displayName === service.approvedBy)?.stamp
                  : undefined,
              }, doc, !hasContent)
              hasContent = true
              testCount++
            } catch (err) {
              console.error('Göz ZIP hatası:', err)
            }
          }
        }

        if (hasContent && testCount > 0) {
          const blob = doc.output('blob')
          // Firma adını klasör adı yap — güvenli hale getir
          const safeCompany = protocol.company
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 40) || 'BilinmeyenFirma'
          const safePatient = patient.name
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, '_')
            .trim()
            .slice(0, 30) || 'BilinmeyenHasta'
          const fileBase = `${safePatient}_${protocol.protocolNo}`

          let fileName = `${fileBase}.pdf`
          let counter = 1
          while (usedNames.has(`${safeCompany}/${fileName}`)) {
            fileName = `${fileBase}_${counter}.pdf`
            counter++
          }
          usedNames.add(`${safeCompany}/${fileName}`)

          // Firma klasörü altına ekle
          const folder = zip.folder(safeCompany)
          folder?.file(fileName, blob)
          fileCount++
        }
      }

      if (fileCount === 0) {
        showToast('info', 'İndirilecek rapor yok', 'Seçili protokollerde onaylı odyometri veya göz raporu bulunamadı.')
        return
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = `Sonuclar_FirmaBazli_${dateStr}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('success', 'ZIP indirildi', `${fileCount} hastanın raporları firma bazlı klasörlerde ZIP olarak indirildi.`)
    } catch (error) {
      showToast('error', 'ZIP oluşturulamadı', error instanceof Error ? error.message : 'Bilinmeyen hata')
    } finally {
      setIsZippingAll(false)
    }
  }

  const updateServices = (serviceIds: number[], updates: Partial<Omit<ProtocolService, 'id' | 'protocolId' | 'totalPrice'>>) => {
    if (!selectedProtocol) return
    // Aktif protokoldeki hizmetler
    serviceIds.forEach((id) => {
      updateServiceInProtocol(selectedProtocol.id, id, updates)
    })
    // Diğer seçili protokollerdeki tüm hizmetler (toplu işlem)
    if (selectedProtocolIds.length > 1) {
      const protocolsMap = new Map(protocols.map((p) => [p.id, p]))
      selectedProtocolIds
        .filter((pid) => pid !== selectedProtocol.id)
        .forEach((pid) => {
          const p = protocolsMap.get(pid)
          p?.services.forEach((s) => {
            updateServiceInProtocol(pid, s.id, updates)
          })
        })
    }
  }

  const handleAccept = () => {
    const now = nowLocalDateTime()
    updateServices(selectedServiceIds, { status: 'Numune Kabul', acceptDate: now })
    setSelectedServiceIds([])
    setSelectedProtocolIds([])
  }

  const handleCancelAccept = async () => {
    const ok = await confirm({
      title: 'Kabul İptal',
      message: `${selectedServiceIds.length} hizmetin kabulünü iptal etmek istediğinize emin misiniz? Durum "Numune Bekliyor" olarak güncellenecek.`,
      confirmText: 'İptal Et',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger',
    })
    if (!ok) return
    updateServices(selectedServiceIds, { status: 'Numune Bekliyor', acceptDate: undefined })
    setSelectedServiceIds([])
    setSelectedProtocolIds([])
  }

  const handleApprove = () => {
    const now = nowLocalDateTime()
    // Hangi protokoller onaylanıyor?
    const approvedProtocolIds = new Set<number>()
    selectedServiceIds.forEach((sid) => {
      const p = protocols.find((pr) => pr.services.some((s) => s.id === sid))
      if (p) approvedProtocolIds.add(p.id)
    })

    updateServices(selectedServiceIds, { status: 'Onaylandı', approvedAt: now, approvedBy: currentUser?.displayName })
    setSelectedServiceIds([])
    setSelectedProtocolIds([])

    // SMS kontrolü — onaylanan protokollerde tüm hizmetler onaylandıysa ve firma SMS istiyorsa
    const smsList: SmsPreviewItem[] = []
    approvedProtocolIds.forEach((pid) => {
      const protocol = protocols.find((p) => p.id === pid)
      if (!protocol) return
      const patient = patients.find((pt) => pt.id === protocol.patientId)
      if (!patient) return
      const company = companyList.find((c) => c.name === protocol.company)
      if (!company?.smsOnResultReady) return

      // Bu protokoldeki tüm hizmetler onaylandı mı?
      // (selectedServiceIds içinde olmayanlar zaten onaylanmış olabilir)
      const allApproved = protocol.services.every((s) => {
        return s.status === 'Onaylandı' || selectedServiceIds.includes(s.id)
      })
      if (!allApproved) return

      // SMS mesajı oluştur
      const sms = buildSmsMessage(patient, protocol, company.name)
      if (sms) {
        smsList.push({
          patientName: sms.patientName,
          patientPhone: sms.patientPhone,
          protocolNo: sms.protocolNo,
          companyName: sms.companyName,
          message: sms.message,
          pdfUrl: sms.pdfUrl,
        })
      }
    })

    if (smsList.length > 0) {
      setPendingSmsList(smsList)
      setIsSmsModalOpen(true)
    }
  }

  const handleSendSms = async () => {
    let sent = 0
    let failed = 0
    for (const item of pendingSmsList) {
      const patient = patients.find((p) => p.name === item.patientName)
      const protocol = protocols.find((p) => p.protocolNo === item.protocolNo)
      if (!patient || !protocol) {
        failed++
        continue
      }
      const company = companyList.find((c) => c.name === item.companyName)
      if (!company) {
        failed++
        continue
      }
      const sms = buildSmsMessage(patient, protocol, company.name)
      if (!sms) {
        failed++
        continue
      }
      const result = await sendSms(sms)
      if (result.ok) sent++
      else failed++
    }
    if (sent > 0) {
      showToast('success', 'SMS Gönderildi', `${sent} hastaya sonuç hazır SMS'i gönderildi.`)
    }
    if (failed > 0) {
      showToast('error', 'SMS Hatası', `${failed} SMS gönderilemedi.`)
    }
  }

  const handleCancelApprove = async () => {
    const ok = await confirm({
      title: 'Onay Kaldır',
      message: `${selectedServiceIds.length} hizmetin onayını kaldırmak istediğinize emin misiniz? Durum "Sonuç Girildi" olarak güncellenecek.`,
      confirmText: 'Onayı Kaldır',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger',
    })
    if (!ok) return
    updateServices(selectedServiceIds, { status: 'Sonuç Girildi', approvedAt: undefined, approvedBy: undefined })
    setSelectedServiceIds([])
    setSelectedProtocolIds([])
  }

  const handleResultChange = (serviceId: number, value: string) => {
    if (!selectedProtocol) return
    const service = selectedServices.find((s) => s.id === serviceId)
    if (!service) return
    const meta = getMeta(service.name)
    const resultText = getResultText(value, meta)
    const oldResult = service.result ?? ''
    const shouldUpdateStatus =
      service.status === 'Numune Kabul' ||
      service.status === 'Numune Bekliyor' ||
      service.status === 'Sonuç Bekleniyor'
    updateServiceInProtocol(selectedProtocol.id, serviceId, {
      result: value,
      resultText,
      oldResult: oldResult || undefined,
      status: shouldUpdateStatus ? 'Sonuç Girildi' : service.status,
    })
  }

  const hasSelection = selectedServiceIds.length > 0 || selectedProtocolIds.length > 1

  const serviceStats = useMemo(() => {
    const stats = { pending: 0, accepted: 0, resulted: 0, approved: 0, total: selectedServices.length }
    selectedServices.forEach((s) => {
      if (s.status === 'Onaylandı') stats.approved++
      else if (s.status === 'Sonuç Girildi') stats.resulted++
      else if (s.status === 'Numune Kabul') stats.accepted++
      else stats.pending++
    })
    return stats
  }, [selectedServices])

  // Her protokol için durum özeti
  const protocolStats = useMemo(() => {
    const map = new Map<number, { pending: number; approved: number; total: number }>()
    protocols.forEach((p) => {
      let pending = 0
      let approved = 0
      p.services.forEach((s) => {
        if (s.status === 'Onaylandı') approved++
        else pending++
      })
      map.set(p.id, { pending, approved, total: p.services.length })
    })
    return map
  }, [protocols])
  return (
    <div className="h-full flex flex-col min-h-0 gap-2.5">
      {/* Top filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2">
        <div className="flex flex-wrap items-end gap-2">
          {/* Date range */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setDateStart(addDays(dateStart || todayStr, -1))
                setDateEnd(addDays(dateEnd || todayStr, -1))
              }}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
              title="Önceki gün"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => {
                const value = e.target.value
                setDateStart(value)
                if (dateEnd && value > dateEnd) setDateEnd(value)
              }}
              className="w-[110px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => {
                const value = e.target.value
                setDateEnd(value)
                if (dateStart && value < dateStart) setDateStart(value)
              }}
              className="w-[110px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => {
                setDateStart(addDays(dateStart || todayStr, 1))
                setDateEnd(addDays(dateEnd || todayStr, 1))
              }}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
              title="Sonraki gün"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick date buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setDateStart(todayStr)
                setDateEnd(todayStr)
              }}
              className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Bugün
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const monday = new Date(today)
                monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
                setDateStart(formatDateLocal(monday))
                setDateEnd(todayStr)
              }}
              className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Bu Hafta
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                setDateStart(formatDateLocal(firstDay))
                setDateEnd(todayStr)
              }}
              className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Bu Ay
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-slate-500">Firma</label>
            <select
              value={filters.company}
              onChange={(e) => setFilters({ ...filters, company: e.target.value })}
              className="w-[120px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-slate-500">Tür</label>
            <select
              value={filters.examType}
              onChange={(e) => setFilters({ ...filters, examType: e.target.value })}
              className="w-[110px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {examTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-slate-500">Grup</label>
            <select
              value={filters.group}
              onChange={(e) => setFilters({ ...filters, group: e.target.value })}
              className="w-[110px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {groupNames.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-slate-500">Hizmet</label>
            <select
              value={filters.service}
              onChange={(e) => setFilters({ ...filters, service: e.target.value })}
              className="w-[150px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {serviceNames.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-slate-500">Durum</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-[120px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-slate-500">TC No</label>
            <input
              type="text"
              value={filters.tc}
              onChange={(e) => setFilters({ ...filters, tc: e.target.value })}
              className="w-[100px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-slate-500">Protokol</label>
            <input
              type="text"
              value={filters.protocolNo}
              onChange={(e) => setFilters({ ...filters, protocolNo: e.target.value })}
              className="w-[90px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-slate-500">Barkod</label>
            <input
              type="text"
              value={filters.barcode}
              onChange={(e) => setFilters({ ...filters, barcode: e.target.value })}
              className="w-[90px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => {
              setFilters({
                company: 'Tümü',
                examType: 'Tümü',
                group: 'Tümü',
                service: 'Tümü',
                status: 'Tümü',
                tc: '',
                protocolNo: '',
                barcode: '',
              })
              setDateStart('')
              setDateEnd('')
            }}
            className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Temizle
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Center panel */}
        <div className="lg:col-span-8 lg:order-2 flex flex-col min-h-0 gap-2.5">
          {selectedProtocol && selectedPatient ? (
            <>
              {/* Patient header */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedPatient.gender === 'Kadın'
                        ? 'bg-pink-100 text-pink-500'
                        : selectedPatient.gender === 'Erkek'
                        ? 'bg-blue-100 text-blue-500'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{selectedPatient.name}</h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        {selectedProtocol.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        {selectedPatient.tc}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {selectedPatient.birthDate ? new Date(selectedPatient.birthDate).toLocaleDateString('tr-TR') : '-'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-blue-500" />
                        {selectedPatient.phone || '-'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-100">
                    Protokol: {selectedProtocol.protocolNo}
                  </span>
                  <span className="px-2 py-1 text-xs bg-slate-50 text-slate-600 rounded-lg border border-slate-100">
                    {selectedProtocol.examType}
                  </span>
                  <button
                    onClick={() => navigate(`/hasta-kayit/protokol/${selectedPatient.id}/${selectedProtocol.id}`)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Profil Kartı
                  </button>
                  <button
                    onClick={() => {
                      setPatientForm({ ...selectedPatient })
                      setIsPatientModalOpen(true)
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Düzenle
                  </button>
                </div>
              </div>

              {/* Summary counts */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="text-slate-500 font-medium">Özet:</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  Bekleyen: {serviceStats.pending}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  Kabul: {serviceStats.accepted}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  Sonuç Girildi: {serviceStats.resulted}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  Onaylandı: {serviceStats.approved}
                </span>
                <span className="text-slate-400">/ Toplam: {serviceStats.total}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={selectAllServices}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Barcode className="w-3.5 h-3.5" />
                  {selectedServiceIds.length > 0 ? 'Seçimi Temizle' : 'Tümünü Seç'}
                </button>
                <button
                  onClick={handleAccept}
                  disabled={!hasSelection}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={selectedProtocolIds.length > 1 ? `${selectedProtocolIds.length} protokolün tüm hizmetleri kabul edilecek` : undefined}
                >
                  <Check className="w-3.5 h-3.5" />
                  {selectedProtocolIds.length > 1 ? `Toplu Kabul (${selectedProtocolIds.length})` : 'Kabul'}
                </button>
                <button
                  onClick={handleCancelAccept}
                  disabled={!hasSelection}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={selectedProtocolIds.length > 1 ? `${selectedProtocolIds.length} protokolün kabulü iptal edilecek` : undefined}
                >
                  <X className="w-3.5 h-3.5" />
                  Kabul İptal
                </button>
                <button
                  onClick={handleApprove}
                  disabled={!hasSelection}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={selectedProtocolIds.length > 1 ? `${selectedProtocolIds.length} protokolün tüm hizmetleri onaylanacak` : undefined}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {selectedProtocolIds.length > 1 ? `Toplu Onay (${selectedProtocolIds.length})` : 'Onayla'}
                </button>
                <button
                  onClick={handleCancelApprove}
                  disabled={!hasSelection}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={selectedProtocolIds.length > 1 ? `${selectedProtocolIds.length} protokolün onayı kaldırılacak` : undefined}
                >
                  <X className="w-3.5 h-3.5" />
                  Onay Kaldır
                </button>
                <button
                  onClick={handlePrintSelectedBarcodes}
                  disabled={!hasSelection}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Barkod Yazdır
                </button>
                <button
                  onClick={() => {
                    setSelectedBarcodeTests(new Set())
                    setIsBarcodeModalOpen(true)
                  }}
                  disabled={!selectedProtocol && selectedProtocolIds.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={selectedProtocolIds.length > 1 ? `${selectedProtocolIds.length} protokolün barkodlarını test bazında yazdır` : 'Barkodları test bazında yazdır'}
                >
                  <Barcode className="w-3.5 h-3.5" />
                  {selectedProtocolIds.length > 1 ? `Toplu Barkod (${selectedProtocolIds.length})` : 'Toplu Barkod Yazdır'}
                </button>
              </div>

              {/* Results table */}
              <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-blue-500" />
                    Tetkik Sonuçları
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{selectedServices.length} hizmet</span>
                    <select
                      value={servicePageSize}
                      onChange={(e) => setServicePageSize(Number(e.target.value))}
                      className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {[10, 25, 50, 100].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
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
                        const meta = getMeta(service.name)
                        const isSelected = selectedServiceIds.includes(service.id)
                        const resultValue = service.result ?? initialResult(service.status, meta)
                        const hl = calculateHL(resultValue, meta.range)
                        return (
                          <tr
                            key={service.id}
                            onClick={(e) => handleRowClick(e, service.id)}
                            onDoubleClick={() => handleRowDoubleClick(service.id)}
                            className={`cursor-pointer transition-colors select-none ${
                              isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-2 py-2">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusColor(service.status)}`}>
                                {service.status}
                              </span>
                            </td>
                            <td className="px-2 py-2 font-mono text-slate-700">{service.barcode}</td>
                            <td className="px-2 py-2 text-slate-800">
                              <p className="font-medium truncate max-w-[200px]" title={service.name}>
                                {service.name}
                              </p>
                              <p className="text-[10px] text-slate-500">{service.group}</p>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={resultValue}
                                  onChange={(e) => handleResultChange(service.id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
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
                              </div>
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
                <Pagination page={servicePage} totalPages={totalServicePages} onPageChange={setServicePage} />
                <div className="px-3 py-2 border-t border-slate-100 text-[10px] text-slate-400 text-center shrink-0">
                  {(servicePage - 1) * servicePageSize + 1}-{Math.min(servicePage * servicePageSize, selectedServices.length)} / {selectedServices.length}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <p className="text-slate-500 text-sm">Görüntülemek için listeden bir protokol seçin.</p>
            </div>
          )}
        </div>

        {/* Left panel - Patient/Protocol list (card design) */}
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
                onClick={selectAllProtocols}
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
                onChange={(e) => setSearchAll(e.target.value)}
                placeholder="Protokol, hasta, TC veya firma ara..."
                className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            {/* Sıralama seçici */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 shrink-0">Sırala:</span>
              <select
                value={sortConfig?.field ?? 'protocolNo'}
                onChange={(e) => handleSort(e.target.value as 'protocolNo' | 'patientName' | 'company' | 'tc')}
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
                    setSortConfig({ ...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })
                  } else {
                    setSortConfig({ field: 'protocolNo', direction: 'desc' })
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
              paginatedProtocolsAll.map((p) => {
                const patient = patients.find((pt) => pt.id === p.patientId)
                const isSelected = p.id === selectedProtocolId
                const isMultiSelected = selectedProtocolIds.includes(p.id) && selectedProtocolIds.length > 1
                const stats = protocolStats.get(p.id) ?? { pending: 0, approved: 0, total: 0 }
                const allApproved = stats.total > 0 && stats.approved === stats.total
                const protocolDate = new Date(p.protocolDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                const age = patient?.birthDate
                  ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                  : null
                return (
                  <button
                    key={p.id}
                    onClick={(e) => handleProtocolCardClick(e, p.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all relative ${
                      isMultiSelected
                        ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400/30'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {/* Çoklu seçim göstergesi */}
                    {isMultiSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {/* Üst satır: Hasta Adı + Tarih */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                          {patient?.name ?? 'Bilinmeyen Hasta'}
                        </span>
                        <CopyButton text={patient?.name ?? ''} successLabel="Hasta Adı" />
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{protocolDate}</span>
                    </div>
                    {/* Orta: Protokol No + TC + yaş/cinsiyet */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[11px] font-mono ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                          #{p.protocolNo}
                        </span>
                        <CopyButton text={p.protocolNo} successLabel="Protokol No" />
                      </div>
                      {patient?.tc && (
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-[10px] text-slate-400 font-mono truncate">{patient.tc}</span>
                          <CopyButton text={patient.tc} successLabel="TC Kimlik No" />
                        </div>
                      )}
                      {patient?.gender && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                          patient.gender === 'Kadın'
                            ? 'bg-pink-100 text-pink-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {patient.gender === 'Kadın' ? 'K' : 'E'}
                        </span>
                      )}
                      {age !== null && (
                        <span className="text-[10px] text-slate-400 shrink-0">{age} yaş</span>
                      )}
                    </div>
                    {/* Alt: Firma + durum rozetleri */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className="text-[10px] text-slate-500 truncate">{p.company}</span>
                        <CopyButton text={p.company} successLabel="Firma Adı" />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {stats.total > 0 && (
                          <>
                            {stats.pending > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                                {stats.pending} bekleyen
                              </span>
                            )}
                            {stats.approved > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                {stats.approved} onaylı
                              </span>
                            )}
                            {allApproved && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
          <div className="px-3 py-2 border-t border-slate-100 shrink-0 flex items-center justify-between gap-2 text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span>Sayfa başına</span>
              <select
                value={protocolPageSize}
                onChange={(e) => setProtocolPageSize(Number(e.target.value))}
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
              {/* Sonuç Yazdır Dropdown — yukarı açılır */}
              <div className="relative">
                <button
                  onClick={() => setShowPrintDropdown(!showPrintDropdown)}
                  disabled={isPrintingAll || isZippingAll || (selectedProtocolIds.length === 0 && !selectedProtocolId)}
                  className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Seçili protokollerin onaylı sonuç raporlarını yazdır veya indir"
                >
                  <Printer className="w-3 h-3" />
                  {isPrintingAll ? 'PDF Hazırlanıyor...' : isZippingAll ? 'ZIP Hazırlanıyor...' : 'Sonuç Yazdır'}
                </button>
                {showPrintDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPrintDropdown(false)} />
                    <div className="absolute bottom-full right-0 mb-1 z-50 w-64 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                        <span className="text-[10px] font-bold text-slate-700">Sonuç Yazdır / İndir</span>
                      </div>
                      <div className="p-1.5 space-y-1">
                        {/* Tek PDF olarak aç */}
                        <button
                          onClick={handlePrintSelectedResults}
                          disabled={isPrintingAll || isZippingAll}
                          className="w-full text-left px-2.5 py-2 text-[10px] text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors disabled:opacity-40"
                        >
                          <div className="flex items-center gap-1.5 font-medium">
                            <Printer className="w-3 h-3" />
                            {selectedProtocolIds.length > 1
                              ? `Tek PDF (${selectedProtocolIds.length} protokol)`
                              : 'Tek PDF olarak aç'}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-0.5">Tüm raporları tek PDF'de birleştirip yeni sekmede aç</p>
                        </button>
                        {/* ZIP — her rapor ayrı PDF */}
                        <button
                          onClick={handleDownloadResultsAsZip}
                          disabled={isPrintingAll || isZippingAll}
                          className="w-full text-left px-2.5 py-2 text-[10px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors disabled:opacity-40"
                        >
                          <div className="flex items-center gap-1.5 font-medium">
                            <FileText className="w-3 h-3" />
                            {selectedProtocolIds.length > 1
                              ? `ZIP indir (${selectedProtocolIds.length} protokol)`
                              : 'ZIP olarak indir'}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-0.5">Her raporu ayrı PDF olarak ZIP dosyasında indir</p>
                        </button>
                        {/* ZIP — firma bazlı klasörler, hasta bazlı tek PDF */}
                        <button
                          onClick={handleDownloadResultsAsZipByCompany}
                          disabled={isPrintingAll || isZippingAll}
                          className="w-full text-left px-2.5 py-2 text-[10px] text-slate-700 hover:bg-violet-50 hover:text-violet-700 rounded-lg transition-colors disabled:opacity-40"
                        >
                          <div className="flex items-center gap-1.5 font-medium">
                            <Building2 className="w-3 h-3" />
                            {selectedProtocolIds.length > 1
                              ? `Firma bazlı ZIP (${selectedProtocolIds.length} protokol)`
                              : 'Firma bazlı ZIP indir'}
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
              <span>
                {(protocolPage - 1) * protocolPageSize + 1}-{Math.min(protocolPage * protocolPageSize, searchFilteredProtocols.length)} / {searchFilteredProtocols.length}
              </span>
            </div>
          </div>
          <Pagination page={protocolPage} totalPages={totalProtocolPagesAll} onPageChange={setProtocolPage} />
        </div>
      </div>

      <Modal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        title="Hasta Bilgilerini Düzenle"
        size="lg"
      >
        {selectedPatient && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updatePatient(selectedPatient.id, patientForm)
              setIsPatientModalOpen(false)
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Ad Soyad"
                value={patientForm.name ?? ''}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
              />
              <Input
                label="TC Kimlik No"
                value={patientForm.tc ?? ''}
                onChange={(e) => setPatientForm({ ...patientForm, tc: e.target.value })}
              />
              <Input
                label="Telefon"
                value={patientForm.phone ?? ''}
                onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
              />
              <Input
                label="E-posta"
                type="email"
                value={patientForm.email ?? ''}
                onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
              />
              <Input
                label="Doğum Tarihi"
                type="date"
                value={patientForm.birthDate ?? ''}
                onChange={(e) => setPatientForm({ ...patientForm, birthDate: e.target.value })}
              />
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cinsiyet</label>
                <select
                  value={patientForm.gender ?? ''}
                  onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="Erkek">Erkek</option>
                  <option value="Kadın">Kadın</option>
                </select>
              </div>
              <Input
                label="Firma"
                value={patientForm.company ?? ''}
                onChange={(e) => setPatientForm({ ...patientForm, company: e.target.value })}
              />
              <Input
                label="Adres"
                value={patientForm.address ?? ''}
                onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPatientModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                İptal
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Kaydet
              </button>
            </div>
          </form>
        )}
      </Modal>

      <AudiometryModal
        isOpen={isAudiometryModalOpen}
        onClose={() => {
          setIsAudiometryModalOpen(false)
          setSelectedAudiometryService(null)
        }}
        service={selectedAudiometryService}
        patientName={selectedPatient?.name}
        patientTc={selectedPatient?.tc}
        patientBirthDate={selectedPatient?.birthDate}
        patientGender={selectedPatient?.gender}
        company={selectedProtocol?.company}
        protocolNo={selectedProtocol?.protocolNo}
        examType={selectedProtocol?.examType}
        onSave={handleAudiometrySave}
      />

      <EyeExaminationModal
        isOpen={isEyeExaminationModalOpen}
        onClose={() => {
          setIsEyeExaminationModalOpen(false)
          setSelectedEyeExaminationService(null)
        }}
        service={selectedEyeExaminationService}
        onSave={handleEyeExaminationSave}
      />

      {/* Toplu Barkod Yazdır Modal — Test bazında seçim */}
      <BarcodeModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        protocolCount={selectedProtocolIds.length > 0 ? selectedProtocolIds.length : 1}
        barcodeTestList={barcodeTestList as BarcodeTestItem[]}
        selectedBarcodeTests={selectedBarcodeTests}
        setSelectedBarcodeTests={setSelectedBarcodeTests}
        onPrint={handlePrintSelectedBarcodesByTest}
      />

      {/* SMS Önizleme Modalı */}
      <SmsPreviewModal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
        smsList={pendingSmsList}
        onConfirm={handleSendSms}
      />
    </div>
  )
}
