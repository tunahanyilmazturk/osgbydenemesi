import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, Send, Users, Stethoscope, CheckCircle, FileSearch, Calendar } from 'lucide-react'
import { usePatients } from '../../context/PatientsContext'
import { useProtocols } from '../../context/ProtocolsContext'
import { useCompanies } from '../../context/CompaniesContext'
import { useExamTypes } from '../../context/ExamTypesContext'
import { useServices } from '../../context/ServicesContext'
import { useAuth } from '../../context/AuthContext'
import { statusOptions } from '../../pages/lab/labUtils'
import { defaultExternalLabs } from './mocks/externalLabsDefaults'
import type { ExternalLab, ExternalLabSendRecord, PatientDetail, Protocol, ProtocolService } from '../../types'

const EXTERNAL_LABS_KEY = 'cetka-external-labs'
const SENDS_KEY = 'cetka-external-lab-sends'

const today = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function loadLabs(): ExternalLab[] {
  try {
    const raw = localStorage.getItem(EXTERNAL_LABS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ExternalLab[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  return defaultExternalLabs
}

function loadSends(): ExternalLabSendRecord[] {
  try {
    const raw = localStorage.getItem(SENDS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ExternalLabSendRecord[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return []
}

function saveSends(sends: ExternalLabSendRecord[]) {
  try {
    localStorage.setItem(SENDS_KEY, JSON.stringify(sends))
  } catch {
    // ignore
  }
}

const protocolDateOptions = ['Tümü', 'Bugün', 'Dün', 'Son 7 Gün', 'Son 30 Gün', 'Özel']
const sampleStatusOptions = ['Tümü', ...statusOptions.filter((s) => s !== 'Tümü')]

const sendableStatuses = ['Barkod Verildi', 'İşlem Bekliyor', 'Numune Kabul', 'Sonuç Bekleniyor']

export function ExternalLabSendNew() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { patients } = usePatients()
  const { protocols, updateServiceInProtocol } = useProtocols()
  const { activeCompanies } = useCompanies()
  const { examTypes } = useExamTypes()
  const { catalog, groups } = useServices()

  const [activeTab, setActiveTab] = useState<'hasta' | 'hizmet' | 'son'>('hasta')

  // Filtreler
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [protocolDate, setProtocolDate] = useState('Bugün')
  const [companyFilter, setCompanyFilter] = useState('Tümü')
  const [examTypeFilter, setExamTypeFilter] = useState('Tümü')
  const [groupFilter, setGroupFilter] = useState('Tümü')
  const [serviceFilter, setServiceFilter] = useState('Tümü')
  const [sampleStatus, setSampleStatus] = useState('Tümü')
  const [tcFilter, setTcFilter] = useState('')
  const [protocolNoFilter, setProtocolNoFilter] = useState('')
  const [barcodeFilter, setBarcodeFilter] = useState('')

  // Seçimler
  const [selectedPatients, setSelectedPatients] = useState<Set<number>>(new Set())
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set())
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null)
  const [sendNote, setSendNote] = useState('')

  // Hizmet sekmesi filtreleri
  const [serviceGroupFilter, setServiceGroupFilter] = useState('Tümü')
  const [serviceNameFilter, setServiceNameFilter] = useState('Tümü')
  const [serviceStatusFilter, setServiceStatusFilter] = useState('Tümü')
  const [serviceSearch, setServiceSearch] = useState('')

  // Dış lab listesini localStorage'dan canlı tut
  const [allLabs, setAllLabs] = useState<ExternalLab[]>(loadLabs)

  useEffect(() => {
    setAllLabs(loadLabs())
  }, [activeTab])

  useEffect(() => {
    const refreshLabs = () => setAllLabs(loadLabs())
    window.addEventListener('focus', refreshLabs)
    const interval = setInterval(refreshLabs, 1000)
    return () => {
      window.removeEventListener('focus', refreshLabs)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (protocolDate === 'Bugün') {
      setStartDate(today())
      setEndDate(today())
    } else if (protocolDate === 'Dün') {
      const d = daysAgo(1)
      setStartDate(d)
      setEndDate(d)
    } else if (protocolDate === 'Son 7 Gün') {
      setStartDate(daysAgo(7))
      setEndDate(today())
    } else if (protocolDate === 'Son 30 Gün') {
      setStartDate(daysAgo(30))
      setEndDate(today())
    }
  }, [protocolDate])

  const filteredProtocols = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`).getTime()
    const end = new Date(`${endDate}T23:59:59`).getTime()

    return protocols.filter((p: Protocol) => {
      const pd = new Date(p.protocolDate).getTime()
      if (pd < start || pd > end) return false

      const patient = patients.find((pt) => pt.id === p.patientId)
      if (!patient) return false

      if (companyFilter !== 'Tümü' && p.company !== companyFilter) return false
      if (examTypeFilter !== 'Tümü' && p.examType !== examTypeFilter) return false

      const hasMatchingService = p.services.some((s) => {
        if (groupFilter !== 'Tümü' && s.group !== groupFilter) return false
        if (serviceFilter !== 'Tümü' && s.name !== serviceFilter) return false
        if (sampleStatus !== 'Tümü' && s.status !== sampleStatus) return false
        if (barcodeFilter && !s.barcode.includes(barcodeFilter)) return false
        return true
      })
      if (!hasMatchingService) return false

      if (tcFilter && !patient.tc.includes(tcFilter)) return false
      if (protocolNoFilter && !p.protocolNo.includes(protocolNoFilter)) return false

      return true
    })
  }, [
    protocols,
    patients,
    startDate,
    endDate,
    companyFilter,
    examTypeFilter,
    groupFilter,
    serviceFilter,
    sampleStatus,
    tcFilter,
    protocolNoFilter,
    barcodeFilter,
  ])

  const patientRows = useMemo(() => {
    const map = new Map<number, { patient: PatientDetail; protocols: Protocol[] }>()
    filteredProtocols.forEach((p) => {
      const patient = patients.find((pt) => pt.id === p.patientId)
      if (!patient) return
      if (!map.has(patient.id)) {
        map.set(patient.id, { patient, protocols: [] })
      }
      map.get(patient.id)!.protocols.push(p)
    })
    return Array.from(map.values()).sort((a, b) => a.patient.name.localeCompare(b.patient.name, 'tr-TR'))
  }, [filteredProtocols, patients])

  const allPatientsSelected = patientRows.length > 0 && selectedPatients.size === patientRows.length

  const togglePatient = (patientId: number) => {
    setSelectedPatients((prev) => {
      const next = new Set(prev)
      if (next.has(patientId)) {
        next.delete(patientId)
      } else {
        next.add(patientId)
      }
      return next
    })
  }

  const toggleAllPatients = () => {
    if (allPatientsSelected) {
      setSelectedPatients(new Set())
    } else {
      setSelectedPatients(new Set(patientRows.map((r) => r.patient.id)))
    }
  }

  const candidateServices = useMemo(() => {
    const rows: { service: ProtocolService; protocol: Protocol; patient: PatientDetail }[] = []
    const selectedPatientIds = selectedPatients
    patientRows.forEach(({ patient, protocols }) => {
      if (!selectedPatientIds.has(patient.id)) return
      protocols.forEach((p) => {
        p.services.forEach((s) => {
          if (!sendableStatuses.includes(s.status)) return
          if (serviceGroupFilter !== 'Tümü' && s.group !== serviceGroupFilter) return
          if (serviceNameFilter !== 'Tümü' && s.name !== serviceNameFilter) return
          if (serviceStatusFilter !== 'Tümü' && s.status !== serviceStatusFilter) return
          if (serviceSearch && !s.name.toLowerCase().includes(serviceSearch.toLowerCase())) return
          rows.push({ service: s, protocol: p, patient })
        })
      })
    })
    return rows.sort((a, b) => a.patient.name.localeCompare(b.patient.name, 'tr-TR'))
  }, [patientRows, selectedPatients, serviceGroupFilter, serviceNameFilter, serviceStatusFilter, serviceSearch])

  const allServicesSelected = candidateServices.length > 0 && selectedServices.size === candidateServices.length

  const toggleService = (serviceId: number) => {
    setSelectedServices((prev) => {
      const next = new Set(prev)
      if (next.has(serviceId)) {
        next.delete(serviceId)
      } else {
        next.add(serviceId)
      }
      return next
    })
  }

  const toggleAllServices = () => {
    if (allServicesSelected) {
      setSelectedServices(new Set())
    } else {
      setSelectedServices(new Set(candidateServices.map((r) => r.service.id)))
    }
  }

  const selectedServiceDetails = useMemo(() => {
    return candidateServices.filter((r) => selectedServices.has(r.service.id))
  }, [candidateServices, selectedServices])

  const selectedPatientsInServices = useMemo(() => {
    return new Set(selectedServiceDetails.map((r) => r.patient.id))
  }, [selectedServiceDetails])

  const shiftDay = (days: number) => {
    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)
    start.setDate(start.getDate() + days)
    end.setDate(end.getDate() + days)
    setStartDate(formatDateInput(start))
    setEndDate(formatDateInput(end))
    setProtocolDate('Özel')
  }

  const handleNext = () => {
    if (activeTab === 'hasta') {
      if (selectedPatients.size === 0) return
      setActiveTab('hizmet')
    } else if (activeTab === 'hizmet') {
      if (selectedServices.size === 0) return
      setActiveTab('son')
    }
  }

  const handleBack = () => {
    if (activeTab === 'son') setActiveTab('hizmet')
    else if (activeTab === 'hizmet') setActiveTab('hasta')
  }

  const activeLabs = useMemo(() => {
    const all = allLabs.filter((l) => l.active)
    if (selectedServiceDetails.length === 0) return all

    // Seçilen hizmetlerin gruplarının labId kesişimini bul
    const selectedGroupNames = new Set(selectedServiceDetails.map((r) => r.service.group))
    const selectedGroupLabIds: number[][] = []
    selectedGroupNames.forEach((name) => {
      const group = groups.find((g) => g.name === name)
      if (group?.labIds?.length) {
        selectedGroupLabIds.push(group.labIds)
      }
    })

    if (selectedGroupLabIds.length === 0) return all

    const intersection = selectedGroupLabIds.reduce((acc, ids) =>
      acc.filter((id) => ids.includes(id))
    )
    return all.filter((l) => intersection.includes(l.id))
  }, [allLabs, groups, selectedServiceDetails])

  // Seçili lab'ın ilgili gruplarını ve bu gruplara uyan hizmetleri belirle
  const validForSelectedLab = useMemo(() => {
    if (!selectedLabId) return []
    return selectedServiceDetails.filter((r) => {
      const group = groups.find((g) => g.name === r.service.group)
      if (!group?.labIds?.length) return true
      return group.labIds.includes(selectedLabId)
    })
  }, [groups, selectedLabId, selectedServiceDetails])

  const invalidForSelectedLab = useMemo(() => {
    if (!selectedLabId) return []
    return selectedServiceDetails.filter((r) => !validForSelectedLab.some((v) => v.service.id === r.service.id))
  }, [selectedLabId, selectedServiceDetails, validForSelectedLab])

  const validPatientsInServices = useMemo(() => {
    return new Set(validForSelectedLab.map((r) => r.patient.id))
  }, [validForSelectedLab])

  // Seçili lab artık uygun değilse sıfırla
  useEffect(() => {
    if (selectedLabId && activeLabs.length > 0 && !activeLabs.some((l) => l.id === selectedLabId)) {
      setSelectedLabId(null)
    }
  }, [activeLabs, selectedLabId])

  const handleSend = () => {
    if (!selectedLabId || validForSelectedLab.length === 0) return
    const lab = activeLabs.find((l) => l.id === selectedLabId)
    if (!lab) return

    const services = validForSelectedLab.map((r) => ({
      serviceId: r.service.id,
      protocolId: r.protocol.id,
      patientName: r.patient.name,
      serviceName: r.service.name,
      barcode: r.service.barcode,
      protocolNo: r.protocol.protocolNo,
    }))

    const existing = loadSends()
    const nextId = existing.length > 0 ? Math.max(...existing.map((s) => s.id)) + 1 : 1
    const newSend: ExternalLabSendRecord = {
      id: nextId,
      sendDate: new Date().toISOString(),
      externalLabId: lab.id,
      externalLabName: lab.name,
      patientCount: validPatientsInServices.size,
      serviceCount: validForSelectedLab.length,
      status: 'Gönderildi',
      sentBy: currentUser?.displayName ?? 'SYSTEM',
      services,
    }

    // Servis durumlarını Sonuç Bekleniyor yap
    validForSelectedLab.forEach((r) => {
      if (r.service.status !== 'Sonuç Bekleniyor') {
        updateServiceInProtocol(r.protocol.id, r.service.id, { status: 'Sonuç Bekleniyor', lab: lab.name })
      } else {
        updateServiceInProtocol(r.protocol.id, r.service.id, { lab: lab.name })
      }
    })

    saveSends([newSend, ...existing])
    navigate('/laboratuvar/dis-lab-gonderim')
  }

  const companyOptions = ['Tümü', ...activeCompanies.map((c) => c.name).sort((a, b) => a.localeCompare(b, 'tr-TR'))]
  const examTypeOptions = ['Tümü', ...examTypes.map((e) => e.name).sort((a, b) => a.localeCompare(b, 'tr-TR'))]
  const groupOptions = ['Tümü', ...groups.map((g) => g.name).sort((a, b) => a.localeCompare(b, 'tr-TR'))]
  const serviceOptions = useMemo(() => {
    const names = new Set<string>()
    catalog.forEach((s) => {
      if (groupFilter === 'Tümü' || s.group === groupFilter) names.add(s.name)
    })
    filteredProtocols.forEach((p) => {
      p.services.forEach((s) => {
        if (groupFilter === 'Tümü' || s.group === groupFilter) names.add(s.name)
      })
    })
    return ['Tümü', ...Array.from(names).sort((a, b) => a.localeCompare(b, 'tr-TR'))]
  }, [catalog, filteredProtocols, groupFilter])

  const serviceGroupOptions = ['Tümü', ...groups.map((g) => g.name).sort((a, b) => a.localeCompare(b, 'tr-TR'))]
  const serviceNameOptions = useMemo(() => {
    const names = new Set<string>()
    candidateServices.forEach((r) => names.add(r.service.name))
    return ['Tümü', ...Array.from(names).sort((a, b) => a.localeCompare(b, 'tr-TR'))]
  }, [candidateServices])

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Dış Laboratuvar</h1>
      </div>

      {/* Tablar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-1.5 flex items-center gap-1">
        <button
          onClick={() => setActiveTab('hasta')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'hasta'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Hasta Seçimi
        </button>
        <button
          onClick={() => setActiveTab('hizmet')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'hizmet'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          Hizmet Seçimi
        </button>
        <button
          onClick={() => setActiveTab('son')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'son'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Son Kontroller
        </button>
      </div>

      {activeTab === 'hasta' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
          {/* Sol: Hasta Sorgula */}
          <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-fit">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Hasta Sorgula</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Tarih Aralığı</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => shiftDay(-1)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setProtocolDate('Özel')
                    }}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setProtocolDate('Özel')
                    }}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => shiftDay(1)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Protokol Tarihi</label>
                <select
                  value={protocolDate}
                  onChange={(e) => setProtocolDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  {protocolDateOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Firma</label>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  {companyOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Muayene Türü</label>
                <select
                  value={examTypeFilter}
                  onChange={(e) => setExamTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  {examTypeOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Hizmet Grupları</label>
                <select
                  value={groupFilter}
                  onChange={(e) => {
                    setGroupFilter(e.target.value)
                    setServiceFilter('Tümü')
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  {groupOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Hizmet</label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  {serviceOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Numune Durumu</label>
                <select
                  value={sampleStatus}
                  onChange={(e) => setSampleStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  {sampleStatusOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="TC Kimlik No"
                  value={tcFilter}
                  onChange={(e) => setTcFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Protokol No"
                  value={protocolNoFilter}
                  onChange={(e) => setProtocolNoFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Barkod No"
                  value={barcodeFilter}
                  onChange={(e) => setBarcodeFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors">
                <Search className="w-4 h-4" />
                Sorgula
              </button>
            </div>
          </div>

          {/* Sağ: Hasta Listesi */}
          <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Hasta Listesi</h2>
              <span className="text-xs text-slate-500">{patientRows.length} hasta</span>
            </div>
            <div className="overflow-x-auto flex-1 min-h-0">
              <table className="table-fixed w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allPatientsSelected}
                        onChange={toggleAllPatients}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-3 py-2.5 font-medium">Hasta Adı</th>
                    <th className="px-3 py-2.5 font-medium w-28">TC</th>
                    <th className="px-3 py-2.5 font-medium">Firma</th>
                    <th className="px-3 py-2.5 font-medium w-28">Protokol No</th>
                    <th className="px-3 py-2.5 font-medium w-36">Tarih</th>
                    <th className="px-3 py-2.5 font-medium w-24 text-center">Hizmet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patientRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                        Sorgu kriterlerine uygun hasta bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    patientRows.map(({ patient, protocols }) =>
                      protocols.map((p, idx) => (
                        <tr key={`${patient.id}-${p.id}`} className="hover:bg-slate-50 transition-colors">
                          {idx === 0 && (
                            <td
                              rowSpan={protocols.length}
                              className="px-3 py-2.5 text-center border-r border-slate-100"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPatients.has(patient.id)}
                                onChange={() => togglePatient(patient.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                          )}
                          {idx === 0 && (
                            <td
                              rowSpan={protocols.length}
                              className="px-3 py-2.5 text-slate-800 font-medium border-r border-slate-100"
                            >
                              {patient.name}
                            </td>
                          )}
                          {idx === 0 && (
                            <td
                              rowSpan={protocols.length}
                              className="px-3 py-2.5 text-slate-600 border-r border-slate-100"
                            >
                              {patient.tc}
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-slate-600 truncate" title={p.company}>
                            {p.company}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 font-medium">{p.protocolNo}</td>
                          <td className="px-3 py-2.5 text-slate-600">{formatDateTime(p.protocolDate)}</td>
                          <td className="px-3 py-2.5 text-center text-slate-700 font-medium">
                            {p.services.filter((s) => {
                              if (groupFilter !== 'Tümü' && s.group !== groupFilter) return false
                              if (serviceFilter !== 'Tümü' && s.name !== serviceFilter) return false
                              if (sampleStatus !== 'Tümü' && s.status !== sampleStatus) return false
                              if (barcodeFilter && !s.barcode.includes(barcodeFilter)) return false
                              return true
                            }).length}
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={handleNext}
                disabled={selectedPatients.size === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                İleri
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hizmet' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
          {/* Sol: Hizmet Filtreleri */}
          <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-fit">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Hizmet Sorgula</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Hizmet Grubu</label>
                <select
                  value={serviceGroupFilter}
                  onChange={(e) => {
                    setServiceGroupFilter(e.target.value)
                    setServiceNameFilter('Tümü')
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  {serviceGroupOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Hizmet</label>
                <select
                  value={serviceNameFilter}
                  onChange={(e) => setServiceNameFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  {serviceNameOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Numune Durumu</label>
                <select
                  value={serviceStatusFilter}
                  onChange={(e) => setServiceStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  {sampleStatusOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Ara</label>
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
                  <FileSearch className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Test adı ara..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{selectedPatients.size}</span> hasta seçildi
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  <span className="font-semibold text-slate-800">{candidateServices.length}</span> gönderilebilir hizmet bulundu
                </p>
              </div>
            </div>
          </div>

          {/* Sağ: Hizmet Listesi */}
          <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Hizmet Listesi</h2>
              <span className="text-xs text-slate-500">
                {selectedServices.size} / {candidateServices.length} seçildi
              </span>
            </div>
            <div className="overflow-x-auto flex-1 min-h-0">
              <table className="table-fixed w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allServicesSelected}
                        onChange={toggleAllServices}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-3 py-2.5 font-medium w-36">Hasta Adı</th>
                    <th className="px-3 py-2.5 font-medium w-28">Protokol No</th>
                    <th className="px-3 py-2.5 font-medium">Hizmet Adı</th>
                    <th className="px-3 py-2.5 font-medium w-28">Grup</th>
                    <th className="px-3 py-2.5 font-medium w-24">Barkod</th>
                    <th className="px-3 py-2.5 font-medium w-28">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidateServices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                        Seçilen hastalara ait gönderilebilir hizmet bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    candidateServices.map(({ service, protocol, patient }) => (
                      <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedServices.has(service.id)}
                            onChange={() => toggleService(service.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-slate-800 font-medium truncate" title={patient.name}>
                          {patient.name}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 font-medium">{protocol.protocolNo}</td>
                        <td className="px-3 py-2.5 text-slate-600 truncate" title={service.name}>
                          {service.name}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{service.group}</td>
                        <td className="px-3 py-2.5 text-slate-700 font-medium">{service.barcode}</td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200 whitespace-nowrap">
                            {service.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleBack}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Geri
              </button>
              <button
                onClick={handleNext}
                disabled={selectedServices.size === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                İleri
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'son' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
          <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              Son Kontroller
            </h2>

            <div className="space-y-4 max-w-xl">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <p className="text-sm text-slate-600">
                  Seçilen Hasta: <span className="font-semibold text-slate-800">{selectedPatientsInServices.size}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Seçilen Hizmet: <span className="font-semibold text-slate-800">{selectedServices.size}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Gönderilebilir Hizmet: <span className="font-semibold text-emerald-700">{validForSelectedLab.length}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Gönderim Tarihi: <span className="font-semibold text-slate-800">{formatDateTime(new Date().toISOString())}</span>
                </p>
              </div>

              {invalidForSelectedLab.length > 0 && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-sm text-red-800 font-medium mb-2">
                    Seçilen lab bu hizmetlere gönderilemez ({invalidForSelectedLab.length} hizmet):
                  </p>
                  <ul className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                    {invalidForSelectedLab.map((r) => (
                      <li key={r.service.id}>
                        {r.patient.name} — {r.service.name} ({r.service.group})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Dış Laboratuvar Seçimi</label>
                <select
                  value={selectedLabId ?? ''}
                  onChange={(e) => setSelectedLabId(Number(e.target.value) || null)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Laboratuvar seçiniz</option>
                  {activeLabs.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Gönderim Notu</label>
                <textarea
                  value={sendNote}
                  onChange={(e) => setSendNote(e.target.value)}
                  rows={3}
                  placeholder="Gönderim ile ilgili not ekleyin..."
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-800 font-medium">
                  {selectedLabId && activeLabs.find((l) => l.id === selectedLabId)?.name} laboratuvarına{' '}
                  {validForSelectedLab.length} hizmet gönderilecek.
                  {invalidForSelectedLab.length > 0 && ` ${invalidForSelectedLab.length} hizmet bu lab ile gönderilmeyecek.`}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleBack}
                  className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
                >
                  Geri
                </button>
                <button
                  onClick={handleSend}
                  disabled={!selectedLabId || validForSelectedLab.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Gönder
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-fit">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Seçilen Hizmetler</h3>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {selectedServiceDetails.map(({ service, patient }) => (
                <div key={service.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <p className="font-medium text-slate-700 truncate" title={service.name}>
                    {service.name}
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    {patient.name} — {service.barcode}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
