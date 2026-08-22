import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Banknote, Building2, CheckSquare, CreditCard, MinusCircle, Percent, Receipt, Save, Square, Trash2 } from 'lucide-react'
import { useProtocols } from '../../../context/ProtocolsContext'
import { useConfirm } from '../../../context/ConfirmContext'
import type { Protocol } from '../../../types'

const paymentTypes = ['Nakit', 'Kredi Kartı', 'Kuruma Fatura', 'İndirim', 'Eft/Havale']

const paymentTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Nakit: Banknote,
  'Kredi Kartı': CreditCard,
  'Kuruma Fatura': Building2,
  İndirim: MinusCircle,
  'Eft/Havale': ArrowLeftRight,
}

const paymentTypeBadges: Record<string, string> = {
  Nakit: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  'Kredi Kartı': 'bg-blue-50 border-blue-200 text-blue-700',
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

  const [form, setForm] = useState({
    paymentType: 'Nakit',
    amount: '',
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

  // Kalan tutar değişince input'u otomatik doldur
  useEffect(() => {
    if (remaining > 0) {
      setForm((prev) => ({ ...prev, amount: remaining.toFixed(2) }))
    } else {
      setForm((prev) => ({ ...prev, amount: '' }))
    }
  }, [remaining])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount) || 0
    if (amount <= 0) return
    addPaymentToProtocol(protocol.id, {
      paymentDate: nowDateTime(),
      paymentType: form.paymentType,
      amount,
      description: form.description,
      recordedBy: 'Kullanıcı',
    })
    setForm({ paymentType: 'Nakit', amount: '', description: '' })
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
    if (totalKdv <= 0) return
    addPaymentToProtocol(protocol.id, {
      paymentDate: nowDateTime(),
      paymentType: 'KDV',
      amount: totalKdv,
      description: 'KDV tahsilatı',
      recordedBy: 'Kullanıcı',
    })
  }

  const handleRoundTotal = () => {
    if (remaining <= 0) return
    const rounded = Math.round(remaining)
    const diff = Number((rounded - remaining).toFixed(2))
    if (diff === 0) return
    addPaymentToProtocol(protocol.id, {
      paymentDate: nowDateTime(),
      paymentType: 'İndirim',
      amount: Math.abs(diff),
      description: diff < 0 ? 'Yuvarlama (eklenecek)' : 'Yuvarlama indirimi',
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Payment history table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[280px]">
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

        {/* Summary + payment form side by side */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col">
            <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-500" />
              Vezne Bilgisi
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Toplam KDV:</span>
                <span className="font-medium text-slate-800">₺{totalKdv.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Toplam Tutar:</span>
                <span className="font-medium text-slate-800">₺{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>T. Ödenen:</span>
                <span className="font-medium text-emerald-600">₺{totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>T. İndirim:</span>
                <span className="font-medium text-amber-600">₺{totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 text-slate-800 font-bold">
                <span>Toplam Kalan:</span>
                <span className={remaining <= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {remaining < 0 ? `Fazla: +₺${Math.abs(remaining).toFixed(2)}` : `₺${remaining.toFixed(2)}`}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-auto pt-3">
              <button
                onClick={handleAddKdv}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50"
              >
                <Percent className="w-3.5 h-3.5" />
                KDV Ekle
              </button>
              <button
                onClick={handleRoundTotal}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50"
              >
                <Receipt className="w-3.5 h-3.5" />
                Fiyatı Yuvarla
              </button>
              <button
                onClick={handleDeferRemaining}
                className="w-full flex items-center justify-start gap-2 py-1.5 px-2.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <Square className="w-3.5 h-3.5" />
                Kalan Borcu Sonra Ödeyecek
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col">
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
                        {selected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-300" />}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tutar</label>
                <input
                  type="number"
                  value={form.amount}
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
    </div>
  )
}
