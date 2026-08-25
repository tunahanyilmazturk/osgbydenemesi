import { useRef, useState } from 'react'
import { Download, MessageSquare, Printer, Save, ShieldAlert, Upload } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/state/ToastContext'
import { downloadLocalBackup, restoreLocalBackup } from '@/shared/lib/backup'

interface InstitutionForm {
  code: string
  name: string
  address: string
  phone: string
  authorizedPerson: string
  authorizedPhone: string
  officialEmail: string
  externalIp: string
  internalIp: string
  mailAddress: string
  mailPassword: string
  mailHost: string
  mailPort: string
  mailSslType: string
  showLabAntet: boolean
  showPdfAntet: boolean
  smsTitle: string
  smsUsername: string
  smsPassword: string
  smsProvider: string
  smsEnabled: boolean
  smsTemplate: string
  barcodeLabelTitle: string
  logo: string
  ministryLogo: string
  labReportTopAntet: string
  labReportBottomAntet: string
}

// Not: SMS ile ilgili tüm ayarlar (şablon, sağlayıcı, test, log) artık
// ayrı bir sayfada: /ayarlar/sms — SmsSettings.tsx

const defaultForm: InstitutionForm = {
  code: '',
  name: 'Çet-Ka OSGB',
  address: 'Ömerağa Mahallesi Cemil Karakadılar Caddesi No: 18/A, 41310 İzmit/KOCAELİ',
  phone: '0262 349 40 83',
  authorizedPerson: 'GÜNEY CANATAN',
  authorizedPhone: '0539 381 97 21',
  officialEmail: 'guneycanatan@kocaelisistemlab.com',
  externalIp: '',
  internalIp: '',
  mailAddress: 'raporlama@cetkaosgb.com',
  mailPassword: '',
  mailHost: 'smtp.yandex.com',
  mailPort: '587',
  mailSslType: 'StartTls',
  showLabAntet: true,
  showPdfAntet: true,
  smsTitle: 'ÇET-KA OSGB',
  smsUsername: '5305554409',
  smsPassword: '',
  smsProvider: 'netgsm',
  smsEnabled: false,
  smsTemplate: 'Sayin {hastaAd}, {kurumAd} tarafindan yapilan {protokolNo} numarali protokolunuzun tum tetkik sonuclari hazirdir. Raporunuzu asagidaki baglantidan PDF olarak goruntuleyebilirsiniz: {pdfLink}',
  barcodeLabelTitle: 'Çet-Ka OSGB',
  logo: '',
  ministryLogo: '',
  labReportTopAntet: '',
  labReportBottomAntet: '',
}

const STORAGE_KEY = 'cetka-institution'

function loadForm(): InstitutionForm {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<InstitutionForm> & { showWorkAntet?: boolean; bulkBarcodeLabelTitle?: string }
      const form: InstitutionForm = { ...defaultForm, ...parsed }
      if (parsed.showWorkAntet !== undefined) {
        form.showLabAntet = parsed.showWorkAntet
      }
      return form
    }
  } catch {
    // ignore
  }
  return { ...defaultForm }
}

function saveForm(form: InstitutionForm) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    return true
  } catch {
    return false
  }
}

export function Settings() {
  const [form, setForm] = useState<InstitutionForm>(loadForm())
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const backupInputRef = useRef<HTMLInputElement | null>(null)
  const { showToast } = useToast()

  const updateField = <K extends keyof InstitutionForm>(
    field: K,
    value: InstitutionForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = (field: keyof InstitutionForm, file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      updateField(field, reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    const ok = saveForm(form)
    if (ok) {
      showToast('success', 'Bilgiler güncellendi.')
    } else {
      showToast('error', 'Bilgiler kaydedilemedi', 'Tarayıcı depolama alanını kontrol edin.')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleBackup = () => {
    const count = downloadLocalBackup()
    showToast('success', 'Yedek indirildi', `${count} veri grubu güvenli dosyaya aktarıldı.`)
  }

  const handleRestore = async (file: File | null) => {
    if (!file) return
    if (!window.confirm('Mevcut yerel veriler yedekteki verilerle değiştirilecek. Devam edilsin mi?')) {
      if (backupInputRef.current) backupInputRef.current.value = ''
      return
    }
    try {
      await restoreLocalBackup(file)
      window.location.reload()
    } catch (error) {
      showToast('error', 'Yedek geri yüklenemedi', error instanceof Error ? error.message : 'Dosyayı kontrol edin.')
      if (backupInputRef.current) backupInputRef.current.value = ''
    }
  }

  const renderUploadBox = (label: string, field: keyof InstitutionForm) => (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-medium text-slate-600 mb-2">{label}</p>
      <div className="relative h-28 bg-slate-50 rounded-lg border border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
        {form[field] ? (
          <img
            src={form[field] as string}
            alt={label}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-[10px] text-slate-400">Yükle</span>
        )}
        <input
          ref={(el) => { fileInputRefs.current[field] = el }}
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(field, e.target.files?.[0] ?? null)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>
    </div>
  )

  const renderTextField = (
    label: string,
    field: keyof InstitutionForm,
    type: 'text' | 'email' | 'tel' | 'number' | 'password' = 'text',
    multiline = false
  ) => {
    const value = form[field] as string
    const inputClass =
      'w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500'
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <div className="md:col-span-2">
          {multiline ? (
            <textarea
              value={value}
              onChange={(e) => updateField(field, e.target.value)}
              className={`${inputClass} min-h-[60px] resize-none`}
              rows={2}
            />
          ) : (
            <input
              type={type}
              value={value}
              onChange={(e) => updateField(field, e.target.value)}
              className={inputClass}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="viewport-page">
      <PageHeader
        title="Kurum Bilgileri"
        subtitle="OSGB kurum bilgilerini, iletişim ve logo ayarlarını yönetin."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Kaydet
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Yazdır
            </button>
          </div>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSave()
        }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3 flex-1 min-h-0 overflow-y-auto"
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 space-y-3">
            {renderTextField('Kodu', 'code')}
            {renderTextField('Adı', 'name')}
            {renderTextField('Adres', 'address', 'text', true)}
            {renderTextField('Tel No', 'phone', 'tel')}
            {renderTextField('Yetkili Kişi', 'authorizedPerson')}
            {renderTextField('Yetkili Tel No', 'authorizedPhone', 'tel')}
            {renderTextField('Resmi Mail', 'officialEmail', 'email')}
            {renderTextField('Dış IP', 'externalIp')}
            {renderTextField('İç IP', 'internalIp')}
            {renderTextField('Sunucu Mail Adres', 'mailAddress', 'email')}
            {renderTextField('Sunucu Mail Şifre', 'mailPassword', 'password')}
            {renderTextField('Sunucu Mail Host', 'mailHost')}
            {renderTextField('Sunucu Mail Port', 'mailPort', 'number')}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
              <label className="text-xs font-medium text-slate-600">Sunucu Mail SSL Türü</label>
              <div className="md:col-span-2">
                <select
                  value={form.mailSslType}
                  onChange={(e) => updateField('mailSslType', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="None">None</option>
                  <option value="Auto">Auto</option>
                  <option value="SslOnConnect">SslOnConnect</option>
                  <option value="StartTls">StartTls</option>
                  <option value="StartTlsWhenAvailable">StartTlsWhenAvailable</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-center">
              <label className="text-xs font-medium text-slate-600">Antet Seçenekleri</label>
              <div className="md:col-span-2 space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.showLabAntet}
                    onChange={(e) => updateField('showLabAntet', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Lab. Çıktılarında Antet Olsun
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.showPdfAntet}
                    onChange={(e) => updateField('showPdfAntet', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Pdf Çıktılarında Antet Olsun
                </label>
              </div>
            </div>

            {renderTextField('SMS Başlık', 'smsTitle')}
            {renderTextField('SMS Kullanıcı Adı', 'smsUsername')}
            {renderTextField('SMS Şifre', 'smsPassword', 'password')}

            {/* SMS ayarları için bilgi notu */}
            <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
              <p className="text-[11px] text-blue-700">
                SMS şablonu, sağlayıcı seçimi, test gönderimi ve gönderim logu için{' '}
                <NavLink to="/ayarlar/sms" className="font-semibold underline">SMS Ayarları</NavLink>
                {' '}sayfasını kullanın.
              </p>
            </div>

            {renderTextField('Barkod Etiket Başlık', 'barcodeLabelTitle')}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 pt-2">
              <div className="md:col-start-2 md:col-span-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Yazdır
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-3">
            {renderUploadBox('Logo', 'logo')}
            {renderUploadBox('Bakanlık Logo', 'ministryLogo')}
            {renderUploadBox('Lab. Rapor Üst Antet', 'labReportTopAntet')}
            {renderUploadBox('Lab. Rapor Alt Antet', 'labReportBottomAntet')}
          </div>
        </div>

        <section className="border-t border-slate-100 pt-5" aria-labelledby="backup-title">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
            <div className="flex gap-3"><ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" /><div><h2 id="backup-title" className="text-sm font-bold text-slate-800">Yerel Veri Yedeği</h2><p className="text-xs text-slate-600 mt-1 max-w-2xl">Hasta, protokol, firma ve ayar verilerini tek dosyada saklayın. Yedek dosyası hassas bilgiler içerebilir; güvenli bir yerde tutun.</p></div></div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button type="button" onClick={handleBackup} className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-xl hover:bg-blue-50"><Download className="w-4 h-4" /> Yedek İndir</button>
              <button type="button" onClick={() => backupInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-amber-800 bg-white border border-amber-300 rounded-xl hover:bg-amber-100"><Upload className="w-4 h-4" /> Yedeği Geri Yükle</button>
              <input ref={backupInputRef} type="file" accept="application/json,.json" onChange={(event) => handleRestore(event.target.files?.[0] ?? null)} className="sr-only" aria-label="HanTech yedek dosyası seç" />
            </div>
          </div>
        </section>
      </form>
    </div>
  )
}
