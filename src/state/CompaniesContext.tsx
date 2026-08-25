import { createContext, useContext, useEffect, useState } from 'react'
import { loadFromStorage, saveToStorage } from '@/shared/lib/storage'

export type CompanyType = 'Ana Firma' | 'Alt İşveren' | 'Müşteri' | 'Tedarikçi'
export type PaymentType = 'Bireysel' | 'Fatura'
export type DangerClass = 'Az Tehlikeli' | 'Tehlikeli' | 'Çok Tehlikeli'

export interface CompanyService {
  serviceId: number
  customPrice: number
  customVatRate?: number
}

export interface Company {
  id: number
  name: string
  taxNumber: string
  taxOffice: string
  phone: string
  email: string
  address: string
  contactPerson: string
  contactPhone: string
  sgkNumber: string
  companyType: CompanyType
  dangerClass: DangerClass
  paymentType: PaymentType
  contractDate: string
  protocolNote: string
  companyServices: CompanyService[]
  active: boolean
  notes: string
  smsOnResultReady?: boolean
}

const initialCompanies: Company[] = [
  {
    id: 1,
    name: 'ABC İnşaat',
    taxNumber: '1234567890',
    taxOffice: 'Kadıköy',
    phone: '0212 000 00 00',
    email: 'info@abcinsaat.com',
    address: 'Caferağa Mah. Moda Cad. No:12 Kadıköy/İstanbul',
    contactPerson: 'Ahmet Yılmaz',
    contactPhone: '0532 111 22 33',
    sgkNumber: '1234567',
    companyType: 'Ana Firma',
    dangerClass: 'Tehlikeli',
    paymentType: 'Fatura',
    contractDate: '2024-01-15',
    protocolNote: 'İşe giriş muayenelerinde tam kan sayımı zorunludur. Aşı kayıtları için SGK belgesi isteyiniz.',
    companyServices: [
      { serviceId: 11, customPrice: 50 },
      { serviceId: 3, customPrice: 30 },
      { serviceId: 9, customPrice: 120 },
      { serviceId: 2, customPrice: 80 },
    ],
    active: true,
    notes: 'Yıllık sözleşme',
  },
  {
    id: 2,
    name: 'XYZ Lojistik',
    taxNumber: '9876543210',
    taxOffice: 'Ataşehir',
    phone: '0216 000 00 00',
    email: 'iletisim@xyzlojistik.com',
    address: 'Küçükbakkalköy Mah. Atatürk Cad. No:45 Ataşehir/İstanbul',
    contactPerson: 'Mehmet Demir',
    contactPhone: '0533 222 33 44',
    sgkNumber: '7654321',
    companyType: 'Alt İşveren',
    dangerClass: 'Az Tehlikeli',
    paymentType: 'Bireysel',
    contractDate: '2024-03-01',
    protocolNote: '',
    companyServices: [
      { serviceId: 11, customPrice: 40 },
      { serviceId: 7, customPrice: 25 },
    ],
    active: true,
    notes: '',
  },
  {
    id: 3,
    name: 'MNO Tekstil',
    taxNumber: '1112223334',
    taxOffice: 'Bornova',
    phone: '0232 000 00 00',
    email: 'destek@mnotekstil.com',
    address: 'Kazımdirik Mah. Üniversite Cad. No:78 Bornova/İzmir',
    contactPerson: 'Ayşe Kaya',
    contactPhone: '0535 333 44 55',
    sgkNumber: '1112222',
    companyType: 'Müşteri',
    dangerClass: 'Çok Tehlikeli',
    paymentType: 'Fatura',
    contractDate: '2024-02-20',
    protocolNote: 'Periyodik muayeneler her ayın ilk haftası yapılacaktır. Gecikmiş muayeneler için işverene bildirim gönderiniz.',
    companyServices: [
      { serviceId: 11, customPrice: 45 },
      { serviceId: 3, customPrice: 25 },
      { serviceId: 9, customPrice: 100 },
      { serviceId: 2, customPrice: 70 },
      { serviceId: 6, customPrice: 60 },
      { serviceId: 4, customPrice: 50 },
    ],
    active: true,
    notes: 'Periyodik muayene sözleşmesi',
  },
]

interface CompaniesContextType {
  companies: Company[]
  activeCompanies: Company[]
  addCompany: (company: Omit<Company, 'id'>) => number
  updateCompany: (id: number, company: Partial<Company>) => void
  deleteCompany: (id: number) => void
  toggleActive: (id: number) => void
}

const CompaniesContext = createContext<CompaniesContextType | null>(null)
const STORAGE_KEY = 'cetka-companies'

let companyIdSeq = 100

export function CompaniesProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(() => loadFromStorage(STORAGE_KEY, initialCompanies))

  useEffect(() => {
    companyIdSeq = Math.max(companyIdSeq, ...companies.map((company) => company.id))
    saveToStorage(STORAGE_KEY, companies)
  }, [companies])

  const activeCompanies = companies.filter((c) => c.active)

  const addCompany = (company: Omit<Company, 'id'>) => {
    companyIdSeq = Math.max(companyIdSeq + 1, Date.now())
    const id = companyIdSeq
    setCompanies((prev) => [{ ...company, id }, ...prev])
    return id
  }

  const updateCompany = (id: number, updates: Partial<Company>) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }

  const deleteCompany = (id: number) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id))
  }

  const toggleActive = (id: number) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    )
  }

  return (
    <CompaniesContext.Provider
      value={{ companies, activeCompanies, addCompany, updateCompany, deleteCompany, toggleActive }}
    >
      {children}
    </CompaniesContext.Provider>
  )
}

export function useCompanies() {
  const context = useContext(CompaniesContext)
  if (!context) {
    throw new Error('useCompanies must be used within a CompaniesProvider')
  }
  return context
}
