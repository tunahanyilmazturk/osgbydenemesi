import { useMemo, useState } from 'react'
import { Plus, Save, Search, X, Wallet, Building2, TrendingUp, TrendingDown } from 'lucide-react'
import { useCash } from '@/state/CashContext'
import { useProtocols } from '@/state/ProtocolsContext'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/state/ToastContext'

export function CashDefinitions() {
  const { cashAccounts, addCashAccount, updateCashAccount, toggleCashAccountActive, transfers } = useCash()
  const { protocols } = useProtocols()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')

  const defaultCash = cashAccounts[0]?.name ?? 'MERKEZ KASA'

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {}
    cashAccounts.forEach((a) => { balances[a.name] = 0 })

    protocols.forEach((p) =>
      p.payments.forEach((payment) => {
        if (payment.paymentType === 'İndirim') return
        if (balances[defaultCash] !== undefined) {
          balances[defaultCash] += payment.amount
        }
      })
    )

    transfers.forEach((t) => {
      if (balances[t.to] !== undefined) balances[t.to] += t.amount
      if (balances[t.from] !== undefined) balances[t.from] -= t.amount
    })

    return balances
  }, [cashAccounts, protocols, transfers, defaultCash])

  const totalBalance = useMemo(
    () => Object.values(accountBalances).reduce((sum, b) => sum + b, 0),
    [accountBalances]
  )

  const activeCount = cashAccounts.filter((a) => a.active).length
  const inactiveCount = cashAccounts.length - activeCount

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return cashAccounts.filter(
      (a) => a.name.toLowerCase().includes(term) || a.id.toString().includes(term)
    )
  }, [cashAccounts, search])

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) {
      showToast('warning', 'Kasa adı boş olamaz')
      return
    }
    if (cashAccounts.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      showToast('warning', 'Bu kasa adı zaten mevcut')
      return
    }
    addCashAccount({ name, active: true })
    setNewName('')
    showToast('success', 'Kasa tanımı eklendi')
  }

  const startEdit = (id: number, name: string) => {
    setEditingId(id)
    setEditName(name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleUpdate = (id: number) => {
    const name = editName.trim()
    if (!name) {
      showToast('warning', 'Kasa adı boş olamaz')
      return
    }
    if (cashAccounts.some((a) => a.id !== id && a.name.toLowerCase() === name.toLowerCase())) {
      showToast('warning', 'Bu kasa adı zaten mevcut')
      return
    }
    updateCashAccount(id, { name })
    setEditingId(null)
    showToast('success', 'Kasa tanımı güncellendi')
  }

  return (
    <div className="viewport-page">
      <PageHeader
        title="Kasa Tanımları"
        subtitle="Kasa ve banko tanımlarını oluşturun ve yönetin."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Toplam Bakiye</p>
            <p className="text-lg font-bold text-slate-800">₺{totalBalance.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Aktif Kasa</p>
            <p className="text-lg font-bold text-slate-800">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Pasif Kasa</p>
            <p className="text-lg font-bold text-slate-800">{inactiveCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
            {totalBalance >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Genel Durum</p>
            <p className="text-lg font-bold text-slate-800">{totalBalance >= 0 ? 'Pozitif' : 'Negatif'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Yeni kasa adı"
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Yeni Kasa Tanımı
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-0 surface-scroll">
        <table className="w-full text-left text-sm sticky-table-header">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Aktif</th>
              <th className="px-4 py-3 font-medium">Adı</th>
              <th className="px-4 py-3 font-medium text-right">Bakiye</th>
              <th className="px-4 py-3 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((account) => (
              <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-600 font-mono">{account.id}</td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={account.active}
                    onChange={() => toggleCashAccountActive(account.id)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 text-slate-800">
                  {editingId === account.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(account.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="w-full max-w-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.name}</span>
                      {!account.active && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">Pasif</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                  ₺{(accountBalances[account.name] ?? 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === account.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleUpdate(account.id)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                        title="Kaydet"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                        title="İptal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(account.id, account.name)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                      Düzenle
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  Arama kriterine uygun kasa bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
