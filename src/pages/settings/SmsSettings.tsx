import { useEffect, useState } from 'react'
import { CheckCircle2, MessageSquare, Save, Send, Trash2, XCircle } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { useToast } from '../../context/ToastContext'
import { sendTestSms, loadSmsLog, saveSmsLog, type SmsLogEntry } from '../../utils/sms'

interface SmsSettingsForm {
  smsTitle: string
  smsUsername: string
  smsPassword: string
  smsProvider: string
  smsEnabled: boolean
  smsTemplate: string
  externalIp: string
}

const INSTITUTION_KEY = 'cetka-institution'

const DEFAULT_TEMPLATE =
  'Sayin {hastaAd}, {kurumAd} tarafindan yapilan {protokolNo} numarali protokolunuzun tum tetkik sonuclari hazirdir. Raporunuzu asagidaki baglantidan PDF olarak goruntuleyebilirsiniz: {pdfLink}'

function loadForm(): SmsSettingsForm {
  try {
    const raw = localStorage.getItem(INSTITUTION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SmsSettingsForm>
      return {
        smsTitle: parsed.smsTitle ?? 'ÇET-KA OSGB',
        smsUsername: parsed.smsUsername ?? '',
        smsPassword: parsed.smsPassword ?? '',
        smsProvider: parsed.smsProvider ?? 'netgsm',
        smsEnabled: parsed.smsEnabled ?? false,
        smsTemplate: parsed.smsTemplate ?? DEFAULT_TEMPLATE,
        externalIp: parsed.externalIp ?? '',
      }
    }
  } catch {
    // ignore
  }
  return {
    smsTitle: 'ÇET-KA OSGB',
    smsUsername: '',
    smsPassword: '',
    smsProvider: 'netgsm',
    smsEnabled: false,
    smsTemplate: DEFAULT_TEMPLATE,
    externalIp: '',
  }
}

function saveSmsSettings(form: SmsSettingsForm) {
  try {
    const raw = localStorage.getItem(INSTITUTION_KEY)
    const existing = raw ? JSON.parse(raw) : {}
    localStorage.setItem(INSTITUTION_KEY, JSON.stringify({ ...existing, ...form }))
    return true
  } catch {
    return false
  }
}

export function SmsSettings() {
  const [form, setForm] = useState<SmsSettingsForm>(loadForm())
  const [testPhone, setTestPhone] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [smsLog, setSmsLog] = useState<SmsLogEntry[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    setSmsLog(loadSmsLog())
  }, [])

  const updateField = <K extends keyof SmsSettingsForm>(field: K, value: SmsSettingsForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    const ok = saveSmsSettings(form)
    if (ok) {
      showToast('success', 'SMS ayarları kaydedildi.')
    } else {
      showToast('error', 'Kaydedilemedi', 'Tarayıcı depolama alanını kontrol edin.')
    }
  }

  const handleTestSms = async () => {
    if (!testPhone.trim()) return
    setIsSendingTest(true)
    saveSmsSettings(form)
    const result = await sendTestSms(testPhone.trim(), form.smsTemplate)
    setIsSendingTest(false)
    if (result.ok) {
      showToast('success', 'Test SMS gönderildi', `${testPhone} numarasına test mesajı gönderildi.`)
      setSmsLog(loadSmsLog())
    } else {
      showToast('error', 'SMS gönderilemedi', result.error || 'SMS sağlayıcı ayarlarınızı kontrol edin.')
    }
  }

  const handleClearLog = () => {
    saveSmsLog([])
    setSmsLog([])
    showToast('success', 'SMS logu temizlendi.')
  }

  const insertVariable = (tag: string) => {
    const ta = document.getElementById('sms-template-input') as HTMLTextAreaElement
    if (ta) {
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newText = form.smsTemplate.slice(0, start) + tag + form.smsTemplate.slice(end)
      updateField('smsTemplate', newText)
      setTimeout(() => {
        ta.focus()
        ta.selectionStart = ta.selectionEnd = start + tag.length
      }, 0)
    } else {
      updateField('smsTemplate', form.smsTemplate + tag)
    }
  }

  const previewMessage = form.smsTemplate
    .replace(/\{hastaAd\}/g, 'Ahmet Yılmaz')
    .replace(/\{protokolNo\}/g, '2026000001')
    .replace(/\{kurumAd\}/g, form.smsTitle || 'OSGB')
    .replace(/\{firmaAd\}/g, 'ABC İnşaat')
    .replace(/\{pdfLink\}/g, `${form.externalIp || 'https://sonuc.cetkaosgb.com'}/sonuc/2026000001`)

  const charCount = form.smsTemplate.length
  const smsCount = charCount <= 160 ? 1 : charCount <= 320 ? 2 : 3

  return (
    <div className="space-y-4 h-full flex flex-col min-h-0">
      <PageHeader
        title="SMS Ayarları"
        subtitle="SMS sağlayıcı, mesaj şablonu ve gönderim logu yönetimi."
        action={
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Kaydet
          </button>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {/* Sağlayıcı Ayarları */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-800">SMS Sağlayıcı Bilgileri</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SMS Başlık (Gönderici Adı)</label>
              <input
                type="text"
                value={form.smsTitle}
                onChange={(e) => updateField('smsTitle', e.target.value)}
                placeholder="ÇET-KA OSGB"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Sağlayıcıda onaylanmış gönderici adı.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SMS Sağlayıcı</label>
              <select
                value={form.smsProvider}
                onChange={(e) => updateField('smsProvider', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="netgsm">NetGSM</option>
                <option value="mutlucell">Mutlucell</option>
                <option value="iletimerkezi">İletimerkezi</option>
                <option value="none">Devre Dışı (Sadece Log)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Kullandığınız SMS API sağlayıcısı.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SMS Kullanıcı Adı</label>
              <input
                type="text"
                value={form.smsUsername}
                onChange={(e) => updateField('smsUsername', e.target.value)}
                placeholder="Kullanıcı kodu"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SMS Şifre</label>
              <input
                type="password"
                value={form.smsPassword}
                onChange={(e) => updateField('smsPassword', e.target.value)}
                placeholder="••••••••"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dış IP / Sonuç URL</label>
              <input
                type="text"
                value={form.externalIp}
                onChange={(e) => updateField('externalIp', e.target.value)}
                placeholder="https://sonuc.cetkaosgb.com"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">PDF linki için sonuç sayfası adresi.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SMS Gönderimi</label>
              <label className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.smsEnabled}
                  onChange={(e) => updateField('smsEnabled', e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700">
                  {form.smsEnabled ? 'Aktif (gerçek gönderim)' : 'Pasif (sadece log)'}
                </span>
              </label>
              <p className="text-[10px] text-slate-400 mt-1">
                Kapalıysa SMS'ler gönderilmez, sadece log'a kaydedilir.
              </p>
            </div>
          </div>
        </div>

        {/* Şablon Editörü */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-800">SMS Mesaj Şablonu</h3>
          </div>

          {/* Değişken listesi */}
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-[11px] font-semibold text-blue-700 mb-2">Kullanılabilir Değişkenler (tıklayarak ekle):</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { tag: '{hastaAd}', desc: 'Hasta Adı Soyadı' },
                { tag: '{protokolNo}', desc: 'Protokol Numarası' },
                { tag: '{kurumAd}', desc: 'Kurum Adı (SMS Başlık)' },
                { tag: '{firmaAd}', desc: 'Firma Adı' },
                { tag: '{pdfLink}', desc: 'PDF Rapor Linki' },
              ].map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertVariable(v.tag)}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded-lg text-[10px] font-mono text-blue-700 hover:bg-blue-100 transition-colors"
                  title={v.desc}
                >
                  {v.tag}
                  <span className="font-sans text-slate-400">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Şablon textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mesaj Şablonu</label>
            <textarea
              id="sms-template-input"
              value={form.smsTemplate}
              onChange={(e) => updateField('smsTemplate', e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 min-h-[100px] resize-y font-mono leading-relaxed"
              rows={5}
            />
            <div className="flex items-center justify-between text-[10px] mt-1">
              <span className={`font-medium ${charCount > 160 ? 'text-amber-600' : 'text-slate-400'}`}>
                {charCount} karakter · {smsCount} SMS
              </span>
            </div>
          </div>

          {/* Canlı önizleme */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Önizleme</label>
            <div className="bg-slate-900 rounded-xl p-3 max-w-sm">
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 mb-1">{form.smsTitle || 'OSGB'}</p>
                <p className="text-xs text-white leading-relaxed">{previewMessage}</p>
                <p className="text-[9px] text-slate-500 mt-2 text-right">
                  {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          {/* Test SMS */}
          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Test SMS Gönder</label>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="05XX XXX XX XX"
                className="flex-1 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleTestSms}
                disabled={isSendingTest || !testPhone.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingTest ? 'Gönderiliyor...' : 'Test Gönder'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Kaydetmeden test gönderirseniz, ayarlar geçici olarak kaydedilir.
            </p>
          </div>
        </div>

        {/* SMS Log */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">SMS Gönderim Logu</h3>
              <span className="text-[10px] text-slate-400">({smsLog.length} kayıt)</span>
            </div>
            {smsLog.length > 0 && (
              <button
                onClick={handleClearLog}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Logu Temizle
              </button>
            )}
          </div>

          {smsLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500">Henüz SMS gönderilmedi.</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Sonuçlar onaylandığında gönderilen SMS'ler burada listelenir.
              </p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {smsLog.map((entry) => (
                <div key={entry.id} className="p-3 flex items-start gap-3">
                  {/* Durum ikonu */}
                  <div className="shrink-0 mt-0.5">
                    {entry.status === 'sent' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>

                  {/* İçerik */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate">{entry.patientName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">#{entry.protocolNo}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(entry.date).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {entry.patientPhone} · {entry.companyName}
                    </p>
                    <p className="text-[10px] text-slate-600 bg-slate-50 rounded p-1.5 leading-relaxed">
                      {entry.message}
                    </p>
                    {entry.error && (
                      <p className="text-[10px] text-red-500">Hata: {entry.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
