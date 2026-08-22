import { useRef, useState } from 'react'
import { ArrowLeft, Camera, Save, User, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePatients } from '../../context/PatientsContext'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/PageHeader'
import { Select } from '../../components/ui/Select'

const initialForm = {
  firstName: '',
  lastName: '',
  tc: '',
  birthDate: '',
  gender: 'Erkek',
  motherName: '',
  fatherName: '',
  passportNo: '',
  registrationNo: '',
  phone: '',
  homePhone: '',
  email: '',
  address: '',
  company: '',
  type: 'İşe Giriş',
  status: 'Bekliyor',
  notes: '',
}

export function NewPatient() {
  const navigate = useNavigate()
  const { addPatient } = usePatients()
  const [form, setForm] = useState(initialForm)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = `${form.firstName} ${form.lastName}`.trim()
    const newId = addPatient({
      ...form,
      name,
    })
    navigate(`/hasta-kayit/protokol/${newId}/yeni`)
  }

  const cancel = () => navigate('/hasta-kayit')

  return (
    <div>
      <PageHeader
        title="Yeni Hasta Kaydı"
        subtitle="Tüm alanları eksiksiz doldurunuz."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancel}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Vazgeç
            </button>
            <button
              type="submit"
              form="patient-form"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              <Save className="w-4 h-4" />
              Kaydet
            </button>
          </div>
        }
      />

      <form id="patient-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Kimlik Bilgileri */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-50 rounded-full" />
              Kimlik Bilgileri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input size="sm" label="TC Kimlik No" value={form.tc} onChange={(e) => update('tc', e.target.value)} placeholder="12345678901" maxLength={11} required />
              <Input size="sm" label="Sicil No" value={form.registrationNo} onChange={(e) => update('registrationNo', e.target.value)} placeholder="Sicil numarası" />
              <Input size="sm" label="Adı" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} placeholder="Adı" required />
              <Input size="sm" label="Soyadı" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} placeholder="Soyadı" required />
              <Input size="sm" label="Doğum Tarihi" type="date" value={form.birthDate} onChange={(e) => update('birthDate', e.target.value)} />
              <Select size="sm" label="Cinsiyet" value={form.gender} onChange={(e) => update('gender', e.target.value)} options={[{ value: 'Erkek', label: 'Erkek' }, { value: 'Kadın', label: 'Kadın' }]} />
              <Input size="sm" label="Anne Adı" value={form.motherName} onChange={(e) => update('motherName', e.target.value)} placeholder="Anne adı" />
              <Input size="sm" label="Baba Adı" value={form.fatherName} onChange={(e) => update('fatherName', e.target.value)} placeholder="Baba adı" />
              <Input size="sm" label="Pasaport No" value={form.passportNo} onChange={(e) => update('passportNo', e.target.value)} placeholder="Pasaport numarası" />
            </div>
          </div>

          {/* Fotoğraf ve İletişim Bilgileri */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-50 rounded-full" />
              Fotoğraf ve İletişim Bilgileri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Avatar */}
              <div className="flex flex-col items-center justify-start gap-3">
                <div
                  className={`w-28 h-28 rounded-2xl border-2 flex items-center justify-center overflow-hidden transition-colors ${
                    form.gender === 'Kadın'
                      ? 'bg-pink-100 text-pink-600 border-pink-200'
                      : 'bg-blue-100 text-blue-600 border-blue-200'
                  }`}
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Hasta fotoğrafı"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-14 h-14" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={triggerPhotoUpload}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Fotoğraf Yükle
                </button>
              </div>

              {/* Contact fields */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input size="sm" label="GSM" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="05XX XXX XX XX" />
                <Input size="sm" label="Ev Tel" value={form.homePhone} onChange={(e) => update('homePhone', e.target.value)} placeholder="Ev telefonu" />
                <Input size="sm" label="e-Posta" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="ornek@email.com" />
                <Input size="sm" label="Adres" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Adres bilgisi" />
              </div>
            </div>
          </div>

          {/* Ek Bilgiler */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-violet-50 rounded-full" />
              Ek Bilgiler
            </h3>
            <Input size="sm" label="Uyarı / Açıklama" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Özel not veya uyarı" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Hasta Listesine Dön
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        </div>
      </form>
    </div>
  )
}
