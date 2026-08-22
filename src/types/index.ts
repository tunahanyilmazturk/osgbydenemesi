export type Page =
  | 'dashboard'
  | 'patients'
  | 'lab'
  | 'accounting'
  | 'stats'
  | 'settings'

export interface Patient {
  id: number
  name: string
  company: string
  type: string
  status: string
  time: string
  createdAt: string
}

export interface PatientDetail extends Patient {
  tc: string
  phone: string
  email: string
  birthDate: string
  gender: string
  address: string
  firstName?: string
  lastName?: string
  fatherName?: string
  motherName?: string
  registrationNo?: string
  passportNo?: string
  homePhone?: string
  notes?: string
}

export interface AudiometryData {
  includeBone: boolean
  right: {
    air: Record<string, number | null>
    bone: Record<string, number | null>
  }
  left: {
    air: Record<string, number | null>
    bone: Record<string, number | null>
  }
  resultText: string
}

export interface EyeExaminationData {
  examinationMode?: 'otorefraktometre' | 'eshel'
  rightEye: {
    sph: string
    cyl: string
    ax: string
    visualAcuity: string
    visualAcuityWithGlasses: string
    eyePressure: string
  }
  leftEye: {
    sph: string
    cyl: string
    ax: string
    visualAcuity: string
    visualAcuityWithGlasses: string
    eyePressure: string
  }
  colorBlindness: 'Yoktur' | 'Vardır' | 'İşaretsiz'
  needsGlasses: 'Yoktur' | 'Vardır' | 'İşaretsiz'
  nightBlindness: 'Yoktur' | 'Vardır' | 'İşaretsiz'
  screenUsage: 'Çalışabilir' | 'Çalışamaz' | 'İşaretsiz'
  highAltitude: 'Yoktur' | 'Vardır' | 'İşaretsiz'
  extraFindings?: { id: string; label: string; value: string; values?: string[] }[]
  evaluation: string
  diagnosis: string
  conclusion: string
  resultStatus: 'Sonuç Normal' | 'Sonuç Anormal' | 'Sonuç Değerlendirme'
  resultText: string
}

export interface ProtocolService {
  id: number
  protocolId: number
  status: string
  barcode: string
  processDate: string
  group: string
  name: string
  price: number
  vatRate: number
  totalPrice: number
  recordedBy: string
  // Laboratuvar sonuç yönetimi alanları
  result?: string
  resultText?: string
  oldResult?: string
  referenceRange?: string
  unit?: string
  lab?: string
  requestDate?: string
  acceptDate?: string
  approvedBy?: string
  approvedAt?: string
  // Odyometri ve göz taraması özel veri
  audiometryData?: string
  eyeExaminationData?: string
}

export interface ProtocolPayment {
  id: number
  protocolId: number
  paymentDate: string
  paymentType: string
  amount: number
  description: string
  recordedBy: string
}

export interface Protocol {
  id: number
  patientId: number
  protocolNo: string
  protocolDate: string
  status: string
  company: string
  examType: string
  department: string
  occupation: string
  description: string
  services: ProtocolService[]
  payments: ProtocolPayment[]
}

export interface ServiceCatalogItem {
  id: number
  name: string
  group: string
  price: number
  vatRate: number
  companies: string[]
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

export interface ScheduleItem {
  title: string
  time: string
}

export interface Activity {
  text: string
  time: string
}

export interface QuickAction {
  label: string
  icon: string
  color: string
}

export interface StatItem {
  label: string
  value: string | number
  change: string
  trend: 'up' | 'down'
  icon: string
  color: string
}

export interface ExternalLab {
  id: number
  active: boolean
  name: string
  institutionCode: string
  username: string
  webServiceAddress: string
  type: string
}
