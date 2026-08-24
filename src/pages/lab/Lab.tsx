import { useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  Barcode,
  Banknote,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Edit2,
  FileText,
  FlaskConical,
  Mail,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  Printer,
  Save,
  Search,
  StickyNote,
  Trash2,
  Upload,
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
import { VezneTransactions } from '../../pages/vezne/components/VezneTransactions'
import { EyeExaminationModal } from '../../pages/eye-examination/EyeExaminationModal'
import { openAudiometryPdf } from '../../utils/audiometryReport'
import { openEyeExaminationPdf } from '../../utils/eyeExaminationReport'
import { nowLocalDateTime, formatDateLocal, addDays } from '../../utils/date'
import { Pagination } from '../../components/ui/Pagination'
import type { AudiometryData, EyeExaminationData, PatientDetail, ProtocolService, ServiceCatalogItem, ServicePackage } from '../../types'
import { CopyButton } from '../../components/ui/CopyButton'
import { SmsPreviewModal, type SmsPreviewItem } from './components/SmsPreviewModal'
import { MultiSelectFilter, FilterChips } from './components/MultiSelectFilter'
import { buildSmsMessage, sendSms } from '../../utils/sms'
import { saveSharedPdf, getSharedPdf, incrementPdfRef } from '../../utils/storage'
import { useCompanies, type CompanyService } from '../../context/CompaniesContext'
import {
  formatDateTime,
  getMeta,
  calculateHL,
  getResultText,
  getLabName,
  statusColor,
  statusDot,
  initialResult,
} from './labUtils'
import { BarcodeModal, type BarcodeTestItem } from './components/BarcodeModal'

export function Lab() {
  const navigate = useNavigate()
  const { protocols, updateServiceInProtocol, addServiceToProtocol, removeServiceFromProtocol } = useProtocols()
  const { patients, updatePatient } = usePatients()
  const { catalog, groups, packages } = useServices()
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
  const [showMoreActions, setShowMoreActions] = useState(false)
  const [isPrintingAll, setIsPrintingAll] = useState(false)
  const [isZippingAll, setIsZippingAll] = useState(false)
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false)
  const [selectedBarcodeTests, setSelectedBarcodeTests] = useState<Set<string>>(new Set())
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false)
  const [addServiceSearch, setAddServiceSearch] = useState('')
  const [addServiceTab, setAddServiceTab] = useState<'company' | 'packages' | 'all'>('company')
  const [showAddServiceForm, setShowAddServiceForm] = useState(false)
  const [newServiceForm, setNewServiceForm] = useState({ name: '', group: 'Biyokimya', price: '', vatRate: '0' })
  const [sortConfig, setSortConfig] = useState<{ field: 'protocolNo' | 'patientName' | 'company' | 'tc'; direction: 'asc' | 'desc' } | null>(null)
  const todayStr = formatDateLocal(new Date())
  const [dateStart, setDateStart] = useState(todayStr)
  const [dateEnd, setDateEnd] = useState(todayStr)

  const [protocolPage, setProtocolPage] = useState(1)
  const [protocolPageSize, setProtocolPageSize] = useState(10)
  const [servicePage, setServicePage] = useState(1)
  const [servicePageSize, setServicePageSize] = useState(10)
  const [serviceStatusFilter, setServiceStatusFilter] = useState<string | null>(null)
  const [resultsTab, setResultsTab] = useState<'results' | 'vezne'>('results')

  const [filters, setFilters] = useState({
    company: [] as string[],
    examType: [] as string[],
    group: [] as string[],
    service: [] as string[],
    status: [] as string[],
    tc: '',
    protocolNo: '',
    barcode: '',
  })

  const companies = useMemo(
    () => Array.from(new Set(protocols.map((p) => p.company))).sort(),
    [protocols]
  )

  const examTypes = useMemo(
    () => Array.from(new Set(protocols.map((p) => p.examType))).sort(),
    [protocols]
  )

  const groupNames = useMemo(
    () => groups.map((g) => g.name),
    [groups]
  )

  const serviceNames = useMemo(
    () => catalog.map((c) => c.name),
    [catalog]
  )

  const statusOptions = useMemo(
    () => ['Barkod Verildi', 'İşlem Bekliyor', 'Numune Kabul', 'Sonuç Bekleniyor', 'Sonuç Girildi', 'Onaylandı'],
    []
  )

  const filteredProtocols = useMemo(() => {
    let list = protocols.filter((p) => {
      const patient = patients.find((pt) => pt.id === p.patientId)
      const date = new Date(p.protocolDate).getTime()
      const start = dateStart ? new Date(`${dateStart}T00:00:00`).getTime() : null
      const end = dateEnd ? new Date(`${dateEnd}T23:59:59.999`).getTime() : null
      if (start !== null && date < start) return false
      if (end !== null && date > end) return false
      if (filters.company.length > 0 && !filters.company.includes(p.company)) return false
      if (filters.examType.length > 0 && !filters.examType.includes(p.examType)) return false
      if (filters.tc && !patient?.tc?.toLowerCase().includes(filters.tc.toLowerCase())) return false
      if (filters.protocolNo && !p.protocolNo.toLowerCase().includes(filters.protocolNo.toLowerCase())) return false
      if (filters.barcode && !p.services.some((s) => s.barcode?.toLowerCase().includes(filters.barcode.toLowerCase()))) return false

      const groupMatch = filters.group.length === 0 || p.services.some((s) => filters.group.includes(s.group))
      const serviceMatch = filters.service.length === 0 || p.services.some((s) => filters.service.includes(s.name))
      const statusMatch =
        filters.status.length === 0 ||
        p.services.some((s) => {
          if (filters.status.includes('Sonuç Bekleniyor')) {
            return s.status === 'Sonuç Bekleniyor' || s.status === 'İşlem Bekliyor' || filters.status.includes(s.status)
          }
          return filters.status.includes(s.status)
        })

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

  const selectedServices = useMemo(() => {
    const all = selectedProtocol?.services ?? []
    if (!serviceStatusFilter) return all
    return all.filter((s) => {
      if (serviceStatusFilter === 'pending') return s.status !== 'Onaylandı' && s.status !== 'Sonuç Girildi' && s.status !== 'Numune Kabul'
      if (serviceStatusFilter === 'accepted') return s.status === 'Numune Kabul'
      if (serviceStatusFilter === 'resulted') return s.status === 'Sonuç Girildi'
      if (serviceStatusFilter === 'approved') return s.status === 'Onaylandı'
      return true
    })
  }, [selectedProtocol, serviceStatusFilter])

  const totalServicePages = useMemo(() => Math.ceil(selectedServices.length / servicePageSize), [selectedServices, servicePageSize])
  const paginatedServices = useMemo(
    () => selectedServices.slice((servicePage - 1) * servicePageSize, servicePage * servicePageSize),
    [selectedServices, servicePage, servicePageSize]
  )

  useEffect(() => {
    setServicePage(1)
    setServiceStatusFilter(null)
  }, [selectedProtocol])

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

    // Ödeme kontrolü — ödeme eksikse uyarı göster
    const protocol = protocols.find((p) => p.id === id)
    if (protocol) {
      const totalServicePrice = protocol.services.reduce((sum, s) => sum + (s.totalPrice || 0), 0)
      const totalPaid = protocol.payments.reduce((sum, pmt) => sum + (pmt.amount || 0), 0)
      if (totalServicePrice > 0 && totalPaid < totalServicePrice) {
        const remaining = totalServicePrice - totalPaid
        const patient = patients.find((pt) => pt.id === protocol.patientId)
        showToast(
          'warning',
          `${patient?.name ?? 'Hasta'} adlı kişinin ödemesi tamamlanmadı. Kalan: ${remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
        )
      }
    }
  }

  // Seçili protokollerin tüm hizmetlerini getir
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

      // "İşlem Bekliyor" durumundaki servisleri "Barkod Verildi"ye güncelle
      filteredServices.forEach((service) => {
        if (service.status === 'İşlem Bekliyor') {
          updateServiceInProtocol(protocol.id, service.id, { status: 'Barkod Verildi' })
        }
      })

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

    // PDF varsa çift tıklayınca yeni sekmede aç
    if (service.pdfData || service.pdfId) {
      openPdfViewer(id)
      return
    }

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
    // "İşlem Bekliyor" durumundaki servisleri "Barkod Verildi"ye güncelle
    selectedServicesList.forEach((service) => {
      if (service.status === 'İşlem Bekliyor') {
        updateServiceInProtocol(selectedProtocol.id, service.id, { status: 'Barkod Verildi' })
      }
    })
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

  // Seçili protokoldeki tüm hizmetlerin barkodlarını yazdır (seçim gerektirmez)
  const handlePrintAllBarcodesForProtocol = () => {
    if (!selectedProtocol || !selectedPatient) return
    const allServices = selectedProtocol.services
    if (allServices.length === 0) return
    // "İşlem Bekliyor" durumundaki servisleri "Barkod Verildi"ye güncelle
    allServices.forEach((service) => {
      if (service.status === 'İşlem Bekliyor') {
        updateServiceInProtocol(selectedProtocol.id, service.id, { status: 'Barkod Verildi' })
      }
    })
    try {
      const baseValues = [
        '',
        '1',
        selectedProtocol.company,
        selectedProtocol.company,
        selectedPatient.name,
        formatDateTime(allServices[0].processDate),
        selectedProtocol.protocolNo,
        '',
        selectedPatient.birthDate ? new Date(selectedPatient.birthDate).toLocaleDateString('tr-TR') : '',
        selectedPatient.gender || '',
      ]
      const serviceValues: string[] = []
      allServices.forEach((service) => {
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
      showToast('info', 'Barkod yazdırma', `${allServices.length} barkod yazıcıya gönderildi.`)
    } catch (error) {
      showToast('error', 'Barkod yazdırılamadı', 'Yazıcı uygulaması bulunamadı veya bir hata oluştu.')
    }
  }

  // Hızlı hizmet ekleme — firma özel fiyat, paket desteği ile
  const selectedCompanyServices: CompanyService[] = useMemo(() => {
    if (!selectedProtocol) return []
    const company = companyList.find((c) => c.name === selectedProtocol.company)
    return company?.companyServices ?? []
  }, [selectedProtocol, companyList])

  const companyServiceMap = useMemo(() => {
    const map = new Map<number, CompanyService>()
    selectedCompanyServices.forEach((cs) => map.set(cs.serviceId, cs))
    return map
  }, [selectedCompanyServices])

  const selectedNamesSet = useMemo(
    () => new Set((selectedProtocol?.services ?? []).map((s) => s.name.toLowerCase())),
    [selectedProtocol]
  )

  const protocolTotalAmount = useMemo(
    () => (selectedProtocol?.services ?? []).reduce((sum, s) => sum + (s.totalPrice || 0), 0),
    [selectedProtocol]
  )

  // Vezne özeti
  const vezneSummary = useMemo(() => {
    if (!selectedProtocol) return { total: 0, paid: 0, discount: 0, remaining: 0 }
    const total = selectedProtocol.services.reduce((sum, s) => sum + (s.totalPrice || 0), 0)
    const paid = selectedProtocol.payments
      .filter((p) => p.paymentType !== 'İndirim')
      .reduce((sum, p) => sum + p.amount, 0)
    const discount = selectedProtocol.payments
      .filter((p) => p.paymentType === 'İndirim')
      .reduce((sum, p) => sum + p.amount, 0)
    const remaining = Number((total - paid - discount).toFixed(2))
    return { total, paid, discount, remaining }
  }, [selectedProtocol])

  const handleQuickAddService = (item: ServiceCatalogItem | ServicePackage) => {
    if (!selectedProtocol) return
    const isCatalog = 'vatRate' in item
    if (isCatalog) {
      const catalogItem = item as ServiceCatalogItem
      const cs = companyServiceMap.get(catalogItem.id)
      const price = cs ? cs.customPrice : catalogItem.price
      const vatRate = cs?.customVatRate ?? catalogItem.vatRate
      addServiceToProtocol(selectedProtocol.id, {
        status: 'İşlem Bekliyor',
        processDate: nowLocalDateTime(),
        code: catalogItem.code,
        group: catalogItem.group,
        name: catalogItem.name,
        price,
        vatRate,
        recordedBy: currentUser?.displayName ?? 'Sistem',
      })
      showToast('success', 'Hizmet eklendi', `${catalogItem.name} protokole eklendi.`)
    } else {
      const pkg = item as ServicePackage
      const hasCustomPricing = pkg.services.some((ps) => ps.customPrice !== undefined || ps.customVatRate !== undefined)
      let addedCount = 0
      pkg.services.forEach((ps) => {
        const service = catalog.find((c) => c.id === ps.serviceId)
        if (service && !selectedNamesSet.has(service.name.toLowerCase())) {
          const cs = companyServiceMap.get(service.id)
          let price: number
          let vatRate: number
          if (cs) {
            price = cs.customPrice
            vatRate = cs.customVatRate ?? service.vatRate
          } else if (hasCustomPricing) {
            price = ps.customPrice ?? service.price
            vatRate = ps.customVatRate ?? service.vatRate
          } else {
            price = 0
            vatRate = service.vatRate
          }
          addServiceToProtocol(selectedProtocol.id, {
            status: 'İşlem Bekliyor',
            processDate: nowLocalDateTime(),
            code: service.code,
            group: service.group,
            name: service.name,
            price,
            vatRate,
            recordedBy: currentUser?.displayName ?? 'Sistem',
          })
          addedCount++
        }
      })
      const packageName = `Paket: ${pkg.name}`
      if (!selectedNamesSet.has(packageName.toLowerCase())) {
        addServiceToProtocol(selectedProtocol.id, {
          status: 'İşlem Bekliyor',
          processDate: nowLocalDateTime(),
          code: 0,
          group: 'Paket',
          name: packageName,
          price: pkg.price,
          vatRate: 0,
          recordedBy: currentUser?.displayName ?? 'Sistem',
        })
      }
      showToast('success', 'Paket eklendi', `${pkg.name} paketi (${addedCount} test) protokole eklendi.`)
    }
  }

  const handleQuickAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProtocol) return
    addServiceToProtocol(selectedProtocol.id, {
      status: 'İşlem Bekliyor',
      processDate: nowLocalDateTime(),
      code: 0,
      group: newServiceForm.group,
      name: newServiceForm.name,
      price: Number(newServiceForm.price) || 0,
      vatRate: Number(newServiceForm.vatRate) || 0,
      recordedBy: currentUser?.displayName ?? 'Sistem',
    })
    showToast('success', 'Hizmet eklendi', `${newServiceForm.name} protokole eklendi.`)
    setNewServiceForm({ name: '', group: 'Biyokimya', price: '', vatRate: '0' })
    setShowAddServiceForm(false)
  }

  // Filtrelenmiş katalog/paket listesi
  const filteredAddServiceList = useMemo(() => {
    if (!selectedProtocol) return []
    const term = addServiceSearch.trim().toLowerCase()
    let list: (ServiceCatalogItem | ServicePackage)[] = []

    if (addServiceTab === 'company') {
      list = selectedCompanyServices
        .map((cs) => catalog.find((c) => c.id === cs.serviceId))
        .filter(Boolean) as ServiceCatalogItem[]
    } else if (addServiceTab === 'packages') {
      list = packages.filter(
        (p) =>
          p.companies.length === 0 ||
          p.companies.some((comp) => comp.toLowerCase() === selectedProtocol.company.toLowerCase())
      )
    } else {
      list = [...catalog]
    }

    // Zaten eklenmiş hizmetleri/paketleri listeden gizle
    list = list.filter((item) => {
      if (selectedNamesSet.has(item.name.toLowerCase())) return false
      // Paketler "Paket: X" adıyla eklendiği için paket adını da kontrol et
      if (!('vatRate' in item) && selectedNamesSet.has(`paket: ${item.name.toLowerCase()}`)) return false
      return true
    })

    if (term) {
      list = list.filter((item) => item.name.toLowerCase().includes(term))
    }

    return list
  }, [catalog, packages, addServiceSearch, addServiceTab, selectedCompanyServices, selectedProtocol, selectedNamesSet])

  // Seçili protokollerin onaylı PDF raporlarını tek PDF'de topla
  const handlePrintSelectedResults = async () => {
    setShowPrintDropdown(false)
    const targetProtocolIds = selectedProtocolIds.length > 0 ? selectedProtocolIds : (selectedProtocolId ? [selectedProtocolId] : [])
    if (targetProtocolIds.length === 0) return

    setIsPrintingAll(true)
    try {
      const { jsPDF } = await import('jspdf')
      const { PDFDocument } = await import('pdf-lib')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      let hasContent = false
      let reportCount = 0

      // Yüklenen PDF'leri topla — sonra pdf-lib ile birleştir
      const uploadedPdfs: { bytes: Uint8Array; name: string }[] = []

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

          // Yüklenen PDF varsa — pdf-lib için topla
          const pdfInfo = resolvePdfData(service)
          if (pdfInfo) {
            try {
              const base64 = pdfInfo.data.split(',')[1]
              const binary = atob(base64)
              const bytes = new Uint8Array(binary.length)
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
              uploadedPdfs.push({ bytes, name: pdfInfo.name })
              reportCount++
            } catch (err) {
              console.error('PDF yükleme hatası:', err)
            }
          } else if (service.name === 'İşitme Testi (ODYOMETRİ)' && service.audiometryData) {
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

      if (reportCount === 0) {
        showToast('info', 'Yazdırılacak rapor yok', 'Seçili protokollerde onaylı rapor bulunamadı.')
        return
      }

      const dateStr = new Date().toISOString().slice(0, 10)
      const fileName = `Sonuclar_${dateStr}.pdf`

      if (hasContent && uploadedPdfs.length > 0) {
        // jsPDF çıktısı + yüklenen PDF'leri pdf-lib ile birleştir
        const jsPdfBytes = doc.output('arraybuffer')
        const merged = await PDFDocument.create()
        // jsPDF sayfalarını ekle
        const jsPdfDoc = await PDFDocument.load(jsPdfBytes)
        const jsPages = await merged.copyPages(jsPdfDoc, jsPdfDoc.getPageIndices())
        jsPages.forEach((p) => merged.addPage(p))
        // Yüklenen PDF'lerin sayfalarını ekle
        for (const { bytes } of uploadedPdfs) {
          try {
            const pdfDoc = await PDFDocument.load(bytes)
            const pages = await merged.copyPages(pdfDoc, pdfDoc.getPageIndices())
            pages.forEach((p) => merged.addPage(p))
          } catch (err) {
            console.error('PDF birleştirme hatası:', err)
          }
        }
        const mergedBytes = await merged.save()
        const blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' })
        const blobUrl = URL.createObjectURL(blob)
        const newWin = window.open(blobUrl, '_blank')
        if (!newWin) {
          const a = document.createElement('a')
          a.href = blobUrl
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } else {
          newWin.document.title = fileName
        }
        showToast('success', 'Sonuçlar yazdırıldı', `${reportCount} rapor (odyometri/göz + yüklenen PDF) tek PDF olarak açıldı.`)
      } else if (hasContent) {
        // Sadece jsPDF çıktısı
        doc.setProperties({ title: fileName, subject: `${reportCount} onaylı rapor`, author: 'CETKA' })
        const blob = doc.output('blob')
        const blobUrl = URL.createObjectURL(blob)
        const newWin = window.open(blobUrl, '_blank')
        if (!newWin) {
          const a = document.createElement('a')
          a.href = blobUrl
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } else {
          newWin.document.title = fileName
        }
        showToast('success', 'Sonuçlar yazdırıldı', `${reportCount} onaylı rapor tek PDF olarak açıldı.`)
      } else if (uploadedPdfs.length > 0) {
        // Sadece yüklenen PDF'ler — birleştir
        const merged = await PDFDocument.create()
        for (const { bytes } of uploadedPdfs) {
          try {
            const pdfDoc = await PDFDocument.load(bytes)
            const pages = await merged.copyPages(pdfDoc, pdfDoc.getPageIndices())
            pages.forEach((p) => merged.addPage(p))
          } catch (err) {
            console.error('PDF birleştirme hatası:', err)
          }
        }
        const mergedBytes = await merged.save()
        const blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' })
        const blobUrl = URL.createObjectURL(blob)
        const newWin = window.open(blobUrl, '_blank')
        if (!newWin) {
          const a = document.createElement('a')
          a.href = blobUrl
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } else {
          newWin.document.title = fileName
        }
        showToast('success', 'Sonuçlar yazdırıldı', `${uploadedPdfs.length} yüklenen PDF tek dosyada birleştirildi.`)
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
          } else if (resolvePdfData(service)) {
            // Yüklenen PDF — direkt ZIP'e ekle
            try {
              const pdfInfo = resolvePdfData(service)!
              const base64 = pdfInfo.data.split(',')[1]
              const binary = atob(base64)
              const bytes = new Uint8Array(binary.length)
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
              blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
              const safeServiceName = service.name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 20)
              fileBase = `PDF_${safeName}_${safeServiceName}`
            } catch (err) {
              console.error('PDF ZIP hatası:', err)
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
        showToast('info', 'İndirilecek rapor yok', 'Seçili protokollerde onaylı rapor bulunamadı.')
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
        const uploadedPdfs: Uint8Array[] = []

        for (const service of approvedServices) {
          const pdfInfo = resolvePdfData(service)
          if (pdfInfo) {
            // Yüklenen PDF — topla, sonra birleştir
            try {
              const base64 = pdfInfo.data.split(',')[1]
              const binary = atob(base64)
              const bytes = new Uint8Array(binary.length)
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
              uploadedPdfs.push(bytes)
              testCount++
            } catch (err) {
              console.error('PDF yükleme hatası:', err)
            }
          } else if (service.name === 'İşitme Testi (ODYOMETRİ)' && service.audiometryData) {
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

        if (testCount > 0) {
          let blob: Blob
          if (hasContent && uploadedPdfs.length > 0) {
            // jsPDF + yüklenen PDF'leri birleştir
            const { PDFDocument } = await import('pdf-lib')
            const jsPdfBytes = doc.output('arraybuffer')
            const merged = await PDFDocument.create()
            const jsPdfDoc = await PDFDocument.load(jsPdfBytes)
            const jsPages = await merged.copyPages(jsPdfDoc, jsPdfDoc.getPageIndices())
            jsPages.forEach((p) => merged.addPage(p))
            for (const bytes of uploadedPdfs) {
              try {
                const pdfDoc = await PDFDocument.load(bytes)
                const pages = await merged.copyPages(pdfDoc, pdfDoc.getPageIndices())
                pages.forEach((p) => merged.addPage(p))
              } catch (err) {
                console.error('PDF birleştirme hatası:', err)
              }
            }
            const mergedBytes = await merged.save()
            blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' })
          } else if (hasContent) {
            blob = doc.output('blob')
          } else {
            // Sadece yüklenen PDF'ler
            const { PDFDocument } = await import('pdf-lib')
            const merged = await PDFDocument.create()
            for (const bytes of uploadedPdfs) {
              try {
                const pdfDoc = await PDFDocument.load(bytes)
                const pages = await merged.copyPages(pdfDoc, pdfDoc.getPageIndices())
                pages.forEach((p) => merged.addPage(p))
              } catch (err) {
                console.error('PDF birleştirme hatası:', err)
              }
            }
            const mergedBytes = await merged.save()
            blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' })
          }
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
        showToast('info', 'İndirilecek rapor yok', 'Seçili protokollerde onaylı rapor bulunamadı.')
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
      message: `${selectedServiceIds.length} hizmetin kabulünü iptal etmek istediğinize emin misiniz? Durum "İşlem Bekliyor" olarak güncellenecek.`,
      confirmText: 'İptal Et',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger',
    })
    if (!ok) return
    updateServices(selectedServiceIds, { status: 'İşlem Bekliyor', acceptDate: undefined })
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
      service.status === 'İşlem Bekliyor' ||
      service.status === 'Sonuç Bekleniyor'
    updateServiceInProtocol(selectedProtocol.id, serviceId, {
      result: value,
      resultText,
      oldResult: oldResult || undefined,
      status: shouldUpdateStatus ? 'Sonuç Girildi' : service.status,
    })
  }

  // PDF yükleme
  const openPdfViewer = (serviceId: number) => {
    const service = selectedServices.find((s) => s.id === serviceId)
    if (!service) return
    // Önce pdfId ile shared store'dan al, yoksa pdfData'dan
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

  const base64ToBlob = (dataUrl: string) => {
    const [meta, base64] = dataUrl.split(',')
    const mime = meta.match(/:(.*?);/)?.[1] ?? 'application/pdf'
    const bytes = atob(base64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new Blob([arr], { type: mime })
  }

  // Servisten PDF data'sını al — pdfId (shared) veya pdfData (inline) destekler
  const resolvePdfData = (service: ProtocolService): { data: string; name: string } | null => {
    if (service.pdfId) {
      const shared = getSharedPdf(service.pdfId)
      if (shared) return { data: shared.data, name: shared.name }
      return null
    }
    if (service.pdfData) return { data: service.pdfData, name: service.pdfName ?? 'PDF' }
    return null
  }

  // Test notu
  const [noteModal, setNoteModal] = useState<{ serviceId: number; serviceName: string; note: string } | null>(null)
  const [noteDraft, setNoteDraft] = useState('')

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

  const handleSaveNote = () => {
    if (!selectedProtocol || !noteModal) return
    const noteValue = noteDraft.trim() || undefined
    // Toplu not — serviceName "N test" formatındaysa tüm seçili testlere uygula
    if (/^\d+ test$/.test(noteModal.serviceName) && selectedServiceIds.length > 0) {
      selectedServiceIds.forEach((sid) => {
        updateServiceInProtocol(selectedProtocol.id, sid, { note: noteValue })
      })
      showToast('success', 'Toplu not kaydedildi', `${selectedServiceIds.length} teste not eklendi.`)
    } else {
      updateServiceInProtocol(selectedProtocol.id, noteModal.serviceId, {
        note: noteValue,
      })
      showToast('success', 'Not kaydedildi', noteModal.serviceName)
    }
    setNoteModal(null)
    setNoteDraft('')
  }

  // Sağ tuş context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; serviceId: number } | null>(null)
  const pdfUploadRef = useRef<HTMLInputElement>(null)
  const [contextServiceId, setContextServiceId] = useState<number | null>(null)

  const handleContextMenu = (e: React.MouseEvent, serviceId: number) => {
    e.preventDefault()
    e.stopPropagation()
    const menuWidth = 200
    const menuHeight = 260
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10)
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10)
    setContextMenu({ x, y, serviceId })
  }

  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    document.addEventListener('click', handler)
    document.addEventListener('scroll', handler, true)
    return () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('scroll', handler, true)
    }
  }, [contextMenu])

  const handleContextMenuPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProtocol || contextServiceId === null) return
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
      // PDF yüklenince durumu Onaylandı yap (eğer zaten onaylı değilse)
      if (service && service.status !== 'Onaylandı') {
        updates.status = 'Onaylandı'
        updates.approvedBy = currentUser?.displayName ?? 'Sistem'
        updates.approvedAt = nowLocalDateTime()
      }
      updateServiceInProtocol(selectedProtocol.id, contextServiceId, updates)
      showToast('success', 'PDF yüklendi ve onaylandı', `"${file.name}" yüklendi, test durumu "Onaylandı" olarak işaretlendi.`)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
    setContextMenu(null)
  }

  // Toplu PDF yükleme — seçili testlere aynı PDF'i yükle
  const bulkPdfUploadRef = useRef<HTMLInputElement>(null)

  const handleBulkPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProtocol || selectedServiceIds.length === 0) return
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Dosya çok büyük', 'PDF dosyası 5MB\'dan küçük olmalıdır.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      // PDF'i bir kez shared store'a kaydet
      const pdfId = saveSharedPdf(base64, file.name)
      incrementPdfRef(pdfId, selectedServiceIds.length)
      const now = nowLocalDateTime()
      const approver = currentUser?.displayName ?? 'Sistem'
      selectedServiceIds.forEach((sid) => {
        const service = selectedServices.find((s) => s.id === sid)
        // Eski pdfId varsa ref'i azalt
        if (service?.pdfId) incrementPdfRef(service.pdfId, -1)
        const updates: Partial<ProtocolService> = {
          pdfId,
          pdfName: file.name,
          pdfData: undefined, // pdfData'yı temizle, artık shared store kullanıyor
        }
        if (service && service.status !== 'Onaylandı') {
          updates.status = 'Onaylandı'
          updates.approvedBy = approver
          updates.approvedAt = now
        }
        updateServiceInProtocol(selectedProtocol.id, sid, updates)
      })
      showToast('success', 'PDF toplu yüklendi', `"${file.name}" ${selectedServiceIds.length} teste bağlandı (tek PDF) ve onaylandı.`)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const hasSelection = selectedServiceIds.length > 0 || selectedProtocolIds.length > 1

  const serviceStats = useMemo(() => {
    const allServices = selectedProtocol?.services ?? []
    const stats = { pending: 0, accepted: 0, resulted: 0, approved: 0, total: allServices.length }
    allServices.forEach((s) => {
      if (s.status === 'Onaylandı') stats.approved++
      else if (s.status === 'Sonuç Girildi') stats.resulted++
      else if (s.status === 'Numune Kabul') stats.accepted++
      else stats.pending++
    })
    return stats
  }, [selectedProtocol])

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
      {/* Filtre paneli — 2 sütun: Sol tarih, Sağ filtreler */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1px_1fr] gap-x-4 gap-y-2.5">
          {/* Sol: Tarih */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-slate-600">Tarih Aralığı</span>
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
                className="w-[105px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400">—</span>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => {
                  const value = e.target.value
                  setDateEnd(value)
                  if (dateStart && value < dateStart) setDateStart(value)
                }}
                className="w-[105px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500"
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setDateStart(todayStr); setDateEnd(todayStr) }}
                className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
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
                className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
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
                className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Bu Ay
              </button>
            </div>
          </div>

          {/* Dikey ayraç */}
          <div className="hidden lg:block w-px bg-slate-200" />

          {/* Sağ: Filtreler — 2 alt satır */}
          <div className="flex flex-col gap-1.5">
            {/* Satır 1: Kategorisel filtreler */}
            <div className="flex items-end gap-2 flex-wrap">
              <MultiSelectFilter label="Firma" options={companies} selected={filters.company} onChange={(v) => setFilters({ ...filters, company: v })} width="w-[130px]" />
              <MultiSelectFilter label="Tür" options={examTypes} selected={filters.examType} onChange={(v) => setFilters({ ...filters, examType: v })} width="w-[105px]" />
              <MultiSelectFilter label="Grup" options={groupNames} selected={filters.group} onChange={(v) => setFilters({ ...filters, group: v })} width="w-[105px]" />
              <MultiSelectFilter label="Hizmet" options={serviceNames} selected={filters.service} onChange={(v) => setFilters({ ...filters, service: v })} width="w-[150px]" />
              <MultiSelectFilter label="Durum" options={statusOptions} selected={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} width="w-[120px]" />
            </div>

            {/* Satır 2: Metin aramaları + Temizle */}
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-500">TC No</label>
                <input
                  type="text"
                  value={filters.tc}
                  onChange={(e) => setFilters({ ...filters, tc: e.target.value })}
                  placeholder="12345678901"
                  className="w-[110px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-500">Protokol</label>
                <input
                  type="text"
                  value={filters.protocolNo}
                  onChange={(e) => setFilters({ ...filters, protocolNo: e.target.value })}
                  placeholder="2026000001"
                  className="w-[100px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-slate-500">Barkod</label>
                <input
                  type="text"
                  value={filters.barcode}
                  onChange={(e) => setFilters({ ...filters, barcode: e.target.value })}
                  placeholder="Barkod..."
                  className="w-[100px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <button
                onClick={() => {
                  setFilters({ company: [], examType: [], group: [], service: [], status: [], tc: '', protocolNo: '', barcode: '' })
                  setDateStart('')
                  setDateEnd('')
                }}
                className="ml-auto px-2.5 py-1.5 text-[10px] font-medium text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors shrink-0"
              >
                ✕ Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Aktif filtre chip'leri */}
        <FilterChips
          chips={[
            ...filters.company.map((v) => ({ label: 'Firma', value: v, onRemove: () => setFilters({ ...filters, company: filters.company.filter((x) => x !== v) }), color: 'blue' as const })),
            ...filters.examType.map((v) => ({ label: 'Tür', value: v, onRemove: () => setFilters({ ...filters, examType: filters.examType.filter((x) => x !== v) }), color: 'purple' as const })),
            ...filters.group.map((v) => ({ label: 'Grup', value: v, onRemove: () => setFilters({ ...filters, group: filters.group.filter((x) => x !== v) }), color: 'emerald' as const })),
            ...filters.service.map((v) => ({ label: 'Hizmet', value: v, onRemove: () => setFilters({ ...filters, service: filters.service.filter((x) => x !== v) }), color: 'cyan' as const })),
            ...filters.status.map((v) => ({ label: 'Durum', value: v, onRemove: () => setFilters({ ...filters, status: filters.status.filter((x) => x !== v) }), color: 'amber' as const })),
            ...(filters.tc ? [{ label: 'TC', value: filters.tc, onRemove: () => setFilters({ ...filters, tc: '' }), color: 'slate' as const }] : []),
            ...(filters.protocolNo ? [{ label: 'Protokol', value: filters.protocolNo, onRemove: () => setFilters({ ...filters, protocolNo: '' }), color: 'slate' as const }] : []),
            ...(filters.barcode ? [{ label: 'Barkod', value: filters.barcode, onRemove: () => setFilters({ ...filters, barcode: '' }), color: 'slate' as const }] : []),
          ]}
          onClearAll={() => {
            setFilters({ company: [], examType: [], group: [], service: [], status: [], tc: '', protocolNo: '', barcode: '' })
            setDateStart('')
            setDateEnd('')
          }}
        />
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
                  <button
                    onClick={() => {
                      setAddServiceSearch('')
                      setAddServiceTab('company')
                      setShowAddServiceForm(false)
                      setIsAddServiceModalOpen(true)
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                    title="Bu protokole hızlı hizmet/test ekle"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Hizmet Ekle
                  </button>
                </div>
              </div>

              {/* Summary counts + Protokol/ExamType rozetleri */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-100">
                  Protokol: {selectedProtocol.protocolNo}
                </span>
                <span className="px-2 py-1 text-xs bg-slate-50 text-slate-600 rounded-lg border border-slate-100">
                  {selectedProtocol.examType}
                </span>
                <span className="w-px h-4 bg-slate-200" />
                <span className="text-slate-500 font-medium">Özet:</span>
                <button
                  onClick={() => setServiceStatusFilter(serviceStatusFilter === 'pending' ? null : 'pending')}
                  className={`px-2 py-0.5 rounded-full font-medium transition-all ${serviceStatusFilter === 'pending' ? 'bg-slate-600 text-white ring-2 ring-slate-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Bekleyen: {serviceStats.pending}
                </button>
                <button
                  onClick={() => setServiceStatusFilter(serviceStatusFilter === 'accepted' ? null : 'accepted')}
                  className={`px-2 py-0.5 rounded-full font-medium transition-all ${serviceStatusFilter === 'accepted' ? 'bg-amber-600 text-white ring-2 ring-amber-300' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                >
                  Kabul: {serviceStats.accepted}
                </button>
                <button
                  onClick={() => setServiceStatusFilter(serviceStatusFilter === 'resulted' ? null : 'resulted')}
                  className={`px-2 py-0.5 rounded-full font-medium transition-all ${serviceStatusFilter === 'resulted' ? 'bg-blue-600 text-white ring-2 ring-blue-300' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                >
                  Sonuç Girildi: {serviceStats.resulted}
                </button>
                <button
                  onClick={() => setServiceStatusFilter(serviceStatusFilter === 'approved' ? null : 'approved')}
                  className={`px-2 py-0.5 rounded-full font-medium transition-all ${serviceStatusFilter === 'approved' ? 'bg-emerald-600 text-white ring-2 ring-emerald-300' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                >
                  Onaylandı: {serviceStats.approved}
                </button>
                {serviceStatusFilter && (
                  <button
                    onClick={() => setServiceStatusFilter(null)}
                    className="px-2 py-0.5 rounded-full font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Filtreyi temizle"
                  >
                    ✕ Filtre
                  </button>
                )}
                <span className="text-slate-400">/ Toplam: {serviceStats.total}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={selectAllServices}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Barcode className="w-3.5 h-3.5" />
                  {selectedServiceIds.length > 0 ? 'Seçimi Temizle' : 'T.Seç'}
                </button>
                <button
                  onClick={handlePrintSelectedBarcodes}
                  disabled={!hasSelection}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Printer className="w-3.5 h-3.5" />
                  B.Yazdır
                </button>
                <button
                  onClick={handlePrintAllBarcodesForProtocol}
                  disabled={!selectedProtocol}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Seçili protokoldeki tüm barkodları yazdır"
                >
                  <Barcode className="w-3.5 h-3.5" />
                  T. Barkod
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
                  K.İptal
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
                  O.Kaldır
                </button>
                {/* Diğer İşlemler — dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreActions(!showMoreActions)}
                    disabled={!hasSelection}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    Diğer
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showMoreActions && hasSelection && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMoreActions(false)} />
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
                              onClick={() => { bulkPdfUploadRef.current?.click(); setShowMoreActions(false) }}
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
                              onClick={() => {
                                // İlk seçili teste not modalı aç, kaydedince tümüne uygula
                                const firstId = selectedServiceIds[0]
                                const service = selectedServices.find((s) => s.id === firstId)
                                if (service) {
                                  setNoteDraft(service.note ?? '')
                                  setNoteModal({ serviceId: firstId, serviceName: `${selectedServiceIds.length} test`, note: service.note ?? '' })
                                }
                                setShowMoreActions(false)
                              }}
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
                            onClick={() => {
                              setShowMoreActions(false)
                              if (selectedPatient?.email) {
                                const subject = `Laboratuvar Sonuçları - ${selectedPatient?.name ?? ''}`
                                const body = `Sayın ${selectedPatient?.name ?? ''},\n\nLaboratuvar sonuçlarınız hazırdır.\nProtokol No: ${selectedProtocol?.protocolNo ?? ''}\n\nSaygılarımızla.`
                                window.location.href = `mailto:${selectedPatient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                                showToast('info', 'Mail penceresi açıldı', selectedPatient.email)
                              } else {
                                showToast('error', 'E-posta yok', 'Bu hastanın e-posta adresi bulunmuyor.')
                              }
                            }}
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

              {/* Results table + Vezne tab'ları */}
              <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {/* Sekme başlığı */}
                <div className="px-3 pt-2 bg-slate-50 border-b border-slate-200 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setResultsTab('results')}
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
                      onClick={() => setResultsTab('vezne')}
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
                            onContextMenu={(e) => handleContextMenu(e, service.id)}
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
                                </div>
                                {(service.pdfData || service.pdfId) && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openPdfViewer(service.id) }}
                                    className="shrink-0 p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title={`PDF Görüntüle: ${service.pdfName ?? ''}`}
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {service.note && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openNoteModal(service.id) }}
                                    className="shrink-0 p-1 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                    title={`Not: ${service.note}`}
                                  >
                                    <StickyNote className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
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
                  </>
                )}

                {/* Vezne sekmesi */}
                {resultsTab === 'vezne' && selectedProtocol && (
                  <div className="flex-1 min-h-0 overflow-auto p-3">
                    <VezneTransactions protocol={selectedProtocol} />
                  </div>
                )}
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
              {/* Toplu Barkod Yazdır */}
              <button
                onClick={() => {
                  setSelectedBarcodeTests(new Set())
                  setIsBarcodeModalOpen(true)
                }}
                disabled={!selectedProtocol && selectedProtocolIds.length === 0}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title={selectedProtocolIds.length > 1 ? `${selectedProtocolIds.length} protokolün barkodlarını test bazında yazdır` : 'Barkodları test bazında yazdır'}
              >
                <Barcode className="w-3 h-3" />
                {selectedProtocolIds.length > 1 ? `Toplu Barkod (${selectedProtocolIds.length})` : 'Toplu Barkod'}
              </button>
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
        patientName={selectedPatient?.name}
        patientTc={selectedPatient?.tc}
        patientBirthDate={selectedPatient?.birthDate}
        patientGender={selectedPatient?.gender}
        company={selectedProtocol?.company}
        protocolNo={selectedProtocol?.protocolNo}
        examType={selectedProtocol?.examType}
        onSave={handleEyeExaminationSave}
      />

      {/* Sağ tuş context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }} />
          <div
            className="fixed z-[61] bg-white rounded-lg shadow-xl border border-slate-200 py-1 w-[200px] text-[11px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const service = selectedServices.find((s) => s.id === contextMenu.serviceId)
              if (!service) return null
              return (
                <>
                  {/* Başlık */}
                  <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                    <p className="font-semibold text-slate-800 truncate">{service.name}</p>
                    <p className="text-[9px] text-slate-500">{service.group} — {service.barcode}</p>
                  </div>

                  {/* PDF Yükle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setContextServiceId(contextMenu.serviceId)
                      setContextMenu(null)
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          pdfUploadRef.current?.click()
                        })
                      })
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    PDF Yükle
                  </button>

                  {/* PDF Görüntüle */}
                  {(service.pdfData || service.pdfId) && (
                    <button
                      onClick={() => {
                        openPdfViewer(contextMenu.serviceId)
                        setContextMenu(null)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      PDF Görüntüle
                    </button>
                  )}

                  {/* PDF Sil */}
                  {(service.pdfData || service.pdfId) && (
                    <button
                      onClick={() => {
                        if (selectedProtocol) {
                          // Shared PDF ref'i azalt
                          if (service.pdfId) incrementPdfRef(service.pdfId, -1)
                          updateServiceInProtocol(selectedProtocol.id, contextMenu.serviceId, { pdfData: undefined, pdfName: undefined, pdfId: undefined })
                          showToast('info', 'PDF silindi', 'Yüklenen PDF sonuç kaldırıldı.')
                        }
                        setContextMenu(null)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      PDF Sil
                    </button>
                  )}

                  {/* Not Ekle / Düzenle */}
                  <button
                    onClick={() => {
                      openNoteModal(contextMenu.serviceId)
                      setContextMenu(null)
                    }}
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

                  {/* Durum değiştir */}
                  <div className="px-3 py-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Durum</div>
                  {['İşlem Bekliyor', 'Numune Kabul', 'Sonuç Bekleniyor', 'Sonuç Girildi', 'Onaylandı'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        if (selectedProtocol) {
                          const updates: Partial<ProtocolService> = { status: st }
                          if (st === 'Onaylandı') {
                            updates.approvedBy = currentUser?.displayName ?? 'Sistem'
                            updates.approvedAt = nowLocalDateTime()
                          } else if (service.status === 'Onaylandı') {
                            updates.approvedBy = undefined
                            updates.approvedAt = undefined
                          }
                          updateServiceInProtocol(selectedProtocol.id, contextMenu.serviceId, updates)
                          showToast('success', 'Durum güncellendi', `${service.name}: ${st}`)
                        }
                        setContextMenu(null)
                      }}
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
                  {service.name === 'İşitme Testi (ODYOMETRİ)' && (
                    <button
                      onClick={() => {
                        handleRowDoubleClick(contextMenu.serviceId)
                        setContextMenu(null)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-purple-50 hover:text-purple-600 transition-colors text-left"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      Odyometri Modal
                    </button>
                  )}
                  {service.name === 'GÖZ TARAMASI (otorefraktometre)' && (
                    <button
                      onClick={() => {
                        handleRowDoubleClick(contextMenu.serviceId)
                        setContextMenu(null)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-cyan-50 hover:text-cyan-600 transition-colors text-left"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      Göz Taraması Modal
                    </button>
                  )}
                </>
              )
            })()}
          </div>
        </>
      )}

      {/* Gizli PDF upload input — context menu'den tetiklenir (her zaman DOM'da kalır) */}
      <input
        ref={pdfUploadRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleContextMenuPdfUpload}
      />

      {/* Gizli toplu PDF upload input — toolbar'dan tetiklenir */}
      <input
        ref={bulkPdfUploadRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleBulkPdfUpload}
      />

      {/* Not Ekleme Modalı — Sol sidebar şablonlar, sağ içerik */}
      <Modal
        isOpen={!!noteModal}
        onClose={() => { setNoteModal(null); setNoteDraft(''); setShowTemplateForm(false); setNewTemplateName('') }}
        title="Test Notu"
        subtitle={noteModal ? (
          <span className="text-xs font-medium text-slate-600 truncate">{noteModal.serviceName}</span>
        ) : undefined}
        size="lg"
      >
        {noteModal && (
          <div className="flex gap-3 h-[420px]">
            {/* Sol sidebar — Şablon yönetimi */}
            <div className="w-[260px] shrink-0 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-700">Şablonlar</span>
                  <span className="text-[10px] text-slate-400">({noteTemplates.length})</span>
                </div>
                <button
                  onClick={() => setShowTemplateForm(!showTemplateForm)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="Yeni Şablon Ekle"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Yeni şablon ekleme formu */}
              {showTemplateForm && (
                <div className="p-2 border-b border-slate-200 bg-blue-50">
                  <textarea
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTemplate() }
                      if (e.key === 'Escape') { setShowTemplateForm(false); setNewTemplateName('') }
                    }}
                    placeholder="Şablon metnini yazın... (Enter ile kaydet)"
                    autoFocus
                    rows={3}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex gap-1 mt-1.5">
                    <button
                      onClick={addTemplate}
                      className="flex-1 px-2 py-1 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={() => { setShowTemplateForm(false); setNewTemplateName('') }}
                      className="px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              )}

              {/* Şablon listesi */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                {noteTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-3">
                    <StickyNote className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-[10px] text-slate-400">Henüz şablon yok.</p>
                    <p className="text-[10px] text-slate-400">"+" ile ekleyin.</p>
                  </div>
                ) : (
                  noteTemplates.map((tpl, i) => (
                    <div
                      key={tpl}
                      className="group flex items-start gap-1.5 px-2 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                      onClick={() => setNoteDraft(tpl)}
                    >
                      <span className="shrink-0 w-5 h-5 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center text-[9px] font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <p className="flex-1 text-[10px] text-slate-700 leading-snug line-clamp-2">{tpl}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeTemplate(tpl) }}
                        className="shrink-0 p-0.5 text-slate-300 hover:text-red-500 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                        title="Sil"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Alt bilgi */}
              <div className="px-3 py-1.5 border-t border-slate-200 bg-white">
                <p className="text-[9px] text-slate-400 text-center">Şablonu seçmek için tıklayın</p>
              </div>
            </div>

            {/* Sağ taraf — Not içeriği */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Üst bilgi */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{noteModal.serviceName}</p>
                  <p className="text-[10px] text-slate-500">Test notu düzenle</p>
                </div>
                {noteModal.note && (
                  <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-md text-[10px] font-medium text-amber-700 shrink-0">
                    <StickyNote className="w-2.5 h-2.5" />
                    Mevcut not var
                  </span>
                )}
              </div>

              {/* Not alanı */}
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                autoFocus
                placeholder="Notunuzu yazın veya soldaki şablonlardan birini seçin..."
                className="flex-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white resize-none leading-relaxed"
              />

              {/* Alt aksiyonlar */}
              <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-2">
                  {noteDraft.trim() && !noteTemplates.includes(noteDraft.trim()) && (
                    <button
                      onClick={() => {
                        setNoteTemplates([...noteTemplates, noteDraft.trim()])
                        showToast('success', 'Şablon eklendi', 'Yazdığınız not şablon olarak kaydedildi.')
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Şablon olarak kaydet
                    </button>
                  )}
                  {noteModal.note && (
                    <button
                      onClick={() => {
                        if (selectedProtocol) {
                          updateServiceInProtocol(selectedProtocol.id, noteModal.serviceId, { note: undefined })
                          showToast('info', 'Not silindi', noteModal.serviceName)
                        }
                        setNoteModal(null)
                        setNoteDraft('')
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Notu Sil
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setNoteModal(null); setNoteDraft(''); setShowTemplateForm(false); setNewTemplateName('') }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Hızlı Hizmet Ekleme Modalı — Modern tasarım */}
      <Modal
        isOpen={isAddServiceModalOpen}
        onClose={() => {
          setIsAddServiceModalOpen(false)
          setShowAddServiceForm(false)
        }}
        title="Hızlı Hizmet Ekle"
        subtitle={selectedProtocol && selectedPatient ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-slate-800 truncate">{selectedPatient.name}</span>
            <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
              {selectedProtocol.company} — {selectedProtocol.protocolNo}
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-medium bg-slate-100 text-slate-600 rounded shrink-0">
              {selectedProtocol.examType}
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white rounded shrink-0">
              {selectedProtocol.services.length} hizmet
            </span>
          </div>
        ) : undefined}
        size="2xl"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[520px]">
            {/* Sol: Katalog */}
            <div className="flex flex-col h-full min-h-0 overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
              {/* Tab'lar */}
              <div className="flex gap-1 px-2 pt-2 bg-slate-50 border-b border-slate-200 shrink-0">
                {([
                  { key: 'company' as const, label: 'Firma Hizmetleri', icon: Building2 },
                  { key: 'packages' as const, label: 'Paketler', icon: Package },
                  { key: 'all' as const, label: 'Tümü', icon: FlaskConical },
                ]).map((t) => {
                  const Icon = t.icon
                  return (
                    <button
                      key={t.key}
                      onClick={() => setAddServiceTab(t.key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-t-lg whitespace-nowrap transition-all ${
                        addServiceTab === t.key
                          ? 'text-blue-600 bg-white border-x border-t border-slate-200 -mb-px'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {/* Arama */}
              <div className="relative px-2 py-2 border-b border-slate-100 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={addServiceSearch}
                  onChange={(e) => setAddServiceSearch(e.target.value)}
                  placeholder="Hizmet/test/paket ara..."
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {/* Hizmet/Paket listesi */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                {filteredAddServiceList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Search className="w-8 h-8 text-slate-200 mb-2" />
                    <p className="text-xs text-slate-400">
                      {selectedProtocol && selectedProtocol.services.length > 0
                        ? 'Tüm hizmetler eklendi veya aramanızla eşleşen bulunamadı.'
                        : 'Aramanızla eşleşen hizmet bulunamadı.'}
                    </p>
                  </div>
                ) : (
                  filteredAddServiceList.map((item) => {
                    const isCatalog = 'vatRate' in item
                    let priceDisplay: React.ReactNode = ''
                    if (isCatalog) {
                      const cs = companyServiceMap.get((item as ServiceCatalogItem).id)
                      if (cs && cs.customPrice !== (item as ServiceCatalogItem).price) {
                        priceDisplay = (
                          <>
                            <span className="text-blue-600 font-bold">₺{cs.customPrice.toFixed(2)}</span>
                            <span className="line-through text-slate-400 ml-1 text-[9px]">₺{(item as ServiceCatalogItem).price.toFixed(2)}</span>
                          </>
                        )
                      } else {
                        priceDisplay = `₺${(item as ServiceCatalogItem).price.toFixed(2)}`
                      }
                    } else {
                      priceDisplay = `₺${(item as ServicePackage).price.toFixed(2)}`
                    }

                    return (
                      <button
                        key={isCatalog ? `s-${(item as ServiceCatalogItem).id}` : `p-${(item as ServicePackage).id}`}
                        onClick={() => handleQuickAddService(item)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg border transition-all text-left group bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm"
                      >
                        {/* Sol ikon */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isCatalog
                            ? 'bg-blue-50 group-hover:bg-blue-100'
                            : 'bg-amber-50 group-hover:bg-amber-100'
                        }`}>
                          {isCatalog ? (
                            <FlaskConical className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <Package className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>
                        {/* Orta — ad + grup */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            {isCatalog ? (item as ServiceCatalogItem).group : 'Paket'}
                            {!isCatalog && (
                              <span className="px-1 py-0 rounded bg-amber-100 text-amber-600 text-[9px] font-bold">
                                {(item as ServicePackage).services.length} test
                              </span>
                            )}
                          </p>
                        </div>
                        {/* Sağ — fiyat + ekle ikonu */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-500">{priceDisplay}</span>
                          <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                            <Plus className="w-3 h-3 text-blue-600 group-hover:text-white transition-colors" />
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              {/* Manuel Hizmet Ekleme */}
              <div className="border-t border-slate-200 shrink-0">
                {!showAddServiceForm ? (
                  <button
                    onClick={() => setShowAddServiceForm(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Yeni Hizmet Ekle (Manuel)
                  </button>
                ) : (
                  <form onSubmit={handleQuickAddCustom} className="p-2 space-y-1.5 bg-slate-50">
                    <Input
                      size="sm"
                      label="Hizmet Adı"
                      value={newServiceForm.name}
                      onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                      required
                    />
                    <div className="grid grid-cols-3 gap-1.5">
                      <Input
                        size="sm"
                        label="Grup"
                        value={newServiceForm.group}
                        onChange={(e) => setNewServiceForm({ ...newServiceForm, group: e.target.value })}
                        required
                      />
                      <Input
                        size="sm"
                        label="Fiyat"
                        type="number"
                        value={newServiceForm.price}
                        onChange={(e) => setNewServiceForm({ ...newServiceForm, price: e.target.value })}
                        required
                      />
                      <Input
                        size="sm"
                        label="KDV %"
                        type="number"
                        value={newServiceForm.vatRate}
                        onChange={(e) => setNewServiceForm({ ...newServiceForm, vatRate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Ekle
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddServiceForm(false)}
                        className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                      >
                        Vazgeç
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Sağ: Seçili Hizmetler + Fiyat Düzenleme */}
            <div className="flex flex-col h-full min-h-0 overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
              {/* Başlık */}
              <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-50 to-white border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Protokol Hizmetleri</h3>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-md">
                  {selectedProtocol?.services.length ?? 0} hizmet
                </span>
              </div>

              {/* Hizmet listesi */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                {(selectedProtocol?.services ?? []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Plus className="w-8 h-8 text-slate-200 mb-2" />
                    <p className="text-xs text-slate-400">Henüz hizmet eklenmemiş.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Soldan hizmet seçerek ekleyin.</p>
                  </div>
                ) : (
                  (selectedProtocol?.services ?? []).map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
                    >
                      {/* Sol renk çubuğu — gruba göre */}
                      <div className={`w-1 h-8 rounded-full shrink-0 ${
                        service.group === 'Paket' ? 'bg-amber-400' :
                        service.group === 'Biyokimya' ? 'bg-blue-400' :
                        service.group === 'Hematoloji' ? 'bg-rose-400' :
                        service.group === 'Mikrobiyoloji' ? 'bg-purple-400' :
                        service.group === 'Seroloji' ? 'bg-cyan-400' :
                        service.group === 'Radyoloji' ? 'bg-indigo-400' :
                        'bg-slate-400'
                      }`} />
                      {/* Ad + grup */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-800 truncate">{service.name}</p>
                        <p className="text-[10px] text-slate-500">{service.group}</p>
                      </div>
                      {/* Fiyat düzenleme */}
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₺</span>
                          <input
                            type="number"
                            value={service.price}
                            onChange={(e) => {
                              if (!selectedProtocol) return
                              updateServiceInProtocol(selectedProtocol.id, service.id, {
                                price: Number(e.target.value) || 0,
                                vatRate: service.vatRate,
                              })
                            }}
                            step="0.01"
                            min="0"
                            className="w-16 pl-4 pr-1 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 text-right"
                            title="Fiyat (KDV hariç)"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 w-14 text-right">
                          ₺{Number((service.price * (1 + service.vatRate / 100)).toFixed(2)).toFixed(2)}
                        </span>
                      </div>
                      {/* Sil */}
                      <button
                        onClick={async () => {
                          if (!selectedProtocol) return
                          const ok = await confirm({
                            title: 'Hizmet Sil',
                            message: `${service.name} hizmetini silmek istediğinize emin misiniz?`,
                            skipKey: 'delete-service',
                          })
                          if (ok) {
                            removeServiceFromProtocol(selectedProtocol.id, service.id)
                            showToast('info', 'Hizmet silindi', `${service.name} protokolden kaldırıldı.`)
                          }
                        }}
                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Alt özet — toplam */}
              <div className="px-3 py-2 bg-gradient-to-r from-slate-50 to-white border-t border-slate-200 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500">
                      Hizmet: <span className="font-bold text-slate-700">{selectedProtocol?.services.length ?? 0}</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      KDV Hariç: <span className="font-bold text-slate-700">
                        ₺{((selectedProtocol?.services ?? []).reduce((sum, s) => sum + s.price, 0)).toFixed(2)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Toplam:</span>
                    <span className="text-sm font-bold text-emerald-600">
                      ₺{protocolTotalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

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
