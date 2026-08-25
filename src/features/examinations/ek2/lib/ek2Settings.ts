import { normalizeServiceName } from '@/shared/lib/specialServices'
import { loadFromStorage, saveToStorage } from '@/shared/lib/storage'
import type { ProtocolService, ServiceCatalogItem } from '@/shared/types'

export type Ek2TransferTarget =
  | 'none'
  | 'bloodGroup'
  | 'tetanus'
  | 'blood'
  | 'urine'
  | 'radiology'
  | 'audiometry'
  | 'sft'
  | 'eye'
  | 'psychological'
  | 'other'

export interface Ek2ServiceMapping {
  serviceCode: number
  serviceName: string
  target: Ek2TransferTarget
}

export interface Ek2Settings {
  version: 1
  mappings: Ek2ServiceMapping[]
  autoFillPhysicalExamination: boolean
  anamnesisDefaults: Record<string, { answer: 'Evet' | 'Hayır' | ''; note: string }>
  narrativeDefaults: Record<string, string>
  physicalExaminationDefaults: Record<string, string>
  defaultOpinion: string
  defaultConditions: string
  defaultConclusion: 'Çalışmaya Uygundur' | 'Şartlı Uygundur' | 'Çalışmaya Uygun Değildir' | 'Değerlendirme Bekliyor'
  opinionTemplates: Ek2OpinionTemplate[]
  stamps: Ek2Stamp[]
}

export interface Ek2Stamp {
  id: string
  name: string
  image: string
}

export interface Ek2OpinionTemplate {
  id: string
  title: string
  conditions: string[]
}

export const EK2_SETTINGS_KEY = 'cetka-ek2-settings'

export const EK2_SYMPTOMS = [
  ['productiveCough', 'Balgamlı öksürük'], ['shortnessOfBreath', 'Nefes darlığı'], ['chestPain', 'Göğüs ağrısı'],
  ['palpitation', 'Çarpıntı'], ['backPain', 'Sırt ağrısı'], ['bowelProblem', 'İshal veya kabızlık'], ['jointPain', 'Eklemlerde ağrı'],
] as const

export const EK2_DISEASES = [
  ['heartDisease', 'Kalp hastalığı'], ['diabetes', 'Şeker hastalığı'], ['kidneyDisease', 'Böbrek rahatsızlığı'],
  ['jaundice', 'Sarılık'], ['ulcer', 'Mide veya on iki parmak ülseri'], ['hearingLoss', 'İşitme kaybı'],
  ['visualImpairment', 'Görme bozukluğu'], ['nervousSystemDisease', 'Sinir sistemi hastalığı'],
  ['skinDisease', 'Deri hastalığı'], ['foodPoisoning', 'Besin zehirlenmesi'],
] as const

export const EK2_NARRATIVE_FIELDS = [
  ['hospitalization', 'Hastanede yattınız mı? Tanı ve tarih'], ['operation', 'Ameliyat geçirdiniz mi? Nedeni'],
  ['occupationalAccident', 'İş kazası geçirdiniz mi? Açıklama'], ['occupationalDisease', 'Meslek hastalığı şüphesiyle tetkik edildiniz mi? Sonuç'],
  ['disability', 'Maluliyet aldınız mı? Nedeni ve oranı'], ['currentTreatment', 'Şu anda tedavi görüyor musunuz? Açıklama'],
] as const

export const EK2_PHYSICAL_FIELDS = [
  ['eye', 'Göz'], ['ent', 'Kulak – Burun – Boğaz'], ['skin', 'Deri'], ['cardiovascular', 'Kardiyovasküler sistem'],
  ['respiratory', 'Solunum sistemi'], ['digestive', 'Sindirim sistemi'], ['urogenital', 'Ürogenital sistem'],
  ['musculoskeletal', 'Kas-iskelet sistemi'], ['neurological', 'Nörolojik muayene'], ['psychiatric', 'Psikiyatrik muayene'],
] as const

export const DEFAULT_EK2_OPINIONS: Ek2OpinionTemplate[] = [
  { id: 'opinion-fit', title: 'Çalışabilir.', conditions: [
    'Usta/Öğretmen gözetiminde çalışabilir.', 'Yalnız kalmayacağı ortamda çalışır.', 'Tanımlı işi yapabilir.',
    'Gece çalışabilir.', 'Yüksekte çalışabilir.', 'Tehlikeli ve çok tehlikeli işlerde çalışabilir.', 'Gündüz 23:00’a kadar yerde çalışır.',
    'Yerde çalışır.', 'Yüksekte çalışamaz.', 'Gürültülü ortamda kulak koruyucu takarak çalışabilir.',
    'Tozlu ortamda maske takarak çalışabilir.', 'Gözlükle/Lensle çalışabilir.', 'Çok ağır kaldırmadan çalışabilir.',
    'Ağır kaldırmadan çalışabilir.', 'Gözlükle çalışabilir.', 'Lensle çalışabilir.',
    'Keskin renk ayrımı gerektirmeyen işlerde çalışabilir.', 'Derinlikli hassas görme gerektirmeyen işlerde çalışabilir.',
    'Detaylı göz muayenesi / gözlük önerildi.', 'Hijyen kurallarına uymak şartıyla çalışır.', 'Gündüz çalışır.',
  ] },
  { id: 'opinion-referral', title: 'Sevk', conditions: [
    'Dahiliye sevki istendi.', 'Kardiyoloji poliklinik sevki istendi.', 'Beyin ve Sinir Cerrahi poliklinik sevki istendi.',
    'Ortopedi poliklinik sevki istendi.', 'Nöroloji poliklinik sevki istendi.', 'Konsültasyon notu ektedir.',
  ] },
  { id: 'opinion-conditional', title: 'Şartıyla çalışabilir.', conditions: [
    'Uygun zamanda Dahiliye Poliklinik kontrolü önerildi.', 'Uygun zamanda Kardiyoloji Poliklinik kontrolü önerildi.',
    'Uygun zamanda Göğüs Hastalıkları Poliklinik kontrolü önerildi.', 'Uygun zamanda Nöroloji Poliklinik kontrolü önerildi.',
    'Uygun zamanda Kardiyoloji / Dahiliye Poliklinik kontrolü önerildi.', 'Uygun zamanda Enfeksiyon Hastalıkları Poliklinik kontrolü önerildi.',
    'Rutin, düzenli Dahiliye Polikliniği kontrolü ile çalışır.', 'Rutin, düzenli Kardiyoloji Polikliniği kontrolü ile çalışır.',
    'Rutin, düzenli Kardiyoloji / Dahiliye Polikliniği kontrolü ile çalışır.', 'Uygun tedavi devamı ile çalışabilir.',
    'Uygun tedavi başlanarak çalışabilir.', 'Uygun zamanda Beyin ve Sinir Cerrahi Poliklinik kontrolü önerildi.',
    'Uygun zamanda Üroloji Poliklinik kontrolü önerildi.',
  ] },
  { id: 'opinion-construction', title: 'Şantiyelerde uzun süreli ve devamlı olarak çalışmaya bedenen ve ruhen elverişlidir, bir engeli yoktur.', conditions: [] },
]

export const DEFAULT_EK2_SETTINGS: Ek2Settings = {
  version: 1,
  mappings: [],
  autoFillPhysicalExamination: true,
  anamnesisDefaults: Object.fromEntries([...EK2_SYMPTOMS, ...EK2_DISEASES].map(([key]) => [key, { answer: '', note: '' }])),
  narrativeDefaults: Object.fromEntries(EK2_NARRATIVE_FIELDS.map(([key]) => [key, ''])),
  physicalExaminationDefaults: Object.fromEntries(EK2_PHYSICAL_FIELDS.map(([key]) => [key, key === 'eye' ? '' : 'NORMAL'])),
  defaultOpinion: '',
  defaultConditions: '',
  defaultConclusion: 'Değerlendirme Bekliyor',
  opinionTemplates: DEFAULT_EK2_OPINIONS,
  stamps: [],
}

export const EK2_TRANSFER_TARGETS: Array<{ value: Ek2TransferTarget; label: string; description: string }> = [
  { value: 'none', label: 'Aktarılmasın', description: 'Bu hizmetin sonucu Ek-2 formuna yansımaz.' },
  { value: 'bloodGroup', label: 'Kan Grubu', description: 'Çalışma ve Özgeçmiş bölümündeki Kan Grubu alanına aktarılır.' },
  { value: 'tetanus', label: 'Tetanoz', description: 'Bağışıklama bölümündeki Tetanoz alanına aktarılır.' },
  { value: 'blood', label: 'Kan Analizleri', description: 'Laboratuvar bulgularındaki Kan Analizleri alanına aktarılır.' },
  { value: 'urine', label: 'İdrar Analizleri', description: 'Laboratuvar bulgularındaki İdrar Analizleri alanına aktarılır.' },
  { value: 'radiology', label: 'Radyolojik Analizler', description: 'Radyoloji sonuçları alanına aktarılır.' },
  { value: 'audiometry', label: 'Odyometri', description: 'Odyometri sonuçları alanına aktarılır.' },
  { value: 'sft', label: 'Solunum Fonksiyon Testi', description: 'SFT sonuçları alanına aktarılır.' },
  { value: 'eye', label: 'Göz Muayenesi', description: 'Göz muayenesi sonuçları alanına aktarılır.' },
  { value: 'psychological', label: 'Psikolojik Testler', description: 'Psikolojik test sonuçları alanına aktarılır.' },
  { value: 'other', label: 'Diğer Bulgular', description: 'Diğer laboratuvar ve tetkik bulguları alanına aktarılır.' },
]

const VALID_TARGETS = new Set<Ek2TransferTarget>(EK2_TRANSFER_TARGETS.map((item) => item.value))

export function inferDefaultEk2Target(service: Pick<ServiceCatalogItem, 'name' | 'group'> | Pick<ProtocolService, 'name' | 'group'>): Ek2TransferTarget {
  const name = normalizeServiceName(service.name)
  const group = normalizeServiceName(service.group)
  if (name.includes('ek 2') || name.includes('periyodik muayene formu')) return 'none'
  if (name.includes('tetanoz') || name.includes('tetanos')) return 'tetanus'
  if (name.includes('kan grubu')) return 'bloodGroup'
  if (name.includes('odyometri') || name.includes('isitme testi')) return 'audiometry'
  if (name.includes('solunum fonksiyon') || name.includes('spirometri') || /(^| )sft( |$)/.test(name)) return 'sft'
  if (name.includes('goz') || name.includes('otorefraktometre')) return 'eye'
  if (name.includes('idrar')) return 'urine'
  if (group.includes('radyoloji') || name.includes('grafi') || name.includes('rontgen') || name.includes('ekg')) return 'radiology'
  if (name.includes('psikolojik') || name.includes('psikoteknik') || group.includes('psikoloji')) return 'psychological'
  if (group.includes('biyokimya') || group.includes('hematoloji') || name.includes('hepatit') || name.includes('hbs') || name.includes('anti h')) return 'blood'
  return 'other'
}

export function loadEk2Settings(): Ek2Settings {
  const stored = loadFromStorage<Partial<Ek2Settings>>(EK2_SETTINGS_KEY, {})
  const mappings = Array.isArray(stored.mappings)
    ? stored.mappings.filter((item): item is Ek2ServiceMapping => (
      typeof item?.serviceCode === 'number'
      && typeof item?.serviceName === 'string'
      && VALID_TARGETS.has(item?.target)
    ))
    : []
  const opinions = Array.isArray(stored.opinionTemplates)
    ? stored.opinionTemplates.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string' && Array.isArray(item.conditions))
    : DEFAULT_EK2_OPINIONS
  const stamps = Array.isArray(stored.stamps)
    ? stored.stamps.filter((item): item is Ek2Stamp => (
      item !== null
      && typeof item === 'object'
      && typeof item.id === 'string'
      && typeof item.name === 'string'
      && typeof item.image === 'string'
    )).slice(0, 5)
    : []
  return {
    ...DEFAULT_EK2_SETTINGS,
    ...stored,
    version: 1,
    mappings,
    anamnesisDefaults: { ...DEFAULT_EK2_SETTINGS.anamnesisDefaults, ...stored.anamnesisDefaults },
    narrativeDefaults: { ...DEFAULT_EK2_SETTINGS.narrativeDefaults, ...stored.narrativeDefaults },
    physicalExaminationDefaults: { ...DEFAULT_EK2_SETTINGS.physicalExaminationDefaults, ...stored.physicalExaminationDefaults },
    opinionTemplates: opinions,
    stamps,
  }
}

export function saveEk2Settings(settings: Ek2Settings) {
  saveToStorage(EK2_SETTINGS_KEY, { ...settings, stamps: settings.stamps.slice(0, 5) })
}

export function resolveEk2TransferTarget(
  service: Pick<ProtocolService, 'code' | 'name' | 'group'>,
  settings: Ek2Settings,
): Ek2TransferTarget {
  const normalizedName = normalizeServiceName(service.name)
  const mapping = settings.mappings.find((item) => item.serviceCode === service.code)
    ?? settings.mappings.find((item) => normalizeServiceName(item.serviceName) === normalizedName)
  return mapping?.target ?? inferDefaultEk2Target(service)
}
