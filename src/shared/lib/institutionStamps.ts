import { isSameServiceName } from '@/shared/lib/specialServices'

export const INSTITUTION_STAMPS_STORAGE_KEY = 'cetka-institution-stamps'

export interface InstitutionStamp {
  id: string
  name: string
  image: string
  testTypes: string[]
  updatedAt: string
}

export function loadInstitutionStamps(): InstitutionStamp[] {
  try {
    const raw = localStorage.getItem(INSTITUTION_STAMPS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is InstitutionStamp => (
      typeof item === 'object' && item !== null &&
      typeof (item as InstitutionStamp).id === 'string' &&
      typeof (item as InstitutionStamp).name === 'string' &&
      typeof (item as InstitutionStamp).image === 'string' &&
      Array.isArray((item as InstitutionStamp).testTypes)
    ))
  } catch {
    return []
  }
}

export function saveInstitutionStamps(stamps: InstitutionStamp[]): boolean {
  try {
    localStorage.setItem(INSTITUTION_STAMPS_STORAGE_KEY, JSON.stringify(stamps))
    return true
  } catch {
    return false
  }
}

export function getInstitutionStampForTest(testType: string): InstitutionStamp | undefined {
  return loadInstitutionStamps().find((stamp) => (
    stamp.testTypes.some((stampTestType) => isSameServiceName(stampTestType, testType))
  ))
}
