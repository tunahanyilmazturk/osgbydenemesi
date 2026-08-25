import { useMemo, useState } from 'react'
import { ArrowLeft, Calendar, Check, ChevronRight, Mail, Phone, Save, User, Wallet, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCompanies } from '@/state/CompaniesContext'
import { usePatients } from '@/state/PatientsContext'
import { useProtocols } from '@/state/ProtocolsContext'
import { useExamTypes } from '@/state/ExamTypesContext'
import { PageHeader } from '@/shared/components/PageHeader'
import { ServiceSelector } from '@/pages/protocols/components/ServiceSelector'
import { VezneStep, type LocalPayment } from '@/pages/protocols/components/VezneStep'
import { ProtocolInfoStep } from '@/pages/protocols/components/ProtocolInfoStep'
import { CompanySelect } from '@/shared/components/ui/CompanySelect'
import type { ProtocolService } from '@/shared/types'
import { nowLocalDate, nowLocalDateTime } from '@/shared/lib/date'
import { PatientAvatar } from '@/shared/components/ui/PatientAvatar'

function calculateTotal(price: number, vatRate: number) {
  return Number((price * (1 + vatRate / 100)).toFixed(2))
}

export function NewProtocol() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { patients, updatePatient } = usePatients()
  const { addProtocol, addServiceToProtocol, addPaymentToProtocol } = useProtocols()
  const { activeCompanies } = useCompanies()
  const { examTypes } = useExamTypes()

  const patient = useMemo(
    () => patients.find((p) => p.id === Number(patientId)),
    [patients, patientId]
  )

  const [step, setStep] = useState<1 | 2 | 3>(1)

  const [form, setForm] = useState(() => ({
    protocolDate: nowLocalDateTime(),
    status: 'Sonuç Bekleniyor',
    company: patient?.company || 'Bireysel',
    examType: examTypes[0]?.name ?? 'İşe Giriş Muayene',
    department: '',
    occupation: '',
    description: '',
  }))

  // Protokol açılış notu uyarısı
  const selectedCompany = useMemo(
    () => activeCompanies.find((c) => c.name === form.company),
    [activeCompanies, form.company]
  )

  const protocolNoteKey = selectedCompany
    ? `protocolNoteDismissed_${selectedCompany.id}_${nowLocalDate()}`
    : null
  const [dismissedProtocolNoteKey, setDismissedProtocolNoteKey] = useState<string | null>(null)
  const showProtocolNote = Boolean(
    selectedCompany?.protocolNote.trim()
      && protocolNoteKey
      && dismissedProtocolNoteKey !== protocolNoteKey
      && localStorage.getItem(protocolNoteKey) !== 'true'
  )

  const dismissProtocolNote = (dontShowToday: boolean) => {
    if (!protocolNoteKey) return
    setDismissedProtocolNoteKey(protocolNoteKey)
    if (dontShowToday) localStorage.setItem(protocolNoteKey, 'true')
  }

  const [selectedServices, setSelectedServices] = useState<Array<{
    id: number
    code: number
    name: string
    group: string
    price: number
    vatRate: number
    totalPrice: number
    status: string
    recordedBy: string
    processDate: string
  }>>([])

  const [payments, setPayments] = useState<LocalPayment[]>([])

  const totalServiceAmount = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.totalPrice, 0),
    [selectedServices]
  )

  const totalKdv = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.totalPrice - s.price), 0),
    [selectedServices]
  )

  const totalPaid = useMemo(
    () => payments.filter((p) => p.paymentType !== 'İndirim').reduce((sum, p) => sum + p.amount, 0),
    [payments]
  )

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddService = (
    service: Omit<ProtocolService, 'id' | 'protocolId' | 'barcode' | 'totalPrice'>
  ) => {
    const id = Date.now() + Math.random()
    const totalPrice = calculateTotal(service.price, service.vatRate)
    setSelectedServices((prev) => [
      { ...service, id, totalPrice },
      ...prev,
    ])
  }

  const handleRemoveService = (serviceId: number) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId))
  }

  const handleUpdateService = (serviceId: number, updates: { price?: number; vatRate?: number }) => {
    setSelectedServices((prev) =>
      prev.map((s) => {
        if (s.id !== serviceId) return s
        const price = updates.price ?? s.price
        const vatRate = updates.vatRate ?? s.vatRate
        return { ...s, price, vatRate, totalPrice: calculateTotal(price, vatRate) }
      })
    )
  }

  const handleAddPayment = (payment: Omit<LocalPayment, 'id'>) => {
    const id = Date.now() + Math.random()
    setPayments((prev) => [{ ...payment, id }, ...prev])
  }

  const handleRemovePayment = (paymentId: number) => {
    setPayments((prev) => prev.filter((p) => p.id !== paymentId))
  }

  const handleFinalSubmit = () => {
    if (!patient) return
    if (!form.company.trim()) {
      setStep(1)
      return
    }
    const newProtocolId = addProtocol({
      ...form,
      company: form.company.trim(),
      patientId: patient.id,
      services: [],
      payments: [],
    })
    updatePatient(patient.id, {
      company: form.company.trim(),
      type: form.examType.replace(/\s*Muayene$/, ''),
    })
    selectedServices.forEach((s) => {
      addServiceToProtocol(newProtocolId, {
        code: s.code,
        name: s.name,
        group: s.group,
        status: s.status,
        price: s.price,
        vatRate: s.vatRate,
        recordedBy: s.recordedBy,
        processDate: s.processDate,
      })
    })
    payments.forEach((p) => {
      addPaymentToProtocol(newProtocolId, {
        paymentDate: p.paymentDate,
        paymentType: p.paymentType,
        amount: p.amount,
        description: p.description,
        recordedBy: p.recordedBy,
      })
    })
    navigate(`/hasta-kayit/protokol/${patient.id}/${newProtocolId}`)
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  const goToStep = (target: 1 | 2 | 3) => {
    if (target >= 2 && !form.company.trim()) {
      setStep(1)
      return
    }
    if (target === 3 && selectedServices.length === 0) {
      setStep(2)
      return
    }
    setStep(target)
  }

  const backToList = () => navigate(`/hasta-kayit/protokol/${patientId}`)

  if (!patient) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <p className="text-slate-600">Hasta bulunamadı.</p>
        <button
          onClick={() => navigate('/hasta-kayit')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          Listeye Dön
        </button>
      </div>
    )
  }

  const stepItems = [
    { key: 1 as const, label: 'Protokol Bilgileri' },
    { key: 2 as const, label: 'Firma ve Hizmet' },
    { key: 3 as const, label: 'Vezne Ödemesi' },
  ]

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <PageHeader
        title="Yeni Protokol"
        subtitle={`${patient.name} — Adım ${step}/3`}
        className="shrink-0 mb-0"
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 grid-rows-1 gap-3">
        {/* Sidebar */}
        <div className="lg:col-span-3 h-full min-h-0">
          <div className="h-full overflow-y-auto flex flex-col gap-3">
          {/* Patient card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <PatientAvatar gender={patient.gender} name={patient.name} photoSrc={patient.photo} size="md" />
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 text-sm truncate">{patient.name}</h3>
                <p className="text-xs text-slate-500">{patient.tc}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('tr-TR') : '-'}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-500" />
                {patient.gender}
              </span>
              {patient.phone && (
                <span className="flex items-center gap-1.5 truncate" title={patient.phone}>
                  <Phone className="w-3.5 h-3.5 text-blue-500" />
                  {patient.phone}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1.5 truncate" title={patient.email}>
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  {patient.email}
                </span>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h3 className="text-xs font-bold text-slate-800 mb-2">Adımlar</h3>
            <div className="space-y-2">
              {stepItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => goToStep(item.key)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-medium transition-colors ${
                    step === item.key
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                    step > item.key ? 'bg-emerald-600 text-white' : step === item.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {step > item.key ? <Check className="w-3 h-3" /> : item.key}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {step === item.key && <ChevronRight className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h3 className="text-xs font-bold text-slate-800 mb-2">Özet</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Firma:</span>
                <span className="font-medium text-slate-800 text-right truncate max-w-[60%]">{form.company}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Muayene:</span>
                <span className="font-medium text-slate-800 text-right truncate max-w-[60%]">{form.examType.replace(/\s*Muayene$/, '')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Hizmet:</span>
                <span className="font-medium text-slate-800">{selectedServices.length}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-100 flex justify-between text-slate-800 font-bold">
                <span>Toplam:</span>
                <span>₺{totalServiceAmount.toFixed(2)}</span>
              </div>
              {step === 3 && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Ödenen:</span>
                    <span className="font-medium text-emerald-600">₺{totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-bold">
                    <span>Kalan:</span>
                    <span className={totalServiceAmount - totalPaid <= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      ₺{(totalServiceAmount - totalPaid).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-auto pt-2 space-y-2">
            <div className="flex gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => goToStep(step === 3 ? 2 : 1)}
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
            {step === 3 ? (
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                <Save className="w-4 h-4" />
                Protokol Oluştur
              </button>
            ) : step === 2 ? (
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                <Wallet className="w-4 h-4" />
                Vezneye Devam Et
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                form="protocol-form"
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Devam Et
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-9 h-full min-h-0 flex flex-col">
          {step === 1 ? (
            <ProtocolInfoStep
              form={form}
              update={update}
              examTypes={examTypes}
              activeCompanies={activeCompanies}
              selectedCompany={selectedCompany}
              showProtocolNote={showProtocolNote}
              dismissProtocolNote={dismissProtocolNote}
              onSubmit={handleStep1Submit}
              onNavigateCompanies={() => navigate('/ayarlar/firmalar')}
            />
          ) : step === 2 ? (
            <div className="h-full flex flex-col min-h-0 gap-2">
              <div className="shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-2.5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-end">
                  <CompanySelect
                    label="Firma"
                    value={form.company}
                    onChange={(value) => update('company', value)}
                    companies={activeCompanies}
                    placeholder="Firma ara veya seç..."
                  />
                  <div className="md:col-span-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl flex items-center justify-between">
                    <span className="text-slate-400">Toplam Seçili Hizmet</span>
                    <span className="font-bold text-slate-800">
                      {selectedServices.length} hizmet — ₺{totalServiceAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-2.5">
                <ServiceSelector
                  company={form.company}
                  companyServices={selectedCompany?.companyServices ?? []}
                  selectedServices={selectedServices}
                  onAddService={handleAddService}
                  onRemoveService={handleRemoveService}
                  onUpdateService={handleUpdateService}
                />
              </div>
            </div>
          ) : (
            <VezneStep
              totalAmount={totalServiceAmount}
              totalKdv={totalKdv}
              payments={payments}
              onAddPayment={handleAddPayment}
              onRemovePayment={handleRemovePayment}
              companyName={form.company}
              paymentType={selectedCompany?.paymentType ?? 'Bireysel'}
            />
          )}
        </div>
      </div>
    </div>
  )
}
