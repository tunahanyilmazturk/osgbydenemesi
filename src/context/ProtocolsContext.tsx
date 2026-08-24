import { createContext, useContext, useEffect, useState } from 'react'
import { allProtocols } from './mocks/protocolsMock'
import type { Protocol, ProtocolPayment, ProtocolService } from '../types'
import { loadFromStorage, saveToStorage } from '../utils/storage'
import { formatBarcode, loadBarcodeSettings } from '../utils/barcodeSettings'

interface ProtocolsContextType {
  protocols: Protocol[]
  addProtocol: (protocol: Omit<Protocol, 'id' | 'protocolNo'>) => number
  removeProtocol: (id: number) => void
  removeProtocolsForPatient: (patientId: number) => void
  addServiceToProtocol: (protocolId: number, service: Omit<ProtocolService, 'id' | 'protocolId' | 'barcode' | 'totalPrice'>) => void
  updateServiceInProtocol: (protocolId: number, serviceId: number, updates: Partial<Omit<ProtocolService, 'id' | 'protocolId' | 'totalPrice'>>) => void
  removeServiceFromProtocol: (protocolId: number, serviceId: number) => void
  addPaymentToProtocol: (protocolId: number, payment: Omit<ProtocolPayment, 'id' | 'protocolId'>) => void
  removePaymentFromProtocol: (protocolId: number, paymentId: number) => void
}

const ProtocolsContext = createContext<ProtocolsContextType | null>(null)

let protocolCounter = allProtocols.reduce((max, p) => {
  const num = Number(p.protocolNo.slice(-6)) || 0
  return Math.max(max, num)
}, 0)
let serviceCounter = allProtocols.reduce((max, p) => {
  return p.services.reduce((sMax, s) => {
    const num = Number(s.barcode.slice(-4)) || 0
    return Math.max(sMax, num)
  }, max)
}, 0)
let serviceIdSeq = allProtocols.reduce((max, p) => Math.max(max, p.id), 0)

function generateProtocolNo() {
  protocolCounter += 1
  const year = new Date().getFullYear()
  return `${year}${protocolCounter.toString().padStart(6, '0')}`
}

function generateBarcode() {
  const settings = loadBarcodeSettings()
  const configuredStart = Math.max(0, settings.startNumber - 1)
  serviceCounter = Math.max(serviceCounter, configuredStart)
  serviceCounter += 1
  return formatBarcode(serviceCounter, settings)
}

function calculateTotal(price: number, vatRate: number) {
  return Number((price * (1 + vatRate / 100)).toFixed(2))
}

const STORAGE_KEY = 'cetka-protocols'

export function ProtocolsProvider({ children }: { children: React.ReactNode }) {
  const [protocols, setProtocols] = useState<Protocol[]>(() => loadFromStorage(STORAGE_KEY, allProtocols))

  useEffect(() => {
    saveToStorage(STORAGE_KEY, protocols)
  }, [protocols])

  useEffect(() => {
    const maxProtocolNo = protocols.reduce((max, p) => Math.max(max, Number(p.protocolNo.slice(-6)) || 0), 0)
    const maxBarcode = protocols.reduce((max, p) => p.services.reduce((sMax, s) => Math.max(sMax, Number(s.barcode.slice(-4)) || 0), max), 0)
    const maxId = protocols.reduce((max, p) => Math.max(max, p.id), 0)
    protocolCounter = Math.max(protocolCounter, maxProtocolNo)
    serviceCounter = Math.max(serviceCounter, maxBarcode)
    serviceIdSeq = Math.max(serviceIdSeq, maxId)
  }, [protocols])

  const addProtocol = (protocol: Omit<Protocol, 'id' | 'protocolNo'>) => {
    const id = ++serviceIdSeq + Date.now()
    const newProtocol: Protocol = { ...protocol, id, protocolNo: generateProtocolNo(), services: [], payments: [] }
    setProtocols((prev) => [newProtocol, ...prev])
    return id
  }

  const removeProtocol = (id: number) => {
    setProtocols((prev) => prev.filter((p) => p.id !== id))
  }

  const removeProtocolsForPatient = (patientId: number) => {
    setProtocols((prev) => prev.filter((p) => p.patientId !== patientId))
  }

  const addServiceToProtocol = (
    protocolId: number,
    service: Omit<ProtocolService, 'id' | 'protocolId' | 'barcode' | 'totalPrice'>
  ) => {
    const id = ++serviceIdSeq
    const barcode = generateBarcode()
    const totalPrice = calculateTotal(service.price, service.vatRate)
    const newService: ProtocolService = {
      ...service,
      id,
      protocolId,
      barcode,
      totalPrice,
    }
    setProtocols((prev) =>
      prev.map((p) =>
        p.id === protocolId ? { ...p, services: [newService, ...p.services] } : p
      )
    )
  }

  const updateServiceInProtocol = (
    protocolId: number,
    serviceId: number,
    updates: Partial<Omit<ProtocolService, 'id' | 'protocolId' | 'totalPrice'>>
  ) => {
    setProtocols((prev) =>
      prev.map((p) =>
        p.id === protocolId
          ? {
              ...p,
              services: p.services.map((s) =>
                s.id === serviceId
                  ? {
                      ...s,
                      ...updates,
                      totalPrice:
                        updates.price !== undefined || updates.vatRate !== undefined
                          ? calculateTotal(updates.price ?? s.price, updates.vatRate ?? s.vatRate)
                          : s.totalPrice,
                    }
                  : s
              ),
            }
          : p
      )
    )
  }

  const removeServiceFromProtocol = (protocolId: number, serviceId: number) => {
    setProtocols((prev) =>
      prev.map((p) =>
        p.id === protocolId
          ? { ...p, services: p.services.filter((s) => s.id !== serviceId) }
          : p
      )
    )
  }

  const addPaymentToProtocol = (
    protocolId: number,
    payment: Omit<ProtocolPayment, 'id' | 'protocolId'>
  ) => {
    const id = ++serviceIdSeq + Date.now()
    const newPayment: ProtocolPayment = { ...payment, id, protocolId }
    setProtocols((prev) =>
      prev.map((p) =>
        p.id === protocolId ? { ...p, payments: [newPayment, ...p.payments] } : p
      )
    )
  }

  const removePaymentFromProtocol = (protocolId: number, paymentId: number) => {
    setProtocols((prev) =>
      prev.map((p) =>
        p.id === protocolId
          ? { ...p, payments: p.payments.filter((pay) => pay.id !== paymentId) }
          : p
      )
    )
  }

  return (
    <ProtocolsContext.Provider
      value={{
        protocols,
        addProtocol,
        removeProtocol,
        removeProtocolsForPatient,
        addServiceToProtocol,
        updateServiceInProtocol,
        removeServiceFromProtocol,
        addPaymentToProtocol,
        removePaymentFromProtocol,
      }}
    >
      {children}
    </ProtocolsContext.Provider>
  )
}

export function useProtocols() {
  const context = useContext(ProtocolsContext)
  if (!context) {
    throw new Error('useProtocols must be used within a ProtocolsProvider')
  }
  return context
}
