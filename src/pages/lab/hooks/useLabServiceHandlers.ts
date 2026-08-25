import { nowLocalDateTime } from '@/shared/lib/date'
import { buildSmsMessage, sendSms } from '@/shared/lib/sms'
import { getMeta, getResultText } from '@/pages/lab/lib/labUtils'
import type { SmsPreviewItem } from '@/pages/lab/components/SmsPreviewModal'
import type { CompanyService } from '@/state/CompaniesContext'
import type { ConfirmOptions } from '@/state/ConfirmContext'
import type { PatientDetail, Protocol, ProtocolService, ServiceCatalogItem, ServicePackage } from '@/shared/types'

type ShowToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void
type UpdateServiceInProtocol = (protocolId: number, serviceId: number, updates: Partial<ProtocolService>) => void
type AddServiceToProtocol = (protocolId: number, service: Omit<ProtocolService, 'id' | 'protocolId' | 'barcode' | 'totalPrice'>) => void
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

interface CurrentUserLike {
  displayName?: string
}

interface CompanyLike {
  name: string
  smsOnResultReady?: boolean
}

interface UseLabServiceHandlersParams {
  selectedProtocol: Protocol | null
  selectedProtocolIds: number[]
  selectedServiceIds: number[]
  selectedServices: ProtocolService[]
  protocols: Protocol[]
  patients: PatientDetail[]
  catalog: ServiceCatalogItem[]
  companyServiceMap: Map<number, CompanyService>
  companyList: CompanyLike[]
  selectedNamesSet: Set<string>
  currentUser: CurrentUserLike | null | undefined
  updateServiceInProtocol: UpdateServiceInProtocol
  addServiceToProtocol: AddServiceToProtocol
  showToast: ShowToast
  confirm: ConfirmFn
  setSelectedServiceIds: (ids: number[]) => void
  setSelectedProtocolIds: (ids: number[]) => void
  setPendingSmsList: (list: SmsPreviewItem[]) => void
  setIsSmsModalOpen: (open: boolean) => void
  pendingSmsList: SmsPreviewItem[]
}

export function useLabServiceHandlers({
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
}: UseLabServiceHandlersParams) {
  const updateServices = (serviceIds: number[], updates: Partial<Omit<ProtocolService, 'id' | 'protocolId' | 'totalPrice'>>) => {
    if (!selectedProtocol) return
    serviceIds.forEach((id) => {
      updateServiceInProtocol(selectedProtocol.id, id, updates)
    })
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

      const allApproved = protocol.services.every((s) => {
        return s.status === 'Onaylandı' || selectedServiceIds.includes(s.id)
      })
      if (!allApproved) return

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
    const meta = getMeta(service, catalog)
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
        const service = catalog.find((c) => c.id === ps.serviceId && c.isActive)
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

  return {
    updateServices,
    handleAccept,
    handleCancelAccept,
    handleApprove,
    handleSendSms,
    handleCancelApprove,
    handleResultChange,
    handleQuickAddService,
  }
}
