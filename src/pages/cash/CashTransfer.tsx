import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Banknote, Calendar, CreditCard, Filter, History, RefreshCcw, Save, Trash2 } from 'lucide-react'
import { useProtocols } from '../../context/ProtocolsContext'
import { PageHeader } from '../../components/PageHeader'
import { useToast } from '../../context/ToastContext'
import { useCash } from '../../context/CashContext'
import { useConfirm } from '../../context/ConfirmContext'

import { nowLocalDate } from '../../utils/date'

const paymentTypeBadges: Record<string, string> = {
  Nakit: 'bg-emerald-100 text-emerald-700',
  'Eft/Havale': 'bg-violet-100 text-violet-700',
  Kart: 'bg-blue-100 text-blue-700',
  'Kuruma Fatura': 'bg-indigo-100 text-indigo-700',
  İndirim: 'bg-amber-100 text-amber-700',
}

export function CashTransfer() {
  const { protocols } = useProtocols()
  const { cashAccounts, transfers, addTransfer, removeTransfer } = useCash()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const activeAccounts = cashAccounts.filter((a) => a.active)
  const defaultFrom = activeAccounts[0]?.name ?? 'MERKEZ KASA'
  const defaultTo = activeAccounts[1]?.name ?? activeAccounts[0]?.name ?? 'MERKEZ KASA'

  const [form, setForm] = useState({
    from: defaultFrom,
    to: defaultTo,
    amount: '',
    date: nowLocalDate(),
    description: '',
  })
  const [filterStart, setFilterStart] = useState(nowLocalDate())
  const [filterEnd, setFilterEnd] = useState(nowLocalDate())

  // form kasalar deaktif olursa güncelle
  useEffect(() => {
    if (!activeAccounts.find((a) => a.name === form.from)) {
      setForm((prev) => ({ ...prev, from: defaultFrom }))
    }
    if (!activeAccounts.find((a) => a.name === form.to) || form.from === form.to) {
      setForm((prev) => ({ ...prev, to: activeAccounts.find((a) => a.name !== prev.from)?.name ?? defaultFrom }))
    }
  }, [activeAccounts, defaultFrom, form.from, form.to])

  const paymentsByType = useMemo(() => {
    const totals: Record<string, number> = {
      Nakit: 0,
      'Eft/Havale': 0,
      Kart: 0,
      'Kuruma Fatura': 0,
      İndirim: 0,
    }
    protocols.forEach((p) =>
      p.payments.forEach((payment) => {
        totals[payment.paymentType] = (totals[payment.paymentType] ?? 0) + payment.amount
      })
    )
    return totals
  }, [protocols])

  const kasaBalances = useMemo(() => {
    const start = new Date(filterStart).setHours(0, 0, 0, 0)
    const end = new Date(filterEnd).setHours(23, 59, 59, 999)
    const balances: Record<string, Record<string, number>> = {}

    cashAccounts.forEach((a) => {
      balances[a.name] = {
        Nakit: 0,
        'Eft/Havale': 0,
        Kart: 0,
        'Kuruma Fatura': 0,
        İndirim: 0,
      }
    })

    const defaultCash = cashAccounts[0]?.name ?? 'MERKEZ KASA'
    Object.entries(paymentsByType).forEach(([type, amount]) => {
      balances[defaultCash][type] += amount
    })

    transfers
      .filter((t) => {
        const tTime = new Date(t.date).getTime()
        return tTime >= start && tTime <= end
      })
      .forEach((t) => {
        balances[t.from] = balances[t.from] ?? { Nakit: 0, 'Eft/Havale': 0, Kart: 0, 'Kuruma Fatura': 0, İndirim: 0 }
        balances[t.to] = balances[t.to] ?? { Nakit: 0, 'Eft/Havale': 0, Kart: 0, 'Kuruma Fatura': 0, İndirim: 0 }
        balances[t.from]['Nakit'] = (balances[t.from]['Nakit'] ?? 0) - t.amount
        balances[t.to]['Nakit'] = (balances[t.to]['Nakit'] ?? 0) + t.amount
      })

    return balances
  }, [cashAccounts, paymentsByType, transfers, filterStart, filterEnd])

  const filteredTransfers = useMemo(() => {
    const start = new Date(filterStart).setHours(0, 0, 0, 0)
    const end = new Date(filterEnd).setHours(23, 59, 59, 999)
    return transfers
      .filter((t) => {
        const tTime = new Date(t.date).getTime()
        return tTime >= start && tTime <= end
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transfers, filterStart, filterEnd])

  const filteredTransfersTotal = useMemo(
    () => filteredTransfers.reduce((sum, t) => sum + t.amount, 0),
    [filteredTransfers]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount) || 0
    if (amount <= 0) {
      showToast('warning', 'Geçersiz tutar', 'Tutar 0\'dan büyük olmalıdır.')
      return
    }
    if (form.from === form.to) {
      showToast('warning', 'Aynı kasa seçilemez', 'Kaynak ve hedef kasa farklı olmalıdır.')
      return
    }

    addTransfer({
      date: form.date,
      from: form.from,
      to: form.to,
      amount,
      description: form.description,
    })
    setForm({ from: defaultFrom, to: defaultTo, amount: '', date: nowLocalDate(), description: '' })
    showToast('success', 'Transfer kaydedildi', `${form.from} → ${form.to}: ₺${amount.toFixed(2)}`)
  }

  const handleDelete = async (id: number) => {
    const t = transfers.find((x) => x.id === id)
    if (!t) return
    const ok = await confirm({
      title: 'Transfer Sil',
      message: 'Bu transferi silmek istediğinize emin misiniz?',
    })
    if (ok) {
      removeTransfer(id)
      showToast('info', 'Transfer silindi', `${t.from} → ${t.to}: ₺${t.amount.toFixed(2)}`)
    }
  }

  const summaryCards = [
    { key: 'Nakit', label: 'Nakit', icon: Banknote },
    { key: 'Eft/Havale', label: 'Eft/Havale', icon: RefreshCcw },
    { key: 'Kart', label: 'Kart', icon: CreditCard },
    { key: 'Kuruma Fatura', label: 'Kuruma F.', icon: Filter },
    { key: 'İndirim', label: 'İndirim', icon: History },
  ]

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <PageHeader
        title="Kasa Transfer"
        subtitle="Kasalar arası transfer işlemlerini yapın ve takip edin."
      />

      {/* Kasa bakiye kartları */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {cashAccounts.map((kasa) => {
          const total = Object.values(kasaBalances[kasa.name] ?? {}).reduce((s, v) => s + v, 0)
          return (
            <div key={kasa.name} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800">{kasa.name}</h3>
                <span className={`text-xs font-bold ${total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ₺{total.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {summaryCards.map((card) => {
                  const amount = kasaBalances[kasa.name]?.[card.key] ?? 0
                  return (
                    <div
                      key={card.key}
                      className={`rounded-lg p-1.5 border ${paymentTypeBadges[card.key].replace('text-', 'border-').split(' ').filter(c => c.startsWith('border-'))[0] ?? 'border-slate-200'} ${paymentTypeBadges[card.key].split(' ')[0] ?? 'bg-slate-50'}`}
                    >
                      <p className={`text-[8px] font-semibold ${paymentTypeBadges[card.key].split(' ')[1] ?? 'text-slate-600'}`}>{card.label}</p>
                      <p className={`text-[10px] font-bold truncate ${paymentTypeBadges[card.key].split(' ')[1] ?? 'text-slate-800'}`}>₺{amount.toFixed(2)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Transfer form + filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-500" />
            Kasa Transfer Yap
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tarih</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Kaynak Kasa</label>
              <select
                value={form.from}
                onChange={(e) => setForm({ ...form, from: e.target.value })}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              >
                {cashAccounts.map((k) => <option key={k.id} value={k.name}>{k.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Hedef Kasa</label>
              <select
                value={form.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              >
                {cashAccounts.map((k) => <option key={k.id} value={k.name}>{k.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tutar (₺)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Açıklama</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Transfer açıklaması"
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1 flex items-end">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Transfer Yap
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            Sorgula
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => { const today = nowLocalDate(); setFilterStart(today); setFilterEnd(today) }}
            className="mt-2 w-full py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Bugünü Göster
          </button>
        </div>
      </div>

      {/* Transfer history */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-500" />
            Transfer Geçmişi
          </h3>
          <span className="text-xs text-slate-400">
            {filteredTransfers.length} kayıt — Toplam: ₺{filteredTransfersTotal.toFixed(2)}
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filteredTransfers.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowRightLeft className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Seçilen tarih aralığında transfer kayıt yok.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-medium">Tarih</th>
                  <th className="px-3 py-2 font-medium">Kaynak Kasa</th>
                  <th className="px-3 py-2 font-medium">Hedef Kasa</th>
                  <th className="px-3 py-2 font-medium text-right">Tutar</th>
                  <th className="px-3 py-2 font-medium">Açıklama</th>
                  <th className="px-3 py-2 font-medium">İşlem Yapan</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium">{t.from}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium">{t.to}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800 font-mono">₺{t.amount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate" title={t.description}>{t.description || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 text-[10px]">{t.recordedBy}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
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
    </div>
  )
}
