import { useState } from 'react'
import { AlertCircle, ArrowLeft, Building2, Check, ChevronRight, Phone, Plus, Save, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCompanies, type Company, type CompanyType, type DangerClass, type PaymentType } from '@/state/CompaniesContext'
import { useServices } from '@/state/ServicesContext'
import { useToast } from '@/state/ToastContext'
import { PageHeader } from '@/shared/components/PageHeader'
import { CompanyServices } from '@/pages/companies/components/CompanyServices'
import { CompanyGeneralStep } from '@/pages/companies/components/CompanyGeneralStep'
import { CompanyContactStep } from '@/pages/companies/components/CompanyContactStep'
import { CompanyNotesStep } from '@/pages/companies/components/CompanyNotesStep'

const companyTypes: CompanyType[] = ['Ana Firma', 'Alt İşveren', 'Müşteri', 'Tedarikçi']
const dangerClasses: DangerClass[] = ['Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli']
const paymentTypes: PaymentType[] = ['Bireysel', 'Fatura']

const emptyCompany: Omit<Company, 'id'> = {
  name: '',
  taxNumber: '',
  taxOffice: '',
  phone: '',
  email: '',
  address: '',
  contactPerson: '',
  contactPhone: '',
  sgkNumber: '',
  companyType: 'Ana Firma',
  dangerClass: 'Az Tehlikeli',
  paymentType: 'Bireysel',
  contractDate: '',
  protocolNote: '',
  companyServices: [],
  active: true,
  notes: '',
  smsOnResultReady: false,
  ek2DoctorId: '',
}

const dangerColors: Record<DangerClass, string> = {
  'Az Tehlikeli': 'bg-emerald-50 border-emerald-300 text-emerald-700',
  'Tehlikeli': 'bg-amber-50 border-amber-300 text-amber-700',
  'Çok Tehlikeli': 'bg-red-50 border-red-300 text-red-700',
}

export function NewCompany() {
  const navigate = useNavigate()
  const { companyId } = useParams<{ companyId: string }>()
  const isEditing = Boolean(companyId)
  const { companies, addCompany, updateCompany } = useCompanies()
  const { catalog, groups } = useServices()
  const { showToast } = useToast()
  const existingCompany = isEditing
    ? companies.find((c) => c.id === Number(companyId))
    : undefined

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  const [form, setForm] = useState<Omit<Company, 'id'>>(() => {
    if (existingCompany) {
      const { id, ...rest } = existingCompany
      void id
      return rest
    }
    return emptyCompany
  })

  const companyServicesTotal = form.companyServices.reduce((sum, cs) => {
    const item = catalog.find((c) => c.id === cs.serviceId)
    if (!item) return sum
    return sum + cs.customPrice * (1 + (cs.customVatRate ?? item.vatRate) / 100)
  }, 0)

  const update = (field: keyof Omit<Company, 'id'>, value: string | boolean) => {
    const normalizedValue =
      typeof value === 'string' && (field === 'taxNumber' || field === 'sgkNumber')
        ? value.replace(/\D/g, '')
        : value
    setForm((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  const goToStep = (target: number) => {
    const t = Math.max(1, Math.min(4, Math.floor(target))) as 1 | 2 | 3 | 4
    if (t >= 2 && !form.name.trim()) {
      setStep(1)
      return
    }
    setStep(t)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      showToast('warning', 'Firma adı gerekli', 'Lütfen firma adını girin.')
      setStep(1)
      return
    }
    const normalizedName = form.name.trim().toLocaleLowerCase('tr-TR')
    if (companies.some((company) => company.id !== existingCompany?.id && company.name.trim().toLocaleLowerCase('tr-TR') === normalizedName)) {
      showToast('warning', 'Firma zaten kayıtlı', 'Aynı adla ikinci bir firma oluşturamazsınız.')
      setStep(1)
      return
    }
    if (form.taxNumber && form.taxNumber.length !== 10) {
      showToast('warning', 'Geçersiz vergi numarası', 'Vergi numarası 10 rakamdan oluşmalıdır.')
      setStep(1)
      return
    }
    if (form.taxNumber && companies.some((company) => company.id !== existingCompany?.id && company.taxNumber === form.taxNumber)) {
      showToast('warning', 'Vergi numarası kullanılıyor', 'Bu vergi numarası başka bir firmaya ait.')
      setStep(1)
      return
    }
    const normalizedForm = { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() }
    if (isEditing && existingCompany) {
      updateCompany(existingCompany.id, normalizedForm)
      showToast('success', 'Firma güncellendi', `"${normalizedForm.name}" firma bilgileri güncellendi.`)
    } else {
      addCompany(normalizedForm)
      showToast('success', 'Firma oluşturuldu', `"${normalizedForm.name}" başarıyla eklendi.`)
    }
    navigate('/ayarlar/firmalar')
  }

  const backToList = () => navigate('/ayarlar/firmalar')

  const stepItems = [
    { key: 1 as const, label: 'Kurumsal', icon: Building2 },
    { key: 2 as const, label: 'Ödeme & İletişim', icon: Phone },
    { key: 3 as const, label: 'Firma Testleri', icon: Plus },
    { key: 4 as const, label: 'Notlar & Kayıt', icon: AlertCircle },
  ]

  return (
    <div className="h-full flex flex-col gap-3">
      <PageHeader
        title={isEditing ? 'Firma Düzenle' : 'Yeni Firma'}
        subtitle={`${form.name || 'Yeni firma'} — Adım ${step}/4`}
        className="shrink-0 mb-0"
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 grid-rows-1 gap-3">
        {/* Sidebar */}
        <div className="lg:col-span-3 h-full min-h-0">
          <div className="h-full overflow-y-auto flex flex-col gap-3">
            {/* Steps */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h3 className="text-xs font-bold text-slate-800 mb-3">Adımlar</h3>
              <div className="space-y-1.5">
                {stepItems.map((item) => {
                  const Icon = item.icon
                  const isActive = step === item.key
                  const isDone = step > item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => goToStep(item.key)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : isDone
                          ? 'text-slate-600 hover:bg-slate-50'
                          : 'text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isDone
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{item.label}</p>
                        <p className="text-[10px] text-slate-400">Adım {item.key}</p>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-blue-500 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h3 className="text-xs font-bold text-slate-800 mb-2">Özet</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Firma Adı:</span>
                  <span className="font-medium text-slate-800 text-right truncate max-w-[60%]">
                    {form.name || '—'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tür:</span>
                  <span className="font-medium text-slate-800">{form.companyType}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tehlike:</span>
                  <span className="font-medium text-slate-800">{form.dangerClass}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Ödeme:</span>
                  <span className={`font-medium ${form.paymentType === 'Fatura' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {form.paymentType}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Test:</span>
                  <span className="font-medium text-slate-800">{form.companyServices.length}</span>
                </div>
                {form.companyServices.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-100 flex justify-between text-slate-800 font-bold">
                    <span>Test Toplam:</span>
                    <span>₺{companyServicesTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-slate-100 flex justify-between">
                  <span className="text-slate-600">Durum:</span>
                  <span className={`font-medium ${form.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {form.active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-auto pt-2 space-y-2">
              <div className="flex gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => goToStep(step - 1)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Geri
                  </button>
                )}
                <button
                  type="button"
                  onClick={backToList}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Vazgeç
                </button>
              </div>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => goToStep(step + 1)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Devam Et
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  form="company-form"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Güncelle' : 'Kaydet'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-9 h-full min-h-0 flex flex-col">
          <form id="company-form" onSubmit={handleSubmit} className="h-full flex flex-col">
            {/* Step 1: Kurumsal Bilgiler */}
            {step === 1 && (
              <CompanyGeneralStep form={form} update={update} companyTypes={companyTypes} />
            )}

            {/* Step 2: Ödeme ve İletişim */}
            {step === 2 && (
              <CompanyContactStep
                form={form}
                update={update}
                paymentTypes={paymentTypes}
                dangerClasses={dangerClasses}
                dangerColors={dangerColors}
              />
            )}

            {/* Step 3: Firma Testleri */}
            {step === 3 && (
              <CompanyServices form={form} setForm={setForm} catalog={catalog} groups={groups} />
            )}

            {/* Step 4: Notlar ve Kayıt */}
            {step === 4 && (
              <CompanyNotesStep form={form} update={update} isEditing={isEditing} />
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
