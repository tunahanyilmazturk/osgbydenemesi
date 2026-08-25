import { useMemo, useState } from 'react'
import { ArrowLeftRight, Banknote, Building2, CreditCard, MinusCircle, Percent, Receipt, Save, Square, Trash2 } from 'lucide-react'
import { useProtocols } from '@/state/ProtocolsContext'
import { useConfirm } from '@/state/ConfirmContext'
import type { Protocol } from '@/shared/types'
import { PAYMENT_TYPES } from '@/shared/lib/payments'
import { useToast } from '@/state/ToastContext'

const paymentTypes = PAYMENT_TYPES

const paymentTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Nakit: Banknote,
  Kart: CreditCard,
  'Kuruma Fatura': Building2,
  İndirim: MinusCircle,
  'Eft/Havale': ArrowLeftRight,
}

const paymentTypeBadges: Record<string, string> = {
  Nakit: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Kart: 'bg-blue-50 border-blue-200 text-blue-700',
  'Kuruma Fatura': 'bg-indigo-50 border-indigo-200 text-indigo-700',
  İndirim: 'bg-amber-50 border-amber-200 text-amber-700',
  'Eft/Havale': 'bg-violet-50 border-violet-200 text-violet-700',
}

const nowDateTime = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

interface VezneTransactionsProps {
  protocol: Protocol
}

export function VezneTransactions({ protocol }: VezneTransactionsProps) {
  const { addPaymentToProtocol, removePaymentFromProtocol } = useProtocols()
  const confirm = useConfirm()
  const { showToast } = useToast()

  const [form, setForm] = useState({
    paymentType: 'Nakit',
    amount: null as string | null,
    description: '',
  })

  const totalAmount = useMemo(
    () => protocol.services.reduce((sum, s) => sum + s.totalPrice, 0),
    [protocol.services]
  )

  const totalKdv = useMemo(
    () => protocol.services.reduce((sum, s) => sum + (s.totalPrice - s.price), 0),
    [protocol.services]
  )

  const totalPaid = useMemo(
    () => protocol.payments.filter((p) => p.paymentType !== 'İndirim').reduce((sum, p) => sum + p.amount, 0),
    [protocol.payments]
  )

  const totalDiscount = useMemo(
    () => protocol.payments.filter((p) => p.paymentType === 'İndirim').reduce((sum, p) => sum + p.amount, 0),
    [protocol.payments]
  )

  const remaining = Number((totalAmount - totalPaid - totalDiscount).toFixed(2))
  const amountValue = form.amount ?? (remaining > 0 ? remaining.toFixed(2) : '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(amountValue) || 0
    if (amount <= 0) {
      showToast('warning', 'Geçersiz tutar', 'Tutar 0\'dan büyük olmalıdır.')
      return
    }
    if (amount > remaining) {
      showToast('warning', 'Tutar kalan bakiyeyi aşıyor', `En fazla ₺${remaining.toFixed(2)} girebilirsiniz.`)
      return
    }
    addPaymentToProtocol(protocol.id, {
      paymentDate: nowDateTime(),
      paymentType: form.paymentType,
      amount,
      description: form.description,
      recordedBy: 'Kullanıcı',
    })
    setForm({ paymentType: 'Nakit', amount: null, description: '' })
  }

  const handleDelete = async (paymentId: number) => {
    const ok = await confirm({
      title: 'Tahsilat Sil',
      message: 'Tahsilat kaydını silmek istediğinize emin misiniz?',
    })
    if (ok) {
      removePaymentFromProtocol(protocol.id, paymentId)
    }
  }

  const handleAddKdv = () => {
    if (totalKdv <= 0 || remaining <= 0) return
    const amount = Math.min(totalKdv, remaining)
    setForm((current) => ({
      ...current,
      amount: amount.toFixed(2),
      description: current.description || 'KDV tahsilatı',
    }))
  }

  const handleRoundTotal = () => {
    if (remaining <= 0) return
    const rounded = Math.floor(remaining)
    const diff = Number((remaining - rounded).toFixed(2))
    if (diff === 0) return
    addPaymentToProtocol(protocol.id, {
      paymentDate: nowDateTime(),
      paymentType: 'İndirim',
      amount: diff,
      description: 'Yuvarlama indirimi',
      recordedBy: 'Kullanıcı',
    })
  }

  const handleDeferRemaining = () => {
    if (remaining <= 0) return
    addPaymentToProtocol(protocol.id, {
      paymentDate: nowDateTime(),
      paymentType: 'Kuruma Fatura',
      amount: remaining,
      description: 'Kalan borç sonraki tahsilata aktarıldı',
      recordedBy: 'Kullanıcı',
    })
  }

  return (
    <div className="space-y-3">
      {/* Üst: Vezne Bilgisi — yatay özet şeridi */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 shrink-0">
            <Receipt className="w-4 h-4 text-blue-500" />
            Vezne Bilgisi
          </h3>
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Toplam KDV:</span>
              <span className="font-medium text-slate-800">₺{totalKdv.toFixed(2)}</span>
            </div>
            <span className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Toplam Tutar:</span>
              <span className="font-medium text-slate-800">₺{totalAmount.toFixed(2)}</span>
            </div>
            <span className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Ödenen:</span>
              <span className="font-medium text-emerald-600">₺{totalPaid.toFixed(2)}</span>
            </div>
            <span className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">İndirim:</span>
              <span className="font-medium text-amber-600">₺{totalDiscount.toFixed(2)}</span>
            </div>
            <span className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-800 font-bold">Kalan:</span>
              <span className={`font-bold ${remaining <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {remaining < 0 ? `Fazla: +₺${Math.abs(remaining).toFixed(2)}` : `₺${remaining.toFixed(2)}`}
              </span>
            </div>
          </div>
          {/* Hızlı butonlar */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={handleAddKdv}
              disabled={remaining <= 0 || totalKdv <= 0}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-violet-600 border border-violet-200 rounded-md hover:bg-violet-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="KDV tutarını tahsilat olarak ekle"
            >
              <Percent className="w-3 h-3" />
              KDV Ekle
            </button>
            <button
              type="button"
              onClick={handleRoundTotal}
              disabled={remaining <= 0}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-amber-600 border border-amber-200 rounded-md hover:bg-amber-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Kalan tutarı yuvarla"
            >
              <Receipt className="w-3 h-3" />
              Yuvarla
            </button>
            <button
              type="button"
              onClick={handleDeferRemaining}
              disabled={remaining <= 0}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Kalan borcu sonraya aktar"
            >
              <Square className="w-3 h-3" />
              Sonra Ödeyecek
            </button>
          </div>
        </div>
      </div>

      {/* Alt: Tablo + Form yan yana */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Payment history table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[280px]">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Vezne İşlemleri</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Zaman</th>
                  <th className="px-3 py-2 font-medium">Tip</th>
                  <th className="px-3 py-2 font-medium text-right">Tutar</th>
                  <th className="px-3 py-2 font-medium">Açıklama</th>
                  <th className="px-3 py-2 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {protocol.payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Henüz tahsilat kaydı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  protocol.payments.map((payment, idx) => (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 text-slate-500">{protocol.payments.length - idx}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                        {new Date(payment.paymentDate).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-3 py-2 text-slate-800 font-medium">{payment.paymentType}</td>
                      <td className="px-3 py-2 text-right text-slate-800 font-medium">
                        ₺{payment.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-slate-600 max-w-[120px] truncate">{payment.description}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="p-1.5 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tahsilat formu */}
        <form onSubmit={handleSubmit} className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm mb-3">Tahsilat İşlemi</h3>
          <div className="space-y-2.5">
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">Ödeme Tipi</span>
              <div className="grid grid-cols-2 gap-1.5">
                {paymentTypes.map((type) => {
                  const Icon = paymentTypeIcons[type]
                  const selected = form.paymentType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, paymentType: type })}
                      className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors text-left ${
                        selected
                          ? paymentTypeBadges[type]
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${selected ? '' : 'text-slate-400'}`} />
                      <span className="flex-1 truncate">{type}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tutar</label>
              <input
                type="number"
                value={amountValue}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Açıklama</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
