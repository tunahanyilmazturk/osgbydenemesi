import { createContext, useContext, useEffect, useState } from 'react'
import { allPatients } from '../data/mockData'
import type { PatientDetail } from '../types'
import { nowLocalDateTime, nowLocalTime } from '../utils/date'
import { loadFromStorage, saveToStorage } from '../utils/storage'

interface PatientsContextType {
  patients: PatientDetail[]
  addPatient: (patient: Omit<PatientDetail, 'id' | 'time' | 'createdAt'>) => number
  updatePatient: (id: number, updates: Partial<PatientDetail>) => void
  removePatient: (id: number) => void
}

const PatientsContext = createContext<PatientsContextType | null>(null)

const STORAGE_KEY = 'cetka-patients'

export function PatientsProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<PatientDetail[]>(() =>
    loadFromStorage(STORAGE_KEY, allPatients).map((p) => ({
      ...p,
      createdAt: p.createdAt || nowLocalDateTime(),
    }))
  )

  useEffect(() => {
    saveToStorage(STORAGE_KEY, patients)
  }, [patients])

  const addPatient = (patient: Omit<PatientDetail, 'id' | 'time' | 'createdAt'>) => {
    const id = Date.now()
    const newPatient: PatientDetail = {
      ...patient,
      id,
      time: nowLocalTime(),
      createdAt: nowLocalDateTime(),
    }
    setPatients((prev) => [newPatient, ...prev])
    return id
  }

  const updatePatient = (id: number, updates: Partial<PatientDetail>) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
  }

  const removePatient = (id: number) => {
    setPatients((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <PatientsContext.Provider value={{ patients, addPatient, updatePatient, removePatient }}>
      {children}
    </PatientsContext.Provider>
  )
}

export function usePatients() {
  const context = useContext(PatientsContext)
  if (!context) {
    throw new Error('usePatients must be used within a PatientsProvider')
  }
  return context
}
