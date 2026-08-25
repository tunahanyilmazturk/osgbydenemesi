import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProtocols } from '@/state/ProtocolsContext'
import { usePatients } from '@/state/PatientsContext'
import { useServices } from '@/state/ServicesContext'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'
import { useConfirm } from '@/state/ConfirmContext'
import { AudiometryModal } from '@/features/examinations/audiometry/components/AudiometryModal'
import { EyeExaminationModal } from '@/features/examinations/eye-examination/components/EyeExaminationModal'
import { Ek2Modal } from '@/features/examinations/ek2/components/Ek2Modal'
import { TetanusVaccinationModal } from '@/features/vaccinations/tetanus/components/TetanusVaccinationModal'
import { formatDateLocal, nowLocalDateTime } from '@/shared/lib/date'
import type { Ek2Data, PatientDetail, ProtocolService } from '@/shared/types'
import { SmsPreviewModal, type SmsPreviewItem } from '@/pages/lab/components/SmsPreviewModal'
import { useCompanies, type CompanyService } from '@/state/CompaniesContext'
import {
  resolveTubeTypeName,
  filterAndSortProtocols,
  computeServiceStats,
  computeProtocolStats,
  computeVezneSummary,
  buildFilteredAddServiceList,
} from '@/pages/lab/lib/labUtils'
import { BarcodeModal, type BarcodeTestItem } from '@/pages/lab/components/BarcodeModal'
import { PatientHeader } from '@/pages/lab/components/PatientHeader'
import { ServiceStatusSummary } from '@/pages/lab/components/ServiceStatusSummary'
import { LabActionsToolbar } from '@/pages/lab/components/LabActionsToolbar'
import { LabServiceContextMenu } from '@/pages/lab/components/LabServiceContextMenu'
import { NoteModal } from '@/pages/lab/components/NoteModal'
import { RejectionModal } from '@/pages/lab/components/RejectionModal'
import { AddServiceModal } from '@/pages/lab/components/AddServiceModal'
import { PatientEditModal } from '@/pages/lab/components/PatientEditModal'
import { LabFilterPanel, type LabFilters } from '@/pages/lab/components/LabFilterPanel'
import { ProtocolListPanel } from '@/pages/lab/components/ProtocolListPanel'
import { ResultsTable } from '@/pages/lab/components/ResultsTable'
import { useLabPrintHandlers } from '@/pages/lab/hooks/useLabPrintHandlers'
import { useLabBarcodeHandlers } from '@/pages/lab/hooks/useLabBarcodeHandlers'
import { useLabNoteHandlers } from '@/pages/lab/hooks/useLabNoteHandlers'
import { useLabPdfHandlers } from '@/pages/lab/hooks/useLabPdfHandlers'
import { useLabServiceHandlers } from '@/pages/lab/hooks/useLabServiceHandlers'
import { useLabSpecialModalHandlers } from '@/pages/lab/hooks/useLabSpecialModalHandlers'
import { useLabSelectionHandlers } from '@/pages/lab/hooks/useLabSelectionHandlers'
import { useLabContextMenu } from '@/pages/lab/hooks/useLabContextMenu'

export function Lab() {
  const navigate = useNavigate()
  const { protocols, updateServiceInProtocol, addServiceToProtocol, removeServiceFromProtocol } = useProtocols()
  const { patients, updatePatient } = usePatients()
  const { catalog, groups, tubeTypes, packages } = useServices()
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
  const [isTetanusModalOpen, setIsTetanusModalOpen] = useState(false)
  const [selectedTetanusService, setSelectedTetanusService] = useState<ProtocolService | null>(null)
  const [isEk2ModalOpen, setIsEk2ModalOpen] = useState(false)
  const [selectedEk2Service, setSelectedEk2Service] = useState<ProtocolService | null>(null)
  const [showPrintDropdown, setShowPrintDropdown] = useState(false)
  const [showMoreActions, setShowMoreActions] = useState(false)
  const [isPrintingAll, setIsPrintingAll] = useState(false)
  const [isZippingAll, setIsZippingAll] = useState(false)
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false)
  const [selectedBarcodeTests, setSelectedBarcodeTests] = useState<Set<string>>(new Set())
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false)
  const [addServiceSearch, setAddServiceSearch] = useState('')
  const [addServiceTab, setAddServiceTab] = useState<'company' | 'packages' | 'all'>('company')
  const [sortConfig, setSortConfig] = useState<{ field: 'protocolNo' | 'patientName' | 'company' | 'tc'; direction: 'asc' | 'desc' } | null>(null)
  const todayStr = formatDateLocal(new Date())
  const currentTimestamp = new Date().getTime()
  const [dateStart, setDateStart] = useState(todayStr)
  const [dateEnd, setDateEnd] = useState(todayStr)

  const [protocolPage, setProtocolPage] = useState(1)
  const [protocolPageSize, setProtocolPageSize] = useState(10)
  const [servicePage, setServicePage] = useState(1)
  const [servicePageSize, setServicePageSize] = useState(10)
  const [serviceStatusFilter, setServiceStatusFilter] = useState<string | null>(null)
  const [resultsTab, setResultsTab] = useState<'results' | 'vezne'>('results')

  const [filters, setFilters] = useState<LabFilters>({
    company: [],
    examType: [],
    group: [],
    service: [],
    status: [],
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
    () => catalog.filter((service) => service.isActive).map((service) => service.name),
    [catalog]
  )

  const statusOptions = useMemo(
    () => ['Barkod Verildi', 'İşlem Bekliyor', 'Numune Kabul', 'Numune Red', 'Sonuç Bekleniyor', 'Sonuç Girildi', 'Onaylandı'],
    []
  )

  const filteredProtocols = useMemo(() => {
    return filterAndSortProtocols(protocols, patients, filters, sortConfig, dateStart, dateEnd)
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
  const safeProtocolPage = Math.min(protocolPage, Math.max(1, totalProtocolPagesAll))
  const paginatedProtocolsAll = useMemo(
    () => searchFilteredProtocols.slice((safeProtocolPage - 1) * protocolPageSize, safeProtocolPage * protocolPageSize),
    [searchFilteredProtocols, safeProtocolPage, protocolPageSize]
  )

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

  const { selectAllServices, selectAllProtocols, handleProtocolCardClick, handleSort, handleRowClick } = useLabSelectionHandlers({
    selectedProtocolId,
    selectedProtocolIds,
    selectedServiceIds,
    lastSelectedProtocolId,
    lastSelectedServiceId,
    selectedServices,
    searchFilteredProtocols,
    protocols,
    patients,
    setSelectedProtocolId,
    setSelectedProtocolIds,
    setSelectedServiceIds,
    setLastSelectedProtocolId,
    setLastSelectedServiceId,
    setServicePage,
    setServiceStatusFilter,
    setSortConfig,
    showToast,
  })

  // Seçili protokollerin tüm hizmetlerini getir
  const { barcodeTestList, handlePrintSelectedBarcodesByTest, handlePrintSelectedBarcodes, handlePrintAllBarcodesForProtocol } = useLabBarcodeHandlers({
    selectedProtocolIds,
    selectedProtocolId,
    selectedProtocol,
    selectedPatient: selectedPatient ?? undefined,
    protocols,
    patients,
    catalog,
    groups,
    tubeTypes,
    selectedBarcodeTests,
    selectedServiceIds,
    selectedServices,
    updateServiceInProtocol,
    showToast,
    setIsBarcodeModalOpen,
  })

  const sortOptions: Array<{ field: 'protocolNo' | 'patientName' | 'company' | 'tc'; label: string }> = [
    { field: 'protocolNo', label: 'Protokol No' },
    { field: 'patientName', label: 'Hasta Adı' },
    { field: 'company', label: 'Firma' },
    { field: 'tc', label: 'TC No' },
  ]

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
  const vezneSummary = useMemo(() => computeVezneSummary(selectedProtocol), [selectedProtocol])

  const {
    handleAccept,
    handleCancelAccept,
    handleApprove,
    handleSendSms,
    handleCancelApprove,
    handleResultChange,
    handleQuickAddService,
  } = useLabServiceHandlers({
    selectedProtocol,
    selectedProtocolIds,
    selectedServiceIds,
    selectedServices,
    protocols,
    patients,
    catalog,
    companyServiceMap,
    companyList,
    selectedNamesSet,
    currentUser,
    updateServiceInProtocol,
    addServiceToProtocol,
    showToast,
    confirm,
    setSelectedServiceIds,
    setSelectedProtocolIds,
    setPendingSmsList,
    setIsSmsModalOpen,
    pendingSmsList,
  })

  // Filtrelenmiş katalog/paket listesi
  const filteredAddServiceList = useMemo(() => {
    return buildFilteredAddServiceList(selectedProtocol, addServiceSearch, addServiceTab, selectedCompanyServices, catalog, packages, selectedNamesSet)
  }, [catalog, packages, addServiceSearch, addServiceTab, selectedCompanyServices, selectedProtocol, selectedNamesSet])

  const { handlePrintSelectedResults, handleDownloadResultsAsZip, handleDownloadResultsAsZipByCompany } = useLabPrintHandlers({
    selectedProtocolIds,
    selectedProtocolId,
    protocols,
    patients,
    users,
    setShowPrintDropdown,
    setIsPrintingAll,
    setIsZippingAll,
    showToast,
  })

  // PDF yükleme — handler'lar hook'ta
  const {
    pdfUploadRef, bulkPdfUploadRef, setContextServiceId,
    openPdfViewer, handleContextMenuPdfUpload, handleBulkPdfUpload,
  } = useLabPdfHandlers({
    selectedProtocolId: selectedProtocol?.id ?? null,
    selectedServices,
    selectedServiceIds,
    currentUser,
    updateServiceInProtocol,
    showToast,
    setContextMenu: (menu) => setContextMenu(menu),
  })

  // Özel modal handler'ları (odyometri/göz tarama)
  const { handleRowDoubleClick: handleExistingSpecialRowDoubleClick, handleAudiometrySave, handleEyeExaminationSave, handleTetanusSave } = useLabSpecialModalHandlers({
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
  })

  const handleRowDoubleClick = (serviceId: number) => {
    const service = selectedServices.find((item) => item.id === serviceId)
    if (service?.name.toLocaleUpperCase('tr-TR').includes('EK-2')) {
      setSelectedEk2Service(service)
      setIsEk2ModalOpen(true)
      return
    }
    handleExistingSpecialRowDoubleClick(serviceId)
  }

  const selectedCompany = companyList.find((company) => company.name === selectedProtocol?.company)
  const ek2SourceServices = useMemo(() => {
    if (!selectedProtocol) return []
    return [...selectedProtocol.services].sort((left, right) => (
      (right.approvedAt || right.processDate || '').localeCompare(left.approvedAt || left.processDate || '')
    ))
  }, [selectedProtocol])

  const previousEk2Data = useMemo(() => {
    if (!selectedPatient || !selectedProtocol) return undefined
    const previousServices = protocols
      .filter((protocol) => protocol.patientId === selectedPatient.id && protocol.id !== selectedProtocol.id)
      .sort((a, b) => b.protocolDate.localeCompare(a.protocolDate))
      .flatMap((protocol) => protocol.services)
    for (const service of previousServices) {
      if (!service.ek2Data) continue
      try { return JSON.parse(service.ek2Data) as Ek2Data } catch { /* geçersiz eski kayıt atlanır */ }
    }
    return undefined
  }, [protocols, selectedPatient, selectedProtocol])

  // Test notu — note/rejection handler'ları hook'ta
  const {
    noteModal, setNoteModal, noteDraft, setNoteDraft,
    rejectionModal, setRejectionModal, rejectionDraft, setRejectionDraft,
    noteTemplates, setNoteTemplates, newTemplateName, setNewTemplateName, showTemplateForm, setShowTemplateForm,
    addTemplate, removeTemplate, openNoteModal, openRejectionModal,
    handleRejectSample, handleSaveNote,
  } = useLabNoteHandlers({
    selectedProtocolId: selectedProtocol?.id ?? null,
    selectedServices,
    selectedServiceIds,
    currentUser,
    updateServiceInProtocol,
    showToast,
    setContextMenu: () => setContextMenu(null),
    setSelectedServiceIds,
  })

  // Sağ tuş context menu
  const { contextMenu, setContextMenu, handleContextMenu } = useLabContextMenu()

  const hasSelection = selectedServiceIds.length > 0 || selectedProtocolIds.length > 1

  const serviceStats = useMemo(() => computeServiceStats(selectedProtocol?.services ?? []), [selectedProtocol])

  // Her protokol için durum özeti
  const protocolStats = useMemo(() => computeProtocolStats(protocols), [protocols])
  return (
    <div className="h-full flex flex-col min-h-0 gap-2.5">
      {/* Filtre paneli — 2 sütun: Sol tarih, Sağ filtreler */}
      <LabFilterPanel
        filters={filters}
        onFiltersChange={(nextFilters) => { setFilters(nextFilters); setProtocolPage(1) }}
        dateStart={dateStart}
        dateEnd={dateEnd}
        todayStr={todayStr}
        onDateStartChange={(value) => { setDateStart(value); setProtocolPage(1) }}
        onDateEndChange={(value) => { setDateEnd(value); setProtocolPage(1) }}
        companies={companies}
        examTypes={examTypes}
        groupNames={groupNames}
        serviceNames={serviceNames}
        statusOptions={statusOptions}
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Center panel */}
        <div className="lg:col-span-8 lg:order-2 flex flex-col min-h-0 gap-2.5">
          {selectedProtocol && selectedPatient ? (
            <>
              {/* Patient header */}
              <PatientHeader
                patient={selectedPatient}
                protocol={selectedProtocol}
                onProfileCard={() => navigate(`/hasta-kayit/protokol/${selectedPatient.id}/${selectedProtocol.id}`)}
                onEdit={() => {
                  setPatientForm({ ...selectedPatient })
                  setIsPatientModalOpen(true)
                }}
                onAddService={() => {
                  setAddServiceSearch('')
                  setAddServiceTab('company')
                  setIsAddServiceModalOpen(true)
                }}
              />

              {/* Summary counts + Protokol/ExamType rozetleri */}
              <ServiceStatusSummary
                protocolNo={selectedProtocol.protocolNo}
                examType={selectedProtocol.examType}
                stats={serviceStats}
                activeFilter={serviceStatusFilter}
                onFilterChange={setServiceStatusFilter}
              />

              {/* Actions */}
              <LabActionsToolbar
                selectedServiceIds={selectedServiceIds}
                hasSelection={hasSelection}
                selectedProtocolIds={selectedProtocolIds}
                selectedProtocol={selectedProtocol}
                showMoreActions={showMoreActions}
                onToggleMoreActions={() => setShowMoreActions(!showMoreActions)}
                onCloseMoreActions={() => setShowMoreActions(false)}
                onSelectAllServices={selectAllServices}
                onPrintSelectedBarcodes={handlePrintSelectedBarcodes}
                onPrintAllBarcodesForProtocol={handlePrintAllBarcodesForProtocol}
                onAccept={handleAccept}
                onCancelAccept={handleCancelAccept}
                onApprove={handleApprove}
                onCancelApprove={handleCancelApprove}
                bulkPdfUploadRef={bulkPdfUploadRef}
                onBulkNote={() => {
                  const firstId = selectedServiceIds[0]
                  const service = selectedServices.find((s) => s.id === firstId)
                  if (service) {
                    setNoteDraft(service.note ?? '')
                    setNoteModal({ serviceId: firstId, serviceName: `${selectedServiceIds.length} test`, note: service.note ?? '' })
                  }
                  setShowMoreActions(false)
                }}
                onSendMail={() => {
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
              />

              {/* Results table + Vezne tab'ları */}
              <ResultsTable
                resultsTab={resultsTab}
                onResultsTabChange={setResultsTab}
                selectedServices={selectedServices}
                paginatedServices={paginatedServices}
                servicePage={servicePage}
                totalServicePages={totalServicePages}
                onServicePageChange={setServicePage}
                servicePageSize={servicePageSize}
                onServicePageSizeChange={setServicePageSize}
                selectedServiceIds={selectedServiceIds}
                selectedProtocol={selectedProtocol}
                vezneSummary={vezneSummary}
                catalog={catalog}
                groups={groups}
                tubeTypes={tubeTypes}
                onRowClick={handleRowClick}
                onRowDoubleClick={handleRowDoubleClick}
                onContextMenu={handleContextMenu}
                onResultChange={handleResultChange}
                onOpenPdfViewer={openPdfViewer}
                onOpenNoteModal={openNoteModal}
                resolveTubeTypeName={resolveTubeTypeName}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <p className="text-slate-500 text-sm">Görüntülemek için listeden bir protokol seçin.</p>
            </div>
          )}
        </div>

        {/* Left panel - Patient/Protocol list (card design) */}
        <ProtocolListPanel
          selectedProtocolIds={selectedProtocolIds}
          searchFilteredProtocols={searchFilteredProtocols}
          paginatedProtocolsAll={paginatedProtocolsAll}
          patients={patients}
          selectedProtocolId={selectedProtocolId}
          protocolStats={protocolStats}
          currentTimestamp={currentTimestamp}
          searchAll={searchAll}
          onSearchAllChange={(value) => { setSearchAll(value); setProtocolPage(1) }}
          sortConfig={sortConfig}
          sortOptions={sortOptions}
          onSort={(field) => { handleSort(field); setProtocolPage(1) }}
          onSortConfigChange={(value) => { setSortConfig(value); setProtocolPage(1) }}
          onSelectAllProtocols={selectAllProtocols}
          onProtocolCardClick={handleProtocolCardClick}
          protocolPageSize={protocolPageSize}
          onProtocolPageSizeChange={(value) => { setProtocolPageSize(value); setProtocolPage(1) }}
          protocolPage={safeProtocolPage}
          totalProtocolPagesAll={totalProtocolPagesAll}
          onProtocolPageChange={setProtocolPage}
          selectedProtocol={selectedProtocol}
          onOpenBarcodeModal={() => {
            setSelectedBarcodeTests(new Set())
            setIsBarcodeModalOpen(true)
          }}
          showPrintDropdown={showPrintDropdown}
          onTogglePrintDropdown={() => setShowPrintDropdown(!showPrintDropdown)}
          onClosePrintDropdown={() => setShowPrintDropdown(false)}
          isPrintingAll={isPrintingAll}
          isZippingAll={isZippingAll}
          onPrintSingle={handlePrintSelectedResults}
          onDownloadZip={handleDownloadResultsAsZip}
          onDownloadZipByCompany={handleDownloadResultsAsZipByCompany}
        />
      </div>

      <PatientEditModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        patient={selectedPatient ?? undefined}
        patientForm={patientForm}
        onPatientFormChange={setPatientForm}
        companies={companyList}
        onSave={(patientId, form) => {
          const tc = form.tc?.replace(/\D/g, '') ?? ''
          const name = form.name?.trim() ?? ''
          if (!name) {
            showToast('warning', 'Hasta adı gerekli')
            return
          }
          if (tc.length !== 11) {
            showToast('warning', 'Geçersiz T.C. Kimlik No', 'T.C. Kimlik No 11 rakamdan oluşmalıdır.')
            return
          }
          if (patients.some((patient) => patient.id !== patientId && patient.tc === tc)) {
            showToast('warning', 'T.C. Kimlik No kullanılıyor', 'Bu kimlik numarası başka bir hastaya ait.')
            return
          }
          const currentPatient = patients.find((patient) => patient.id === patientId)
          const company = form.company?.trim() ?? ''
          const knownCompany = company === 'Bireysel' || company === currentPatient?.company || companyList.some((item) => item.active && item.name === company)
          if (company && !knownCompany) {
            showToast('warning', 'Geçersiz firma', 'Firma Tanımları ekranındaki aktif firmalardan birini seçin.')
            return
          }
          updatePatient(patientId, { ...form, name, tc, company, email: form.email?.trim().toLowerCase() })
          setIsPatientModalOpen(false)
          showToast('success', 'Hasta bilgileri güncellendi')
        }}
      />

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

      <TetanusVaccinationModal
        isOpen={isTetanusModalOpen}
        onClose={() => {
          setIsTetanusModalOpen(false)
          setSelectedTetanusService(null)
        }}
        service={selectedTetanusService}
        patientName={selectedPatient?.name}
        patientTc={selectedPatient?.tc}
        company={selectedProtocol?.company}
        protocolNo={selectedProtocol?.protocolNo}
        onSave={handleTetanusSave}
      />

      {isEk2ModalOpen && <Ek2Modal
        isOpen
        onClose={() => {
          setIsEk2ModalOpen(false)
          setSelectedEk2Service(null)
        }}
        service={selectedEk2Service}
        patient={selectedPatient}
        protocol={selectedProtocol}
        company={selectedCompany}
        previousData={previousEk2Data}
        sourceServices={ek2SourceServices}
        onSave={(ek2Data, resultText, complete) => {
          if (!selectedProtocol || !selectedEk2Service) return
          updateServiceInProtocol(selectedProtocol.id, selectedEk2Service.id, {
            ek2Data,
            result: complete ? 'Tamamlandı' : 'Taslak',
            resultText,
            status: complete ? 'Sonuç Girildi' : 'Sonuç Bekleniyor',
            recordedBy: currentUser?.displayName ?? selectedEk2Service.recordedBy,
            processDate: nowLocalDateTime(),
          })
          setIsEk2ModalOpen(false)
          setSelectedEk2Service(null)
          showToast('success', complete ? 'EK-2 raporu tamamlandı' : 'EK-2 taslağı kaydedildi', selectedPatient?.name ?? '')
        }}
      />}

      {/* Sağ tuş context menu */}
      <LabServiceContextMenu
        contextMenu={contextMenu}
        services={selectedServices}
        selectedProtocol={selectedProtocol}
        currentUser={currentUser}
        pdfUploadRef={pdfUploadRef}
        setContextMenu={setContextMenu}
        setContextServiceId={setContextServiceId}
        openPdfViewer={openPdfViewer}
        openNoteModal={openNoteModal}
        openRejectionModal={openRejectionModal}
        handleRowDoubleClick={handleRowDoubleClick}
        updateServiceInProtocol={updateServiceInProtocol}
        showToast={showToast}
      />

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

      <RejectionModal
        isOpen={!!rejectionModal}
        serviceName={rejectionModal?.serviceName}
        rejectionDraft={rejectionDraft}
        onRejectionDraftChange={setRejectionDraft}
        onClose={() => { setRejectionModal(null); setRejectionDraft('') }}
        onConfirm={handleRejectSample}
      />

      {/* Not Ekleme Modalı — Sol sidebar şablonlar, sağ içerik */}
      <NoteModal
        noteModal={noteModal}
        noteDraft={noteDraft}
        showTemplateForm={showTemplateForm}
        newTemplateName={newTemplateName}
        noteTemplates={noteTemplates}
        onNoteDraftChange={setNoteDraft}
        onShowTemplateFormChange={setShowTemplateForm}
        onNewTemplateNameChange={setNewTemplateName}
        onAddTemplate={addTemplate}
        onRemoveTemplate={removeTemplate}
        onSaveTemplateFromDraft={() => {
          setNoteTemplates([...noteTemplates, noteDraft.trim()])
          showToast('success', 'Şablon eklendi', 'Yazdığınız not şablon olarak kaydedildi.')
        }}
        onDeleteNote={() => {
          if (selectedProtocol && noteModal) {
            updateServiceInProtocol(selectedProtocol.id, noteModal.serviceId, { note: undefined })
            showToast('info', 'Not silindi', noteModal.serviceName)
          }
          setNoteModal(null)
          setNoteDraft('')
        }}
        onClose={() => { setNoteModal(null); setNoteDraft(''); setShowTemplateForm(false); setNewTemplateName('') }}
        onSave={handleSaveNote}
      />

      {/* Hızlı Hizmet Ekleme Modalı — Modern tasarım */}
      <AddServiceModal
        isOpen={isAddServiceModalOpen}
        onClose={() => {
          setIsAddServiceModalOpen(false)
        }}
        selectedProtocol={selectedProtocol}
        selectedPatient={selectedPatient ?? undefined}
        addServiceTab={addServiceTab}
        onAddServiceTabChange={setAddServiceTab}
        addServiceSearch={addServiceSearch}
        onAddServiceSearchChange={setAddServiceSearch}
        filteredAddServiceList={filteredAddServiceList}
        companyServiceMap={companyServiceMap}
        onQuickAddService={handleQuickAddService}
        onUpdateServicePrice={(protocolId, serviceId, price, vatRate) =>
          updateServiceInProtocol(protocolId, serviceId, { price, vatRate })
        }
        onRemoveService={async (protocolId, serviceId, serviceName) => {
          const ok = await confirm({
            title: 'Hizmet Sil',
            message: `${serviceName} hizmetini silmek istediğinize emin misiniz?`,
            skipKey: 'delete-service',
          })
          if (ok) {
            removeServiceFromProtocol(protocolId, serviceId)
            showToast('info', 'Hizmet silindi', `${serviceName} protokolden kaldırıldı.`)
          }
        }}
        protocolTotalAmount={protocolTotalAmount}
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
