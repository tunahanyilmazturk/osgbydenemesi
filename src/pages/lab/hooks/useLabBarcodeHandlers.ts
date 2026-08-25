import { useMemo } from 'react'
import { sendToBarcodePrinter } from '@/shared/lib/barcodePrinter'
import { formatDateTime, resolveTubeTypeName } from '@/pages/lab/lib/labUtils'
import type { PatientDetail, Protocol, ProtocolService, ServiceCatalogItem, ServiceGroup, ServiceTubeType } from '@/shared/types'

type ShowToast = (type: 'success' | 'error' | 'info', title: string, message: string) => void
type UpdateServiceInProtocol = (protocolId: number, serviceId: number, updates: Partial<ProtocolService>) => void

interface UseLabBarcodeHandlersParams {
  selectedProtocolIds: number[]
  selectedProtocolId: number | null
  selectedProtocol: Protocol | null
  selectedPatient: PatientDetail | undefined
  protocols: Protocol[]
  patients: PatientDetail[]
  catalog: ServiceCatalogItem[]
  groups: ServiceGroup[]
  tubeTypes: ServiceTubeType[]
  selectedBarcodeTests: Set<string>
  selectedServiceIds: number[]
  selectedServices: ProtocolService[]
  updateServiceInProtocol: UpdateServiceInProtocol
  showToast: ShowToast
  setIsBarcodeModalOpen: (open: boolean) => void
}

export function useLabBarcodeHandlers({
  selectedProtocolIds,
  selectedProtocolId,
  selectedProtocol,
  selectedPatient,
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
}: UseLabBarcodeHandlersParams) {
  const barcodeTestList = useMemo(() => {
    const targetIds = selectedProtocolIds.length > 0
      ? selectedProtocolIds
      : selectedProtocolId
      ? [selectedProtocolId]
      : []
    if (targetIds.length === 0) return []

    const protocolsMap = new Map(protocols.map((p) => [p.id, p]))
    const testMap = new Map<string, { name: string; group: string; tubeTypeName: string; count: number; protocols: number }>()

    targetIds.forEach((pid) => {
      const protocol = protocolsMap.get(pid)
      if (!protocol) return
      const seenInThisProtocol = new Set<string>()
      protocol.services.forEach((s) => {
        const key = s.name
        if (!testMap.has(key)) {
          testMap.set(key, { name: s.name, group: s.group, tubeTypeName: resolveTubeTypeName(s, catalog, groups, tubeTypes), count: 0, protocols: 0 })
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
  }, [selectedProtocolIds, selectedProtocolId, protocols, catalog, groups, tubeTypes])

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

      const filteredServices = protocol.services.filter((s) => selectedBarcodeTests.has(s.name))
      if (filteredServices.length === 0) return

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
        serviceValues.push(service.group, `${service.name}\nTüp: ${resolveTubeTypeName(service, catalog, groups, tubeTypes)}`, service.barcode || '')
        totalBarcodes++
      })
      const values = [...baseValues, ...serviceValues, '']
      sendToBarcodePrinter(values)
    })

    if (protocolCount === 0) {
      showToast('info', 'Barkod bulunamadı', 'Seçili testler için barkod bulunamadı.')
      return
    }

    showToast('info', 'Barkod yazdırma', `${protocolCount} protokol, ${selectedBarcodeTests.size} test, ${totalBarcodes} barkod yazıcıya gönderildi.`)
    setIsBarcodeModalOpen(false)
  }

  const handlePrintSelectedBarcodes = () => {
    if (!selectedProtocol || !selectedPatient || selectedServiceIds.length === 0) return
    const selectedServicesList = selectedServices.filter((s) => selectedServiceIds.includes(s.id))
    if (selectedServicesList.length === 0) return
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
        serviceValues.push(service.group, `${service.name}\nTüp: ${resolveTubeTypeName(service, catalog, groups, tubeTypes)}`, service.barcode || '')
      })
      const values = [...baseValues, ...serviceValues, '']
      sendToBarcodePrinter(values)
      showToast('info', 'Barkod yazdırma', 'Barkod yazıcıya gönderildi. Yazıcının açık olduğundan emin olun.')
    } catch {
      showToast('error', 'Barkod yazdırılamadı', 'Yazıcı uygulaması bulunamadı veya bir hata oluştu.')
    }
  }

  const handlePrintAllBarcodesForProtocol = () => {
    if (!selectedProtocol || !selectedPatient) return
    const allServices = selectedProtocol.services
    if (allServices.length === 0) return
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
        serviceValues.push(service.group, `${service.name}\nTüp: ${resolveTubeTypeName(service, catalog, groups, tubeTypes)}`, service.barcode || '')
      })
      const values = [...baseValues, ...serviceValues, '']
      sendToBarcodePrinter(values)
      showToast('info', 'Barkod yazdırma', `${allServices.length} barkod yazıcıya gönderildi.`)
    } catch {
      showToast('error', 'Barkod yazdırılamadı', 'Yazıcı uygulaması bulunamadı veya bir hata oluştu.')
    }
  }

  return {
    barcodeTestList,
    handlePrintSelectedBarcodesByTest,
    handlePrintSelectedBarcodes,
    handlePrintAllBarcodesForProtocol,
  }
}
