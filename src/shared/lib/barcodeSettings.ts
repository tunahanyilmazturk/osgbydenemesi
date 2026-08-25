import { loadFromStorage, saveToStorage } from '@/shared/lib/storage'

export interface BarcodeSettings {
  prefix: string
  numberLength: number
  startNumber: number
  printerType: 'infoMed' | 'browser'
  copies: number
  autoPrint: boolean
  showPatientName: boolean
  showCompanyName: boolean
  showProtocolNo: boolean
  showServiceName: boolean
  showBarcodeNumber: boolean
  labelWidth: number
  labelHeight: number
}

export const DEFAULT_BARCODE_SETTINGS: BarcodeSettings = {
  prefix: '92',
  numberLength: 4,
  startNumber: 1,
  printerType: 'infoMed',
  copies: 1,
  autoPrint: false,
  showPatientName: true,
  showCompanyName: true,
  showProtocolNo: true,
  showServiceName: true,
  showBarcodeNumber: true,
  labelWidth: 50,
  labelHeight: 25,
}

export const BARCODE_SETTINGS_KEY = 'cetka-barcode-settings'

export function loadBarcodeSettings(): BarcodeSettings {
  const stored = loadFromStorage<Partial<BarcodeSettings> | null>(BARCODE_SETTINGS_KEY, null)
  return { ...DEFAULT_BARCODE_SETTINGS, ...(stored ?? {}) }
}

export function saveBarcodeSettings(settings: BarcodeSettings) {
  saveToStorage(BARCODE_SETTINGS_KEY, settings)
}

export function formatBarcode(sequence: number, settings = loadBarcodeSettings()) {
  return `${settings.prefix}${String(sequence).padStart(settings.numberLength, '0')}`
}

export function getTubeBarcodeShortName(name: string) {
  const normalized = name.toLocaleLowerCase('tr-TR')
  if (normalized.includes('edta') || normalized.includes('lavanta') || normalized.includes('mor')) return 'EDTA Mor'
  if (normalized.includes('sst') || normalized.includes('jel separator') || normalized.includes('sarı')) return 'SST Sarı'
  if (normalized.includes('serum') || normalized.includes('kırmızı')) return 'Serum Kırmızı'
  if (normalized.includes('sitrat')) return normalized.includes('siyah') || normalized.includes('esr') ? 'ESR Siyah' : 'Sitrat Mavi'
  if (normalized.includes('heparin')) return 'Heparin Yeşil'
  if (normalized.includes('florür') || normalized.includes('oksalat')) return 'Florür Gri'
  if (normalized.includes('idrar')) return 'İdrar Kabı'
  if (normalized.includes('gaita')) return 'Gaita Kabı'
  if (normalized.includes('eküvyon') || normalized.includes('virocult')) return 'Eküvyon'
  if (normalized.includes('muayene')) return 'Muayene'
  if (normalized.includes('aşı') || normalized.includes('enjeksiyon')) return 'Aşı'
  return name.length > 18 ? `${name.slice(0, 18)}…` : name
}
