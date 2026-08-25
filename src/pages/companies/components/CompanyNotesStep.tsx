import { useMemo } from 'react'
import { AlertCircle, User } from 'lucide-react'
import type { Company } from '@/state/CompaniesContext'
import { useServices } from '@/state/ServicesContext'

interface CompanyNotesStepProps {
  form: Omit<Company, 'id'>
  update: (field: keyof Omit<Company, 'id'>, value: string | boolean) => void
  isEditing: boolean
}

export function CompanyNotesStep({ form, update, isEditing }: CompanyNotesStepProps) {
  void isEditing
  const { catalog } = useServices()

  const companyServicesTotal = useMemo(
    () =>
      form.companyServices.reduce((sum, cs) => {
        const item = catalog.find((c) => c.id === cs.serviceId)
        if (!item) return sum
        return sum + cs.customPrice * (1 + (cs.customVatRate ?? item.vatRate) / 100)
      }, 0),
    [form.companyServices, catalog]
  )

  return (
    <div className="h-full bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-y-auto space-y-5">
      {/* Protokol Açılış Notu */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-red-50 rounded-full" />
          <AlertCircle className="w-4 h-4 text-red-500" />
          Protokol Açılış Notu
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Bu firmadan protokol açarken kullanıcılara gösterilecek uyarı notu. Boş bırakılırsa uyarı çıkmaz.
        </p>
        <textarea
          value={form.protocolNote}
          onChange={(e) => update('protocolNote', e.target.value)}
          rows={3}
          placeholder="Örn: İşe giriş muayenelerinde tam kan sayımı zorunludur. Aşı kayıtları için SGK belgesi isteyiniz."
          className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 resize-none"
        />
      </div>

      {/* Ek Notlar */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-amber-50 rounded-full" />
          <User className="w-4 h-4 text-amber-500" />
          Ek Notlar
        </h3>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={3}
          placeholder="Firma hakkında ek notlar, sözleşme detayları vb."
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 resize-none"
        />
      </div>

      {/* Durum */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-slate-50 rounded-full" />
          Durum
        </h3>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200 w-fit">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => update('active', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-medium">Aktif Firma</span>
        </label>
        <p className="text-xs text-slate-400 mt-1.5">
          Pasif firmalar protokol oluşturmada görünmez.
        </p>
      </div>

      {/* Özet */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="text-xs font-bold text-blue-800 mb-2">Kayıt Özeti</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div>
            <p className="text-slate-400">Firma</p>
            <p className="font-semibold text-slate-800 truncate">{form.name || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">Tür</p>
            <p className="font-semibold text-slate-800">{form.companyType}</p>
          </div>
          <div>
            <p className="text-slate-400">Tehlike</p>
            <p className="font-semibold text-slate-800">{form.dangerClass}</p>
          </div>
          <div>
            <p className="text-slate-400">Ödeme</p>
            <p className={`font-semibold ${form.paymentType === 'Fatura' ? 'text-amber-600' : 'text-emerald-600'}`}>
              {form.paymentType}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Test Sayısı</p>
            <p className="font-semibold text-slate-800">{form.companyServices.length}</p>
          </div>
          <div>
            <p className="text-slate-400">Test Toplam</p>
            <p className="font-semibold text-slate-800">₺{companyServicesTotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-400">Yetkili</p>
            <p className="font-semibold text-slate-800 truncate">{form.contactPerson || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">Durum</p>
            <p className={`font-semibold ${form.active ? 'text-emerald-600' : 'text-slate-400'}`}>
              {form.active ? 'Aktif' : 'Pasif'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
