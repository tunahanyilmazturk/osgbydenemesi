import { isSameServiceName } from '@/shared/lib/specialServices'

// Doktor yönetimi — kaşe ve test eşleme
// localStorage anahtarı: cetka-doctors

export const DOCTORS_STORAGE_KEY = 'cetka-doctors'

// Test adı Hizmet Tanımları kataloğundan gelir.
export type TestType = string

export interface DoctorAssistant {
  id: string
  userId: string // AppUser.id — kullanıcıdan bilgiler ve kaşe alınır
  testType: TestType
}

export interface Doctor {
  id: string
  name: string
  title: string
  testType: TestType
  stamp: string // base64 görsel
  assistants?: DoctorAssistant[]
}

export function loadDoctors(): Doctor[] {
  try {
    const raw = localStorage.getItem(DOCTORS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Doctor[]
    }
  } catch {
    // ignore
  }
  return []
}

export function saveDoctors(doctors: Doctor[]): boolean {
  try {
    localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(doctors))
    return true
  } catch {
    return false
  }
}

// Belirli bir test türüne eşlenmiş doktoru getir
export function getDoctorForTest(testType: string): Doctor | undefined {
  const doctors = loadDoctors()
  // Önce ana doktorlardan ara
  const main = doctors.find((d) => isSameServiceName(d.testType, testType))
  if (main) return main
  // Yoksa asistanlardan ara — bağlı doktoru döndür
  for (const d of doctors) {
    const ast = d.assistants?.find((a) => isSameServiceName(a.testType, testType))
    if (ast) return d
  }
  return undefined
}

// Kullanıcı bilgilerini localStorage'dan getir
function loadUserById(userId: string): { displayName: string; stamp?: string; roleId: string } | undefined {
  try {
    const raw = localStorage.getItem('cetka-users')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.find((u: { id: string }) => u.id === userId)
      }
    }
  } catch {
    // ignore
  }
  return undefined
}

// Belirli bir test türüne eşlenmiş asistanı getir
export function getAssistantForTest(testType: string): DoctorAssistant | undefined {
  const doctors = loadDoctors()
  for (const d of doctors) {
    const ast = d.assistants?.find((a) => isSameServiceName(a.testType, testType))
    if (ast) return ast
  }
  return undefined
}

// Belirli bir test türüne eşlenmiş doktorun kaşesini getir
export function getDoctorStampForTest(testType: string): string | undefined {
  return getDoctorForTest(testType)?.stamp
}

// Belirli bir test türüne eşlenmiş asistanın kaşesini getir (kullanıcıdan)
export function getAssistantStampForTest(testType: string): string | undefined {
  const ast = getAssistantForTest(testType)
  if (!ast) return undefined
  const user = loadUserById(ast.userId)
  return user?.stamp
}

// Belirli bir test türüne eşlenmiş asistanın adını getir (kullanıcıdan)
export function getAssistantNameForTest(testType: string): string | undefined {
  const ast = getAssistantForTest(testType)
  if (!ast) return undefined
  const user = loadUserById(ast.userId)
  return user?.displayName
}
