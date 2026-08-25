import { MessageSquare, Phone } from 'lucide-react'
import type { Company, DangerClass, PaymentType } from '@/state/CompaniesContext'
import { Input } from '@/shared/components/ui/Input'

interface CompanyContactStepProps {
  form: Omit<Company, 'id'>
  update: (field: keyof Omit<Company, 'id'>, value: string | boolean) => void
  paymentTypes: PaymentType[]
  dangerClasses: DangerClass[]
  dangerColors: Record<DangerClass, string>
}

export function CompanyContactStep({
  form,
  update,
  paymentTypes,
  dangerClasses,
  dangerColors,
}: CompanyContactStepProps) {
  return (
    <div className="h-full bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-y-auto space-y-5">
      {/* Ödeme ve Tehlike */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-violet-50 rounded-full" />
          Ödeme ve Tehlike Sınıfı
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ödeme Tipi</label>
            <div className="grid grid-cols-2 gap-2">
              {paymentTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => update('paymentType', type)}
                  className={`px-3 py-2.5 text-sm font-medium rounded-xl border-2 transition-colors ${
                    form.paymentType === type
                      ? type === 'Fatura'
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              {form.paymentType === 'Fatura'
                ? 'Ödemeler firma adına fatura kesilerek yapılır.'
                : 'Ödemeler hasta adına bireysel tahsil edilir.'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tehlike Sınıfı</label>
            <div className="grid grid-cols-3 gap-2">
              {dangerClasses.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => update('dangerClass', cls)}
                  className={`px-2 py-2.5 text-xs font-medium rounded-xl border-2 transition-colors ${
                    form.dangerClass === cls
                      ? dangerColors[cls]
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              İSG mevzuatına göre iş yeri tehlike sınıfı.
            </p>
          </div>
        </div>
      </div>

      {/* İletişim */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-emerald-50 rounded-full" />
          <Phone className="w-4 h-4 text-emerald-500" />
          İletişim Bilgileri
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            size="sm"
            label="Firma Telefonu"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="0XXX XXX XX XX"
          />
          <Input
            size="sm"
            label="E-posta"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="info@firma.com"
          />
          <Input
            size="sm"
            label="Yetkili Kişi"
            value={form.contactPerson}
            onChange={(e) => update('contactPerson', e.target.value)}
            placeholder="Yetkili kişi adı"
          />
          <Input
            size="sm"
            label="Yetkili Telefonu"
            value={form.contactPhone}
            onChange={(e) => update('contactPhone', e.target.value)}
            placeholder="0XXX XXX XX XX"
          />
        </div>
      </div>

      {/* SMS Bildirim Ayarı */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-blue-50 rounded-full" />
          <MessageSquare className="w-4 h-4 text-blue-500" />
          SMS Bildirim Ayarı
        </h3>
        <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-300 transition-colors cursor-pointer bg-slate-50">
          <input
            type="checkbox"
            checked={form.smsOnResultReady ?? false}
            onChange={(e) => update('smsOnResultReady', e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Sonuçlar hazır olunca hastaya SMS gönder
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Bu firmaya ait hastaların tüm tetkik sonuçları onaylandığında, hastanın telefonuna
              otomatik SMS gönderilir. SMS mesajı kurum adınız ile gelir ve sonuç raporunun PDF
              bağlantısını içerir.
            </p>
          </div>
        </label>
      </div>
    </div>
  )
}
