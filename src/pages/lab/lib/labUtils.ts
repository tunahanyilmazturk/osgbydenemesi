import type { PatientDetail, Protocol, ProtocolService, ServiceCatalogItem, ServiceGroup, ServicePackage, ServiceTubeType } from '@/shared/types'
import { getTubeBarcodeShortName } from '@/shared/lib/barcodeSettings'
import type { CompanyService } from '@/state/CompaniesContext'
import type { LabFilters } from '@/pages/lab/components/LabFilterPanel'
import { isEyeExaminationServiceName, isSameServiceName } from '@/shared/lib/specialServices'

export type SortField = 'protocolNo' | 'patientName' | 'company' | 'tc'
export type SortConfig = { field: SortField; direction: 'asc' | 'desc' } | null

export const statusOptions = ['Tümü', 'Barkod Verildi', 'İşlem Bekliyor', 'Numune Kabul', 'Numune Red', 'Sonuç Bekleniyor', 'Sonuç Girildi', 'Onaylandı']

export function resolveTubeTypeName(service: ProtocolService, catalog: ServiceCatalogItem[], groups: ServiceGroup[], tubeTypes: ServiceTubeType[]) {
  const catalogItem = catalog.find((item) => item.code === service.code || item.name === service.name)
  const group = groups.find((item) => item.name === service.group)
  const tubeTypeId = catalogItem?.tubeTypeId ?? group?.defaultTubeTypeId
  const tubeType = tubeTypes.find((item) => item.id === tubeTypeId)
  return tubeType?.barcodeShortName || (tubeType ? getTubeBarcodeShortName(tubeType.name) : 'Tanımlı değil')
}

export interface ServiceMeta {
  unit: string
  range: string
  type: 'numeric' | 'text'
}

// Yalnızca katalogdan silinmiş eski protokol kayıtlarını okuyabilmek için kullanılır.
const legacyServiceMeta: Record<string, ServiceMeta> = {
  'Tam Kan Sayımı (Hemogram - CBC)': { unit: '', range: '', type: 'text' },
  'GLİKOZ (Biyokimya-AKS/Açlık Kan Şekeri)': { unit: 'mg/dL', range: '70 - 110', type: 'numeric' },
  'KREATİNİN (kanda)': { unit: 'mg/dL', range: '0.74 - 1.35', type: 'numeric' },
  'TOTAL KOLESTEROL': { unit: 'mg/dL', range: '0 - 200', type: 'numeric' },
  'TRİGLİSERİD': { unit: 'mg/dL', range: '0 - 150', type: 'numeric' },
  'AST / SGOT (Aspartat Amino Transferaz)': { unit: 'U/L', range: '0 - 40', type: 'numeric' },
  'ALT / SGPT (Alanin Amino Transferaz)': { unit: 'U/L', range: '0 - 50', type: 'numeric' },
  'HbA1c / Hemoglobin A1C': { unit: '%', range: '4.0 - 6.0', type: 'numeric' },
  'KAN GRUBU': { unit: '', range: '', type: 'text' },
  'ÜRE': { unit: 'mg/dL', range: '10 - 50', type: 'numeric' },
  'PA AKCİĞER GRAFİSİ (Posteroanterior)': { unit: '', range: 'Normal sınırlarda', type: 'text' },
  'EKG (ELEKTROKARDİYOGRAFİ)': { unit: '', range: 'Normal sınırlarda', type: 'text' },
  'İşitme Testi (ODYOMETRİ)': { unit: 'dB', range: '0 - 25', type: 'numeric' },
  'Solunum Fonksiyon Testi (SFT)': { unit: '%', range: '80 - 120', type: 'numeric' },
  'GÖZ TARAMASI (otorefraktometre)': { unit: '', range: '', type: 'text' },
  'Hbs-Ag (Elisa)': { unit: '', range: 'Negatif', type: 'text' },
  'Anti-HIV 1/2 (Elisa)': { unit: '', range: 'Negatif', type: 'text' },
  'Anti-HCV (Elisa)': { unit: '', range: 'Negatif', type: 'text' },
  'Anti-HBc-Ab (Elisa)': { unit: '', range: 'Negatif', type: 'text' },
}

export function formatDateTime(iso?: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function getMeta(
  service: string | Pick<ProtocolService, 'name' | 'code'>,
  catalog: ServiceCatalogItem[] = [],
): ServiceMeta {
  const name = typeof service === 'string' ? service : service.name
  const code = typeof service === 'string' ? undefined : service.code
  const catalogItem = catalog.find((item) => (
    (code !== undefined && code > 0 && item.code === code) || isSameServiceName(item.name, name)
  ))

  if (catalogItem) {
    return {
      unit: catalogItem.unit,
      range: catalogItem.referenceRange,
      type: isEyeExaminationServiceName(catalogItem.name) || !catalogItem.unit ? 'text' : 'numeric',
    }
  }

  const legacyMeta = Object.entries(legacyServiceMeta).find(([legacyName]) => isSameServiceName(legacyName, name))?.[1]
  return legacyMeta ?? { unit: '', range: '', type: 'text' }
}

export function calculateHL(result: string, range: string): 'Yüksek' | 'Düşük' | 'Normal' | '' {
  if (!result || !range) return ''
  const val = Number(result.replace(',', '.'))
  if (isNaN(val)) return ''
  const parts = range.replace(/\s/g, '').split(/[-â€“]/)
  if (parts.length !== 2) return ''
  const [min, max] = parts.map((p) => Number(p.replace(',', '.')))
  if (isNaN(min) || isNaN(max)) return ''
  if (val > max) return 'Yüksek'
  if (val < min) return 'Düşük'
  return 'Normal'
}

export function getResultText(result: string, meta: ServiceMeta): string {
  if (!result) return ''
  if (meta.type === 'text') return result
  const hl = calculateHL(result, meta.range)
  if (hl === 'Yüksek') return 'Yüksek'
  if (hl === 'Düşük') return 'Düşük'
  return 'Normal Sınırlarda'
}

export function getLabName(group: string): string {
  if (group === 'Radyoloji' || group === 'Odyometri') return 'CETKA Görüntüleme'
  return 'CETKA Lab'
}

export function statusColor(status: string) {
  switch (status) {
    case 'Onaylandı':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300'
    case 'Sonuç Girildi':
      return 'bg-sky-50 text-sky-700 border-sky-300'
    case 'Numune Kabul':
      return 'bg-amber-50 text-amber-700 border-amber-300'
    case 'Numune Red':
      return 'bg-red-50 text-red-700 border-red-300'
    case 'İşlem Bekliyor':
      return 'bg-slate-50 text-slate-500 border-slate-300'
    case 'Barkod Verildi':
      return 'bg-violet-50 text-violet-700 border-violet-300'
    case 'Sonuç Bekleniyor':
      return 'bg-rose-50 text-rose-700 border-rose-300'
    default:
      return 'bg-slate-50 text-slate-500 border-slate-300'
  }
}

// Durum rozeti için ikon bilgisi — her duruma uygun nokta/renk
export function statusDot(status: string): string {
  switch (status) {
    case 'Onaylandı':
      return 'bg-emerald-500'
    case 'Sonuç Girildi':
      return 'bg-sky-500'
    case 'Numune Kabul':
      return 'bg-amber-500'
    case 'Numune Red':
      return 'bg-red-500'
    case 'İşlem Bekliyor':
      return 'bg-slate-400'
    case 'Barkod Verildi':
      return 'bg-violet-500'
    case 'Sonuç Bekleniyor':
      return 'bg-rose-500'
    default:
      return 'bg-slate-400'
  }
}

export function initialResult(status: string, meta: ServiceMeta): string {
  if (status === 'Onaylandı' || status === 'Sonuç Girildi' || status === 'Numune Kabul') return ''
  if (meta.type === 'text') {
    if (meta.range === 'Negatif') return 'Negatif'
    if (meta.range === 'Normal sınırlarda') return 'Normal sınırlarda'
    return ''
  }
  return ''
}

/**
 * Protokolleri filtreye ve sıralamaya göre süzer.
 */
export function filterAndSortProtocols(
  protocols: Protocol[],
  patients: PatientDetail[],
  filters: LabFilters,
  sortConfig: SortConfig,
  dateStart: string,
  dateEnd: string
): Protocol[] {
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
}

/**
 * Tek bir protokol için hizmet durum istatistiklerini hesaplar.
 */
export function computeServiceStats(services: ProtocolService[]) {
  const stats = { pending: 0, accepted: 0, resulted: 0, approved: 0, total: services.length }
  services.forEach((s) => {
    if (s.status === 'Onaylandı') stats.approved++
    else if (s.status === 'Sonuç Girildi') stats.resulted++
    else if (s.status === 'Numune Kabul') stats.accepted++
    else stats.pending++
  })
  return stats
}

/**
 * Tüm protokoller için durum özeti haritası oluşturur.
 */
export function computeProtocolStats(protocols: Protocol[]): Map<number, { pending: number; approved: number; total: number }> {
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
}

/**
 * Vezne özeti hesaplar (toplam, ödenen, indirim, kalan).
 */
export function computeVezneSummary(protocol: Protocol | null) {
  if (!protocol) return { total: 0, paid: 0, discount: 0, remaining: 0 }
  const total = protocol.services.reduce((sum, s) => sum + (s.totalPrice || 0), 0)
  const paid = protocol.payments
    .filter((p) => p.paymentType !== 'İndirim')
    .reduce((sum, p) => sum + p.amount, 0)
  const discount = protocol.payments
    .filter((p) => p.paymentType === 'İndirim')
    .reduce((sum, p) => sum + p.amount, 0)
  const remaining = Number((total - paid - discount).toFixed(2))
  return { total, paid, discount, remaining }
}

/**
 * Hızlı hizmet ekleme modalı için filtrelenmiş katalog/paket listesi.
 */
export function buildFilteredAddServiceList(
  selectedProtocol: Protocol | null,
  addServiceSearch: string,
  addServiceTab: 'company' | 'packages' | 'all',
  selectedCompanyServices: CompanyService[],
  catalog: ServiceCatalogItem[],
  packages: ServicePackage[],
  selectedNamesSet: Set<string>
): (ServiceCatalogItem | ServicePackage)[] {
  if (!selectedProtocol) return []
  const term = addServiceSearch.trim().toLowerCase()
  let list: (ServiceCatalogItem | ServicePackage)[] = []

  if (addServiceTab === 'company') {
    list = selectedCompanyServices
      .map((cs) => catalog.find((c) => c.id === cs.serviceId && c.isActive))
      .filter(Boolean) as ServiceCatalogItem[]
  } else if (addServiceTab === 'packages') {
    list = packages.filter(
      (p) => p.services.some((ps) => catalog.some((service) => service.id === ps.serviceId && service.isActive)) && (
        p.companies.length === 0 ||
        p.companies.some((comp) => comp.toLowerCase() === selectedProtocol.company.toLowerCase())
      )
    )
  } else {
    list = catalog.filter((service) => service.isActive)
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
}
