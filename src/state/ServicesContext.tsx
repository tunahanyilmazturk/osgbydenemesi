import { createContext, useContext, useEffect, useState } from 'react'
import type { ServiceCatalogItem, ServiceGroup, ServicePackage, ServiceTubeType } from '@/shared/types'
import { loadFromStorage, saveToStorage } from '@/shared/lib/storage'
import { getTubeBarcodeShortName } from '@/shared/lib/barcodeSettings'

const defaultGroups: ServiceGroup[] = [
  { id: 1, name: 'Biyokimya', color: 'blue', labIds: [3, 4], defaultTubeTypeId: 1 },
  { id: 2, name: 'Hematoloji', color: 'red', labIds: [3, 4], defaultTubeTypeId: 3 },
  { id: 3, name: 'Radyoloji', color: 'violet', labIds: [3, 4], defaultTubeTypeId: 15 },
  { id: 4, name: 'Odyometri', color: 'amber', labIds: [3, 4], defaultTubeTypeId: 15 },
  { id: 5, name: 'Aşı', color: 'emerald', labIds: [], defaultTubeTypeId: 16 },
  { id: 6, name: 'Diğer', color: 'slate', labIds: [], defaultTubeTypeId: 15 },
]

export const defaultTubeTypes: ServiceTubeType[] = [
  { id: 1, name: 'Sarı Kapaklı Jel Separator Tüp (SST)', colorCode: '#eab308', description: 'Serum ayrıştırıcı jel içerir; biyokimya, seroloji, hormon tetkikleri için', isActive: true },
  { id: 2, name: 'Kırmızı Kapaklı Serum Tüpü (Kuru)', colorCode: '#ef4444', description: 'Jelsiz serum tüpü; seroloji, immünoloji, biyokimya için', isActive: true },
  { id: 3, name: 'Mor (Lavanta) Kapaklı EDTA Tüpü (K2)', colorCode: '#8b5cf6', description: 'Dipotasyum EDTA; tam kan, hemogram, kan grubu, HbA1c için', isActive: true },
  { id: 4, name: 'Mor (Lavanta) Kapaklı EDTA Tüpü (K3)', colorCode: '#a855f7', description: 'Tripotasyum EDTA; tam kan ve hematoloji tetkikleri için', isActive: true },
  { id: 5, name: 'Açık Mavi Kapaklı Sodyum Sitratlı Tüp', colorCode: '#60a5fa', description: '0,109 M (%3,2) sodyum sitrat; koagülasyon (PT, aPTT, INR) için', isActive: true },
  { id: 6, name: 'Siyah Kapaklı Sodyum Sitratlı Tüp (ESR)', colorCode: '#111827', description: 'Sedimantasyon (BSE/ESR) için sodyum sitratlı tüp', isActive: true },
  { id: 7, name: 'Yeşil Kapaklı Lityum Heparinli Tüp', colorCode: '#22c55e', description: 'Lityum heparin; iyonize kalsiyum, kan gazı, bazı biyokimya testleri için', isActive: true },
  { id: 8, name: 'Gri Kapaklı Sodyum Florürlü / Potasyum Oksalatlı Tüp', colorCode: '#9ca3af', description: 'Glukoz stabilizasyonu; glukoz tolerans testi ve glukoz için', isActive: true },
  { id: 9, name: 'Beyaz Kapaklı Steril Tüp', colorCode: '#d1d5db', description: 'Steril genel amaçlı örnek tüpü; PCR, viral kültür ve özel testler için', isActive: true },
  { id: 10, name: 'Steril İdrar Kabı', colorCode: '#14b8a6', description: 'İdrar kültürü ve sterile gerektiren tetkikler için', isActive: true },
  { id: 11, name: 'Non-Steril İdrar Kabı', colorCode: '#06b6d4', description: 'Genel idrar tetkiki ve rutin analizler için', isActive: true },
  { id: 12, name: 'Gaita Kabı', colorCode: '#a16207', description: 'Dışkı parazit, gaita kültürü ve mikrobiyoloji için', isActive: true },
  { id: 13, name: 'Virocult / Eküvyon Çubuğu', colorCode: '#f97316', description: 'Viral ve bakteri kültür örnekleri için transport çubuğu', isActive: true },
  { id: 14, name: 'Enjektör', colorCode: '#64748b', description: 'Venöz kan alım enjektörü', isActive: true },
  { id: 15, name: 'Muayene', colorCode: '#10b981', description: 'Fiziksel muayene ve tetkik işlemi', isActive: true },
  { id: 16, name: 'Aşı / Enjeksiyon Malzemesi', colorCode: '#84cc16', description: 'Aşı ve ilaç enjeksiyonu için malzeme', isActive: true },
]

const groupColorClasses: Record<string, { bg: string; text: string; dot: string; hex: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', hex: '#3b82f6' },
  red: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', hex: '#ef4444' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', hex: '#8b5cf6' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', hex: '#f59e0b' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', hex: '#10b981' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500', hex: '#64748b' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-500', hex: '#ec4899' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500', hex: '#06b6d4' },
}

export const DEFAULT_VAT_RATE = 0

export const EK2_SERVICE_NAME = 'EK-2 İŞE GİRİŞ / PERİYODİK MUAYENE FORMU'
const EK2_CATALOG_ITEM: ServiceCatalogItem = {
  id: 27,
  code: 1027,
  name: EK2_SERVICE_NAME,
  group: 'Diğer',
  price: 0,
  vatRate: 0,
  isActive: true,
  description: 'Çalışan işe giriş ve periyodik muayene Ek-2 sağlık raporu',
  unit: '',
  referenceRange: '',
  labIds: [],
  tubeTypeId: 15,
}

export function getGroupColor(color: string) {
  return groupColorClasses[color] ?? groupColorClasses.slate
}

interface ServicesContextType {
  catalog: ServiceCatalogItem[]
  packages: ServicePackage[]
  groups: ServiceGroup[]
  tubeTypes: ServiceTubeType[]
  addCatalogItem: (item: Omit<ServiceCatalogItem, 'id'>) => void
  updateCatalogItem: (id: number, updates: Partial<Omit<ServiceCatalogItem, 'id'>>) => void
  removeCatalogItem: (id: number) => void
  addPackage: (pkg: Omit<ServicePackage, 'id'>) => void
  updatePackage: (id: number, updates: Partial<Omit<ServicePackage, 'id'>>) => void
  removePackage: (id: number) => void
  addGroup: (name: string, color: string, labIds?: number[], defaultTubeTypeId?: number | null) => void
  updateGroup: (id: number, updates: Partial<Omit<ServiceGroup, 'id'>>) => void
  removeGroup: (id: number) => void
  addTubeType: (item: Omit<ServiceTubeType, 'id'>) => void
  updateTubeType: (id: number, updates: Partial<Omit<ServiceTubeType, 'id'>>) => void
  removeTubeType: (id: number) => void
  setTubeTypes: (tubeTypes: ServiceTubeType[]) => void
}

const defaultCatalog: ServiceCatalogItem[] = [
  // — Biyokimya —
  {
    id: 3,
    code: 1003,
    name: 'GLİKOZ (AKS / Açlık Kan Şekeri)',
    group: 'Biyokimya',
    price: 30,
    vatRate: 0,
    isActive: true,
    description: 'Açlık kan şekeri ölçümü',
    unit: 'mg/dL',
    referenceRange: '70 - 110',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 5,
    code: 1005,
    name: 'HbA1c (Glikozille Hemoglobin)',
    group: 'Biyokimya',
    price: 50,
    vatRate: 0,
    isActive: true,
    description: 'Son 2-3 aylık glikoz kontrolü',
    unit: '%',
    referenceRange: '4.0 - 6.0',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 10,
    code: 1010,
    name: 'Tam İdrar Tetkiki (TİT)',
    group: 'Biyokimya',
    price: 35,
    vatRate: 0,
    isActive: true,
    description: 'İdrar rutin tetkiki',
    unit: '',
    referenceRange: 'Normal',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 12,
    code: 1012,
    name: 'KREATİNİN (Serum)',
    group: 'Biyokimya',
    price: 35,
    vatRate: 0,
    isActive: true,
    description: 'Böbrek fonksiyon göstergesi',
    unit: 'mg/dL',
    referenceRange: '0.7 - 1.3',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 13,
    code: 1013,
    name: 'ALT (SGPT - Alanin Aminotransferaz)',
    group: 'Biyokimya',
    price: 30,
    vatRate: 0,
    isActive: true,
    description: 'Karaciğer fonksiyon testi',
    unit: 'U/L',
    referenceRange: '0 - 50',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 14,
    code: 1014,
    name: 'AST (SGOT - Aspartat Aminotransferaz)',
    group: 'Biyokimya',
    price: 30,
    vatRate: 0,
    isActive: true,
    description: 'Karaciğer fonksiyon testi',
    unit: 'U/L',
    referenceRange: '0 - 40',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 15,
    code: 1015,
    name: 'KOLESTEROL (Total)',
    group: 'Biyokimya',
    price: 30,
    vatRate: 0,
    isActive: true,
    description: 'Total kolesterol ölçümü',
    unit: 'mg/dL',
    referenceRange: '< 200',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 16,
    code: 1016,
    name: 'LDL KOLESTEROL',
    group: 'Biyokimya',
    price: 40,
    vatRate: 0,
    isActive: true,
    description: 'Düşük yoğunluklu lipoprotein kolesterol',
    unit: 'mg/dL',
    referenceRange: '< 130',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 17,
    code: 1017,
    name: 'HDL KOLESTEROL',
    group: 'Biyokimya',
    price: 40,
    vatRate: 0,
    isActive: true,
    description: 'Yüksek yoğunluklu lipoprotein kolesterol',
    unit: 'mg/dL',
    referenceRange: '> 40',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 18,
    code: 1018,
    name: 'TRİGLİSERİD',
    group: 'Biyokimya',
    price: 30,
    vatRate: 0,
    isActive: true,
    description: 'Kan yağı ölçümü',
    unit: 'mg/dL',
    referenceRange: '< 150',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 19,
    code: 1019,
    name: 'TSH (Tiroid Uyarıcı Hormon)',
    group: 'Biyokimya',
    price: 50,
    vatRate: 0,
    isActive: true,
    description: 'Tiroid fonksiyon testi',
    unit: 'mIU/L',
    referenceRange: '0.4 - 4.0',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 20,
    code: 1020,
    name: 'ÜRE (BUN)',
    group: 'Biyokimya',
    price: 25,
    vatRate: 0,
    isActive: true,
    description: 'Böbrek fonksiyon göstergesi',
    unit: 'mg/dL',
    referenceRange: '7 - 20',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 21,
    code: 1021,
    name: 'GGT (Gama Glutamil Transferaz)',
    group: 'Biyokimya',
    price: 35,
    vatRate: 0,
    isActive: true,
    description: 'Karaciğer ve safra yolu testi',
    unit: 'U/L',
    referenceRange: '0 - 50',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  // — Hematoloji —
  {
    id: 7,
    code: 1007,
    name: 'KAN GRUBU (ABO ve Rh)',
    group: 'Hematoloji',
    price: 25,
    vatRate: 0,
    isActive: true,
    description: 'AB0 ve Rh kan grubu tayini',
    unit: '',
    referenceRange: '',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 11,
    code: 1011,
    name: 'Tam Kan Sayımı (Hemogram - CBC)',
    group: 'Hematoloji',
    price: 40,
    vatRate: 0,
    isActive: true,
    description: 'Tam kan sayımı — hemogram',
    unit: '',
    referenceRange: 'Normal sınırlarda',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 22,
    code: 1022,
    name: 'Sedimantasyon (BSE / ESR)',
    group: 'Hematoloji',
    price: 20,
    vatRate: 0,
    isActive: true,
    description: 'Eritrosit sedimantasyon hızı',
    unit: 'mm/sa',
    referenceRange: '0 - 20',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 23,
    code: 1023,
    name: 'PT / INR (Protrombin Zamanı)',
    group: 'Hematoloji',
    price: 40,
    vatRate: 0,
    isActive: true,
    description: 'Koagülasyon testi',
    unit: 'sn',
    referenceRange: '11 - 14',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  // — Radyoloji —
  {
    id: 2,
    code: 1002,
    name: 'EKG (Elektrokardiyografi)',
    group: 'Radyoloji',
    price: 80,
    vatRate: 0,
    isActive: true,
    description: '12 derivasyon EKG çekimi',
    unit: '',
    referenceRange: 'Normal sınırlarda',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 9,
    code: 1009,
    name: 'PA Akciğer Grafisi (Posteroanterior)',
    group: 'Radyoloji',
    price: 120,
    vatRate: 0,
    isActive: true,
    description: 'PA akciğer grafisi çekimi',
    unit: '',
    referenceRange: 'Normal sınırlarda',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 24,
    code: 1024,
    name: 'Lomber Sakral Grafisi',
    group: 'Radyoloji',
    price: 150,
    vatRate: 0,
    isActive: true,
    description: 'Bel bölgesi radyolojik incelemesi',
    unit: '',
    referenceRange: 'Normal sınırlarda',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  // — Odyometri / Solunum —
  {
    id: 4,
    code: 1004,
    name: 'Göz Taraması (Otorefraktometre)',
    group: 'Odyometri',
    price: 50,
    vatRate: 0,
    isActive: true,
    description: 'Otorefraktometre ile göz taraması',
    unit: '',
    referenceRange: '',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 6,
    code: 1006,
    name: 'İşitme Testi (Odyometri)',
    group: 'Odyometri',
    price: 60,
    vatRate: 0,
    isActive: true,
    description: 'Odyometri ile işitme testi',
    unit: 'dB',
    referenceRange: '0 - 25',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  {
    id: 25,
    code: 1025,
    name: 'Solunum Fonksiyon Testi (SFT / Spirometri)',
    group: 'Odyometri',
    price: 70,
    vatRate: 0,
    isActive: true,
    description: 'Solunum fonksiyon ölçümü — spirometri',
    unit: '%',
    referenceRange: '> 80',
    labIds: [3, 4],
    tubeTypeId: null,
  },
  // — Aşı —
  {
    id: 1,
    code: 1001,
    name: 'Tetanoz Aşısı',
    group: 'Aşı',
    price: 150,
    vatRate: 0,
    isActive: true,
    description: 'Tetanos aşısı uygulaması',
    unit: 'Doz',
    referenceRange: '',
    labIds: [],
    tubeTypeId: null,
  },
  // — Diğer —
  {
    id: 8,
    code: 1008,
    name: 'MOTHERSON SAS 26',
    group: 'Diğer',
    price: 1000,
    vatRate: 0,
    isActive: true,
    description: 'Özel kurum bazlı hizmet',
    unit: '',
    referenceRange: '',
    labIds: [],
    tubeTypeId: null,
  },
  {
    id: 26,
    code: 1026,
    name: 'Fizik Muayene (İş Sağlığı)',
    group: 'Diğer',
    price: 100,
    vatRate: 0,
    isActive: true,
    description: 'İş sağlığı ve güvenliği fiziksel muayenesi',
    unit: '',
    referenceRange: '',
    labIds: [],
    tubeTypeId: null,
  },
  EK2_CATALOG_ITEM,
]

const defaultPackages: ServicePackage[] = [
  {
    id: 1,
    name: 'İşe Giriş Paketi (Standart)',
    companies: ['Polimer OSGB (Erdos)'],
    price: 850,
    services: [
      { serviceId: 11 }, // Tam Kan Sayımı
      { serviceId: 3 },  // GLİKOZ
      { serviceId: 7 },  // KAN GRUBU
      { serviceId: 9 },  // PA Akciğer Grafisi
      { serviceId: 2 },  // EKG
      { serviceId: 6 },  // İşitme Testi
      { serviceId: 4 },  // Göz Taraması
    ],
  },
  {
    id: 2,
    name: 'Periyodik Muayene Paketi (Yıllık)',
    companies: ['Polimer OSGB (Erdos)'],
    price: 650,
    services: [
      { serviceId: 11 }, // Tam Kan Sayımı
      { serviceId: 3 },  // GLİKOZ
      { serviceId: 7 },  // KAN GRUBU
      { serviceId: 2 },  // EKG
    ],
  },
  {
    id: 3,
    name: 'Genel Sağlık Tarama Paketi',
    companies: [],
    price: 1500,
    services: [
      { serviceId: 11 }, // Tam Kan Sayımı
      { serviceId: 3 },  // GLİKOZ
      { serviceId: 5 },  // HbA1c
      { serviceId: 7 },  // KAN GRUBU
      { serviceId: 9 },  // PA Akciğer Grafisi
      { serviceId: 2 },  // EKG
      { serviceId: 15 }, // KOLESTEROL (Total)
      { serviceId: 18 }, // TRİGLİSERİD
      { serviceId: 17 }, // HDL KOLESTEROL
      { serviceId: 16 }, // LDL KOLESTEROL
      { serviceId: 12 }, // KREATİNİN
      { serviceId: 20 }, // ÜRE (BUN)
      { serviceId: 13 }, // ALT
      { serviceId: 14 }, // AST
      { serviceId: 19 }, // TSH
    ],
  },
  {
    id: 4,
    name: 'Gürültülü Çalışma Ortamı Paketi',
    companies: [],
    price: 700,
    services: [
      { serviceId: 11 }, // Tam Kan Sayımı
      { serviceId: 6 },  // İşitme Testi
      { serviceId: 9 },  // PA Akciğer Grafisi
      { serviceId: 2 },  // EKG
    ],
  },
  {
    id: 5,
    name: 'Tozlu Ortam Paketi (SFT + PA)',
    companies: [],
    price: 900,
    services: [
      { serviceId: 11 }, // Tam Kan Sayımı
      { serviceId: 25 }, // Solunum Fonksiyon Testi
      { serviceId: 9 },  // PA Akciğer Grafisi
      { serviceId: 2 },  // EKG
    ],
  },
]

const ServicesContext = createContext<ServicesContextType | null>(null)

const CATALOG_KEY = 'cetka-service-catalog'
const PACKAGES_KEY = 'cetka-service-packages'
const GROUPS_KEY = 'cetka-service-groups'
const TUBE_TYPES_KEY = 'cetka-service-tube-types'

let catalogIdSeq = 100
let packageIdSeq = 100
let groupIdSeq = 100
let tubeTypeIdSeq = 100

function normalizeCatalog(items: ServiceCatalogItem[]): ServiceCatalogItem[] {
  const normalized = items.map((item) => ({
    ...item,
    code: item.code ?? 0,
    isActive: item.isActive ?? true,
    description: item.description ?? '',
    unit: item.unit ?? '',
    referenceRange: item.referenceRange ?? '',
    labIds: item.labIds ?? [],
    tubeTypeId: item.tubeTypeId ?? null,
  }))
  return normalized
}

function normalizeGroups(items: ServiceGroup[]): ServiceGroup[] {
  return items.map((item) => ({
    ...item,
    labIds: item.labIds ?? [],
    defaultTubeTypeId: item.defaultTubeTypeId ?? null,
  }))
}

function normalizeTubeTypes(items: ServiceTubeType[]): ServiceTubeType[] {
  return items.map((item) => ({
    ...item,
    barcodeShortName: item.barcodeShortName?.trim() || getTubeBarcodeShortName(item.name),
  }))
}

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>(() => normalizeCatalog(loadFromStorage(CATALOG_KEY, defaultCatalog)))
  const [packages, setPackages] = useState<ServicePackage[]>(() => loadFromStorage(PACKAGES_KEY, defaultPackages))
  const [groups, setGroups] = useState<ServiceGroup[]>(() => normalizeGroups(loadFromStorage(GROUPS_KEY, defaultGroups)))
  const [tubeTypes, setTubeTypes] = useState<ServiceTubeType[]>(() => normalizeTubeTypes(loadFromStorage(TUBE_TYPES_KEY, defaultTubeTypes)))

  useEffect(() => saveToStorage(CATALOG_KEY, catalog), [catalog])
  useEffect(() => saveToStorage(PACKAGES_KEY, packages), [packages])
  useEffect(() => saveToStorage(GROUPS_KEY, groups), [groups])
  useEffect(() => saveToStorage(TUBE_TYPES_KEY, tubeTypes), [tubeTypes])

  useEffect(() => {
    catalogIdSeq = Math.max(catalogIdSeq, ...catalog.map((item) => item.id))
    packageIdSeq = Math.max(packageIdSeq, ...packages.map((pkg) => pkg.id))
    groupIdSeq = Math.max(groupIdSeq, ...groups.map((group) => group.id))
    tubeTypeIdSeq = Math.max(tubeTypeIdSeq, ...tubeTypes.map((t) => t.id))
  }, [catalog, packages, groups, tubeTypes])

  const addCatalogItem = (item: Omit<ServiceCatalogItem, 'id'>) => {
    catalogIdSeq = Math.max(catalogIdSeq + 1, Date.now())
    const id = catalogIdSeq
    setCatalog((prev) => [...prev, { ...item, id }])
  }

  const updateCatalogItem = (id: number, updates: Partial<Omit<ServiceCatalogItem, 'id'>>) => {
    setCatalog((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  const removeCatalogItem = (id: number) => {
    setCatalog((prev) => prev.filter((c) => c.id !== id))
  }

  const addPackage = (pkg: Omit<ServicePackage, 'id'>) => {
    packageIdSeq = Math.max(packageIdSeq + 1, Date.now())
    const id = packageIdSeq
    setPackages((prev) => [...prev, { ...pkg, id }])
  }

  const updatePackage = (id: number, updates: Partial<Omit<ServicePackage, 'id'>>) => {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const removePackage = (id: number) => {
    setPackages((prev) => prev.filter((p) => p.id !== id))
  }

  const addGroup = (name: string, color: string, labIds: number[] = [], defaultTubeTypeId: number | null = null) => {
    groupIdSeq = Math.max(groupIdSeq + 1, Date.now())
    const id = groupIdSeq
    setGroups((prev) => [...prev, { id, name, color, labIds, defaultTubeTypeId }])
  }

  const updateGroup = (id: number, updates: Partial<Omit<ServiceGroup, 'id'>>) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)))
    // Eğer grup adı değiştiyse, katalogdaki hizmetlerin grup adını da güncelle
    if (updates.name) {
      const oldGroup = groups.find((g) => g.id === id)
      if (oldGroup) {
        setCatalog((prev) =>
          prev.map((c) => (c.group === oldGroup.name ? { ...c, group: updates.name! } : c))
        )
      }
    }
  }

  const removeGroup = (id: number) => {
    const group = groups.find((g) => g.id === id)
    if (!group) return
    // Katalogdaki bu gruba ait hizmetleri "Diğer" grubuna taşı
    const otherGroup = groups.find((g) => g.name === 'Diğer')
    setCatalog((prev) =>
      prev.map((c) =>
        c.group === group.name
          ? { ...c, group: otherGroup?.name ?? 'Diğer' }
          : c
      )
    )
    setGroups((prev) => prev.filter((g) => g.id !== id))
  }

  const addTubeType = (item: Omit<ServiceTubeType, 'id'>) => {
    tubeTypeIdSeq = Math.max(tubeTypeIdSeq + 1, Date.now())
    const id = tubeTypeIdSeq
    setTubeTypes((prev) => [...prev, { ...item, id }])
  }

  const updateTubeType = (id: number, updates: Partial<Omit<ServiceTubeType, 'id'>>) => {
    setTubeTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  const removeTubeType = (id: number) => {
    setTubeTypes((prev) => prev.filter((t) => t.id !== id))
    // İlişkili hizmetlerdeki tubeTypeId'yi sıfırla
    setCatalog((prev) => prev.map((c) => (c.tubeTypeId === id ? { ...c, tubeTypeId: null } : c)))
  }

  return (
    <ServicesContext.Provider
      value={{
        catalog,
        packages,
        groups,
        tubeTypes,
        addCatalogItem,
        updateCatalogItem,
        removeCatalogItem,
        addPackage,
        updatePackage,
        removePackage,
        addGroup,
        updateGroup,
        removeGroup,
        addTubeType,
        updateTubeType,
        removeTubeType,
        setTubeTypes,
      }}
    >
      {children}
    </ServicesContext.Provider>
  )
}

export function useServices() {
  const context = useContext(ServicesContext)
  if (!context) {
    throw new Error('useServices must be used within a ServicesProvider')
  }
  return context
}
