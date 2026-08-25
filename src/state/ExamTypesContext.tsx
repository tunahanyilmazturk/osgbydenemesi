import { createContext, useContext, useEffect, useState } from 'react'

export interface ExamType {
  id: number
  code: string
  name: string
  mobileHealth: boolean
}

interface ExamTypesContextType {
  examTypes: ExamType[]
  addExamType: (examType: Omit<ExamType, 'id'>) => number
  updateExamType: (id: number, updates: Partial<Omit<ExamType, 'id'>>) => void
  removeExamType: (id: number) => void
  toggleMobileHealth: (id: number) => void
}

const STORAGE_KEY = 'cetka-exam-types'

const defaultExamTypes: ExamType[] = [
  { id: 1, code: 'I', name: 'İşe Giriş Muayene', mobileHealth: false },
  { id: 2, code: 'P', name: 'Periyodik Muayene', mobileHealth: false },
  { id: 3, code: 'D', name: 'İşe Dönüş Muayene', mobileHealth: false },
  { id: 4, code: 'M', name: 'Mobil Sağlık Taraması', mobileHealth: true },
]

function loadInitial(): ExamType[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as ExamType[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  return defaultExamTypes
}

let examTypeIdSeq = defaultExamTypes.length

const ExamTypesContext = createContext<ExamTypesContextType | null>(null)

export function ExamTypesProvider({ children }: { children: React.ReactNode }) {
  const [examTypes, setExamTypes] = useState<ExamType[]>(loadInitial)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(examTypes))
  }, [examTypes])

  const addExamType = (examType: Omit<ExamType, 'id'>) => {
    examTypeIdSeq = Math.max(examTypeIdSeq + 1, Date.now())
    const id = examTypeIdSeq
    setExamTypes((prev) => [...prev, { ...examType, id }])
    return id
  }

  const updateExamType = (id: number, updates: Partial<Omit<ExamType, 'id'>>) => {
    setExamTypes((prev) => prev.map((et) => (et.id === id ? { ...et, ...updates } : et)))
  }

  const removeExamType = (id: number) => {
    setExamTypes((prev) => prev.filter((et) => et.id !== id))
  }

  const toggleMobileHealth = (id: number) => {
    setExamTypes((prev) => prev.map((et) => (et.id === id ? { ...et, mobileHealth: !et.mobileHealth } : et)))
  }

  return (
    <ExamTypesContext.Provider
      value={{ examTypes, addExamType, updateExamType, removeExamType, toggleMobileHealth }}
    >
      {children}
    </ExamTypesContext.Provider>
  )
}

export function useExamTypes() {
  const context = useContext(ExamTypesContext)
  if (!context) {
    throw new Error('useExamTypes must be used within an ExamTypesProvider')
  }
  return context
}
