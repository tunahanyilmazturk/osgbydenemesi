import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Plus, Trash2, Wallet } from 'lucide-react'
import { useToast } from '@/state/ToastContext'
import { Tooltip } from '@/shared/components/ui/Tooltip'
import { nowLocalDateTime } from '@/shared/lib/date'
import { PAYMENT_TYPES } from '@/shared/lib/payments'

const paymentTypes = PAYMENT_TYPES

export interface LocalPayment {
  id: number
  paymentDate: string
  paymentType: string
  amount: number
  description: string
  recordedBy: string
}

interface VezneStepProps {
  totalAmount: number
  totalKdv: number
  payments: LocalPayment[]
  onAddPayment: (payment: Omit<LocalPayment, 'id'>) => void
  onRemovePayment: (id: number) => void
  companyName?: string
  paymentType?: 'Bireysel' | 'Fatura'
}

export function VezneStep({
  totalAmount,
  totalKdv,
  payments,
  onAddPayment,
  onRemovePayment,
  companyName,
  paymentType = 'Bireysel',
}: VezneStepProps) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    paymentType: 'Nakit',
    amount: '',
    description: '',
  })

  const totalPaid = useMemo(
    () => payments.filter((p) => p.paymentType !== 'İndirim').reduce((sum, p) => sum + p.amount, 0),
    [payments]
  )

  const totalDiscount = useMemo(
    () => payments.filter((p) => p.paymentType === 'İndirim').reduce((sum, p) => sum + p.amount, 0),
    [payments]
  )

  const remaining = Number((totalAmount - totalPaid - totalDiscount).toFixed(2))

  // Kalan tutar değişince, input boşsa veya önceki kalan tutara eşitse otomatik doldur
  const prevRemainingRef = useRef(remaining)
  useEffect(() => {
    const prevRemaining = prevRemainingRef.current
    const currentAmount = Number(form.amount) || 0
    // Input boşsa veya önceki kalan tutara eşitse yeni kalan tutar ile doldur
    if ((!form.amount || currentAmount === prevRemaining) && remaining > 0) {
      setForm((prev) => ({ ...prev, amount: remaining.toFixed(2) }))
    } else if (remaining <= 0 && currentAmount === prevRemaining) {
      setForm((prev) => ({ ...prev, amount: '' }))
    }
    prevRemainingRef.current = remaining
  }, [remaining, form.amount])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount) || 0
    if (amount <= 0) {
      showToast('warning', 'Geçersiz tutar', 'Tutar 0\'dan büyük olmalıdır.')
      return
    }
    if (amount > remaining) {
      showToast('warning', 'Tutar kalan bakiyeyi aşıyor', `En fazla ₺${remaining.toFixed(2)} girebilirsiniz.`)
      return
    }
    onAddPayment({
      paymentDate: nowLocalDateTime(),
      paymentType: form.paymentType,
      amount,
      description: form.description,
      recordedBy: 'Kullanıcı',
    })
    showToast('success', 'Tahsilat kaydedildi', `₺${amount.toFixed(2)} — ${form.paymentType}`)
    // Ödeme tipi ve açıklamayı sıfırla, tutarı ise yeni kalan tutar ile doldur
    const newRemaining = Number((remaining - amount).toFixed(2))
    setForm({
      paymentType: form.paymentType,
      amount: newRemaining > 0 ? newRemaining.toFixed(2) : '',
      description: '',
    })
  }

  const handleRoundTotal = () => {
    if (remaining <= 0) return
    const rounded = Math.floor(remaining)
    const diff = Number((remaining - rounded).toFixed(2))
    if (diff === 0) {
      showToast('info', 'Yuvarlama gerekmiyor', 'Tutar zaten yuvarlak.')
      return
    }
    onAddPayment({
      paymentDate: nowLocalDateTime(),
      paymentType: 'İndirim',
      amount: diff,
      description: 'Yuvarlama indirimi',
      recordedBy: 'Kullanıcı',
    })
    showToast('success', 'Yuvarlama uygulandı', `₺${diff.toFixed(2)} indirim`)
  }

  const handleDeferRemaining = () => {
    if (remaining <= 0) return
    onAddPayment({
      paymentDate: nowLocalDateTime(),
      paymentType: 'Kuruma Fatura',
      amount: remaining,
      description: 'Kalan borç sonraki tahsilata aktarıldı',
      recordedBy: 'Kullanıcı',
    })
    showToast('info', 'Sonraya aktarıldı', `₺${remaining.toFixed(2)} kuruma fatura olarak aktarıldı.`)
  }

  const handlePayAll = () => {
    if (remaining <= 0) return
    const type = form.paymentType === 'İndirim' ? 'Nakit' : form.paymentType
    onAddPayment({
      paymentDate: nowLocalDateTime(),
      paymentType: type,
      amount: remaining,
      description: 'Toplam kalan ödemesi',
      recordedBy: 'Kullanıcı',
    })
    showToast('success', 'Kalan ödendi', `₺${remaining.toFixed(2)} — ${type}`)
  }

  return (
    <div className="h-full flex flex-col gap-2 min-h-0">
      {/* Payment type banner */}
      {paymentType === 'Fatura' && companyName && companyName !== 'Bireysel' && (
        <div className="shrink-0 bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-800">
              <span className="font-bold">{companyName}</span> — Ödeme tipi: <span className="font-bold">Fatura</span>
            </p>
            <p className="text-[10px] text-amber-600">
              Bu firmadan gelen hastalar için fatura kesilecek. Ödemeleri "Kuruma Fatura" olarak kaydedebilirsiniz.
            </p>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2.5">
          <p className="text-[10px] text-slate-400">Toplam KDV</p>
          <p className="text-sm font-bold text-slate-700">₺{totalKdv.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2.5">
          <p className="text-[10px] text-slate-400">Toplam Tutar</p>
          <p className="text-sm font-bold text-slate-800">₺{totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2.5">
          <p className="text-[10px] text-slate-400">Ödenen</p>
          <p className="text-sm font-bold text-emerald-600">₺{totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2.5">
          <p className="text-[10px] text-slate-400">İndirim</p>
          <p className="text-sm font-bold text-amber-600">₺{totalDiscount.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2.5">
          <p className="text-[10px] text-slate-400">Kalan</p>
          <p className={`text-sm font-bold ${remaining <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ₺{remaining.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-2 overflow-hidden">
        {/* Payment history */}
        <div className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-3 py-2.5 border-b border-slate-100 shrink-0 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-500" />
              Tahsilat Kayıtları
            </h3>
            <span className="text-xs text-slate-400">{payments.length} kayıt</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {payments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">Henüz tahsilat kayıt yok.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-medium">Tarih</th>
                    <th className="px-3 py-2 font-medium">Tip</th>
                    <th className="px-3 py-2 font-medium text-right">Tutar</th>
                    <th className="px-3 py-2 font-medium">Açıklama</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                        {new Date(payment.paymentDate).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          payment.paymentType === 'İndirim'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          {payment.paymentType}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800 font-mono">
                        ₺{payment.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-slate-500 max-w-[160px] truncate">{payment.description}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onRemovePayment(payment.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Payment form */}
        <div className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
          <h3 className="text-sm font-bold text-slate-800 mb-2 shrink-0">Tahsilat İşlemi</h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2 flex-1 min-h-0">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Ödeme Tipi</label>
              <div className="grid grid-cols-3 gap-1">
                {paymentTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, paymentType: type })}
                    className={`px-1.5 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
                      form.paymentType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>Tutar (₺)</span>
                {remaining > 0 && (
                  <span className="text-[10px] text-slate-400">
                    Kalan: <span className="font-bold text-red-500">₺{remaining.toFixed(2)}</span>
                  </span>
                )}
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder={remaining > 0 ? remaining.toFixed(2) : '0.00'}
                step="0.01"
                min="0"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              />
              {/* Quick amount buttons */}
              {remaining > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, amount: remaining.toFixed(2) })}
                    className="px-2 py-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
                  >
                    Tam: ₺{remaining.toFixed(2)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, amount: (remaining / 2).toFixed(2) })}
                    className="px-2 py-0.5 text-[10px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md"
                  >
                    Yarısı: ₺{(remaining / 2).toFixed(2)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, amount: Math.round(remaining).toFixed(2) })}
                    className="px-2 py-0.5 text-[10px] font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md"
                  >
                    Yuvarlak: ₺{Math.round(remaining).toFixed(2)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, amount: '' })}
                    className="px-2 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-md"
                  >
                    Temizle
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Açıklama</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Opsiyonel açıklama"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 resize-none"
              />
            </div>

            <div className="mt-auto space-y-1.5">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tahsilat Ekle
              </button>
              <div className="grid grid-cols-3 gap-1">
                <Tooltip content="Kalan tutarın tamamını öde" position="top">
                  <button
                    type="button"
                    onClick={handlePayAll}
                    disabled={remaining <= 0}
                    className="w-full py-1.5 text-[10px] font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Kalanı Öde
                  </button>
                </Tooltip>
                <Tooltip content="Kalan tutarı yuvarlak sayıya tamamla" position="top">
                  <button
                    type="button"
                    onClick={handleRoundTotal}
                    disabled={remaining <= 0}
                    className="w-full py-1.5 text-[10px] font-medium text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Yuvarla
                  </button>
                </Tooltip>
                <Tooltip content="Kalan tutarı sonraki tahsilata aktar" position="top">
                  <button
                    type="button"
                    onClick={handleDeferRemaining}
                    disabled={remaining <= 0}
                    className="w-full py-1.5 text-[10px] font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Sonra Öde
                  </button>
                </Tooltip>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
