import { createContext, useContext, useEffect, useState } from 'react'
import type { ServiceCatalogItem, ServicePackage } from '../types'
import { loadFromStorage, saveToStorage } from '../utils/storage'

export interface ServiceGroup {
  id: number
  name: string
  color: string
}

const defaultGroups: ServiceGroup[] = [
  { id: 1, name: 'Biyokimya', color: 'blue' },
  { id: 2, name: 'Hematoloji', color: 'red' },
  { id: 3, name: 'Radyoloji', color: 'violet' },
  { id: 4, name: 'Odyometri', color: 'amber' },
  { id: 5, name: 'Aşı', color: 'emerald' },
  { id: 6, name: 'Diğer', color: 'slate' },
]

const groupColorClasses: Record<string, { bg: string; text: string; dot: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-50' },
  red: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-50' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-50' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-50' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-50' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-50' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-50' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-50' },
}

export const DEFAULT_VAT_RATE = 0

export function getGroupColor(color: string) {
  return groupColorClasses[color] ?? groupColorClasses.slate
}

interface ServicesContextType {
  catalog: ServiceCatalogItem[]
  packages: ServicePackage[]
  groups: ServiceGroup[]
  addCatalogItem: (item: Omit<ServiceCatalogItem, 'id'>) => void
  updateCatalogItem: (id: number, updates: Partial<Omit<ServiceCatalogItem, 'id'>>) => void
  removeCatalogItem: (id: number) => void
  addPackage: (pkg: Omit<ServicePackage, 'id'>) => void
  updatePackage: (id: number, updates: Partial<Omit<ServicePackage, 'id'>>) => void
  removePackage: (id: number) => void
  addGroup: (name: string, color: string) => void
  updateGroup: (id: number, updates: Partial<Omit<ServiceGroup, 'id'>>) => void
  removeGroup: (id: number) => void
}

const defaultCatalog: ServiceCatalogItem[] = [
  { id: 1, name: 'TETANOZ', group: 'Aşı', price: 150, vatRate: 0, companies: [] },
  { id: 2, name: 'EKG (ELEKTROKARDİYOGRAFİ)', group: 'Radyoloji', price: 0, vatRate: 0, companies: [] },
  { id: 3, name: 'GLİKOZ (Biyokimya-AKS/Açlık Kan Şekeri)', group: 'Biyokimya', price: 0, vatRate: 0, companies: [] },
  { id: 4, name: 'GÖZ TARAMASI (otorefraktometre)', group: 'Odyometri', price: 0, vatRate: 0, companies: [] },
  { id: 5, name: 'HbA1c / Hemoglobin A1C', group: 'Biyokimya', price: 0, vatRate: 0, companies: [] },
  { id: 6, name: 'İşitme Testi (ODYOMETRİ)', group: 'Odyometri', price: 0, vatRate: 0, companies: [] },
  { id: 7, name: 'KAN GRUBU', group: 'Hematoloji', price: 0, vatRate: 0, companies: [] },
  { id: 8, name: 'MOTHERSON SAS 26', group: 'Diğer', price: 1000, vatRate: 0, companies: ['Polimer OSGB (Erdos)'] },
  { id: 9, name: 'PA AKCİĞER GRAFİSİ (Posteroanterior)', group: 'Radyoloji', price: 0, vatRate: 0, companies: [] },
  { id: 10, name: 'Tam İdrar Tetkiki (TİT, Tam İdrar Tahlili)', group: 'Biyokimya', price: 0, vatRate: 0, companies: [] },
  { id: 11, name: 'Tam Kan Sayımı (Hemogram - CBC)', group: 'Hematoloji', price: 0, vatRate: 0, companies: [] },
]

const defaultPackages: ServicePackage[] = [
  { id: 1, name: 'İşe Giriş Paketi', companies: ['Polimer OSGB (Erdos)'], price: 1000, services: [{ serviceId: 2 }, { serviceId: 3 }, { serviceId: 7 }, { serviceId: 11 }, { serviceId: 9 }] },
  { id: 2, name: 'Periyodik Muayene Paketi', companies: ['Polimer OSGB (Erdos)'], price: 850, services: [{ serviceId: 3 }, { serviceId: 7 }, { serviceId: 11 }] },
  { id: 3, name: 'Genel Sağlık Tarama Paketi', companies: [], price: 1200, services: [{ serviceId: 2 }, { serviceId: 3 }, { serviceId: 5 }, { serviceId: 7 }, { serviceId: 9 }, { serviceId: 11 }] },
]

const ServicesContext = createContext<ServicesContextType | null>(null)

const CATALOG_KEY = 'cetka-service-catalog'
const PACKAGES_KEY = 'cetka-service-packages'
const GROUPS_KEY = 'cetka-service-groups'

let catalogIdSeq = 100
let packageIdSeq = 100
let groupIdSeq = 100

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>(() => loadFromStorage(CATALOG_KEY, defaultCatalog))
  const [packages, setPackages] = useState<ServicePackage[]>(() => loadFromStorage(PACKAGES_KEY, defaultPackages))
  const [groups, setGroups] = useState<ServiceGroup[]>(() => loadFromStorage(GROUPS_KEY, defaultGroups))

  useEffect(() => saveToStorage(CATALOG_KEY, catalog), [catalog])
  useEffect(() => saveToStorage(PACKAGES_KEY, packages), [packages])
  useEffect(() => saveToStorage(GROUPS_KEY, groups), [groups])

  useEffect(() => {
    catalogIdSeq = Math.max(catalogIdSeq, ...catalog.map((item) => item.id))
    packageIdSeq = Math.max(packageIdSeq, ...packages.map((pkg) => pkg.id))
    groupIdSeq = Math.max(groupIdSeq, ...groups.map((group) => group.id))
  }, [catalog, packages, groups])

  const addCatalogItem = (item: Omit<ServiceCatalogItem, 'id'>) => {
    const id = ++catalogIdSeq + Date.now()
    setCatalog((prev) => [...prev, { ...item, id }])
  }

  const updateCatalogItem = (id: number, updates: Partial<Omit<ServiceCatalogItem, 'id'>>) => {
    setCatalog((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  const removeCatalogItem = (id: number) => {
    setCatalog((prev) => prev.filter((c) => c.id !== id))
  }

  const addPackage = (pkg: Omit<ServicePackage, 'id'>) => {
    const id = ++packageIdSeq + Date.now()
    setPackages((prev) => [...prev, { ...pkg, id }])
  }

  const updatePackage = (id: number, updates: Partial<Omit<ServicePackage, 'id'>>) => {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const removePackage = (id: number) => {
    setPackages((prev) => prev.filter((p) => p.id !== id))
  }

  const addGroup = (name: string, color: string) => {
    const id = ++groupIdSeq + Date.now()
    setGroups((prev) => [...prev, { id, name, color }])
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

  return (
    <ServicesContext.Provider
      value={{
        catalog,
        packages,
        groups,
        addCatalogItem,
        updateCatalogItem,
        removeCatalogItem,
        addPackage,
        updatePackage,
        removePackage,
        addGroup,
        updateGroup,
        removeGroup,
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
