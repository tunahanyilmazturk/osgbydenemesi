import { defaultExternalLabs } from '@/pages/external-labs/data/externalLabsDefaults'
import type { ExternalLab } from '@/shared/types'

export const EXTERNAL_LABS_STORAGE_KEY = 'cetka-external-labs'
export const EXTERNAL_LABS_CHANGED_EVENT = 'cetka:external-labs-changed'

export function loadExternalLabs(): ExternalLab[] {
  try {
    const raw = localStorage.getItem(EXTERNAL_LABS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ExternalLab[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // Bozuk veya erişilemeyen depolamada güvenli başlangıç verisini kullan.
  }
  return defaultExternalLabs
}

export function saveExternalLabs(labs: ExternalLab[]): void {
  try {
    localStorage.setItem(EXTERNAL_LABS_STORAGE_KEY, JSON.stringify(labs))
    window.dispatchEvent(new Event(EXTERNAL_LABS_CHANGED_EVENT))
  } catch {
    // Depolama dolu olsa bile mevcut ekranın bellek içi verisi çalışmaya devam eder.
  }
}
