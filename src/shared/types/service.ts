export interface ServiceGroup {
  id: number
  name: string
  color: string
  labIds: number[]
  defaultTubeTypeId: number | null
}

export interface ServiceTubeType {
  id: number
  name: string
  barcodeShortName?: string
  colorCode: string
  description: string
  isActive: boolean
}

export interface ServiceCatalogItem {
  id: number
  code: number
  name: string
  group: string
  price: number
  vatRate: number
  isActive: boolean
  description: string
  unit: string
  referenceRange: string
  labIds: number[]
  tubeTypeId: number | null
}

export interface PackageService {
  serviceId: number
  customPrice?: number
  customVatRate?: number
}

export interface ServicePackage {
  id: number
  name: string
  companies: string[]
  price: number
  services: PackageService[]
}
