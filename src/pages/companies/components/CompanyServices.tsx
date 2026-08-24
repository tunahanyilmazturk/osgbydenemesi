import { useMemo, useState } from 'react'
import { ArrowDownUp, Plus, Search, Tag, Trash2 } from 'lucide-react'
import type { Company, CompanyService } from '../../../context/CompaniesContext'
import { useConfirm } from '../../../context/ConfirmContext'
import { getGroupColor } from '../../../context/ServicesContext'
import type { ServiceCatalogItem, ServiceGroup } from '../../../types'

interface CompanyServicesProps {
  form: Omit<Company, 'id'>
  setForm: React.Dispatch<React.SetStateAction<Omit<Company, 'id'>>>
  catalog: ServiceCatalogItem[]
  groups: ServiceGroup[]
}

export function CompanyServices({ form, setForm, catalog, groups }: CompanyServicesProps) {
  const confirm = useConfirm()

  const [serviceSearch, setServiceSearch] = useState('')
  const [serviceGroupFilter, setServiceGroupFilter] = useState('Tümü')
  const [sortBy, setSortBy] = useState<'name' | 'price'>('name')
  const [bulkPrice, setBulkPrice] = useState('')

  const groupNames = useMemo(() => groups.map((g) => g.name), [groups])

  const filteredCatalog = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase()
    const list = catalog.filter((c) => {
      const matchesSearch = !term || c.name.toLowerCase().includes(term)
      const matchesGroup = serviceGroupFilter === 'Tümü' || c.group === serviceGroupFilter
      const notAdded = !form.companyServices.some((cs) => cs.serviceId === c.id)
      return matchesSearch && matchesGroup && notAdded
    })
    if (sortBy === 'price') {
      list.sort((a, b) => b.price - a.price)
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
    }
    return list
  }, [catalog, serviceSearch, serviceGroupFilter, form.companyServices, sortBy])

  const selectedCompanyServices = useMemo(
    () =>
      form.companyServices
        .map((cs) => {
          const item = catalog.find((c) => c.id === cs.serviceId)
          return item ? { ...cs, catalogItem: item } : null
        })
        .filter(Boolean) as Array<CompanyService & { catalogItem: ServiceCatalogItem }>,
    [form.companyServices, catalog]
  )

  const servicesTotal = useMemo(
    () =>
      selectedCompanyServices.reduce(
        (sum, cs) => sum + cs.customPrice * (1 + (cs.customVatRate ?? cs.catalogItem.vatRate) / 100),
        0
      ),
    [selectedCompanyServices]
  )

  const groupTotals = useMemo(() => {
    const totals: Record<string, { count: number; total: number }> = {}
    selectedCompanyServices.forEach((cs) => {
      const g = cs.catalogItem.group
      if (!totals[g]) totals[g] = { count: 0, total: 0 }
      totals[g].count++
      totals[g].total += cs.customPrice * (1 + (cs.customVatRate ?? cs.catalogItem.vatRate) / 100)
    })
    return totals
  }, [selectedCompanyServices])

  const allCatalogAdded = form.companyServices.length === catalog.length

  const addCompanyService = (serviceId: number) => {
    const item = catalog.find((c) => c.id === serviceId)
    if (!item) return
    setForm((prev) => ({
      ...prev,
      companyServices: [...prev.companyServices, { serviceId, customPrice: item.price }],
    }))
  }

  const removeCompanyService = (serviceId: number) => {
    setForm((prev) => ({
      ...prev,
      companyServices: prev.companyServices.filter((cs) => cs.serviceId !== serviceId),
    }))
  }

  const updateCompanyServicePrice = (serviceId: number, customPrice: number) => {
    setForm((prev) => ({
      ...prev,
      companyServices: prev.companyServices.map((cs) =>
        cs.serviceId === serviceId ? { ...cs, customPrice } : cs
      ),
    }))
  }

  const updateCompanyServiceVat = (serviceId: number, customVatRate: number) => {
    setForm((prev) => ({
      ...prev,
      companyServices: prev.companyServices.map((cs) =>
        cs.serviceId === serviceId ? { ...cs, customVatRate } : cs
      ),
    }))
  }

  const handleSelectAll = () => {
    const available = filteredCatalog.filter((c) => !form.companyServices.some((cs) => cs.serviceId === c.id))
    if (available.length === 0) return
    setForm((prev) => ({
      ...prev,
      companyServices: [
        ...prev.companyServices,
        ...available.map((c) => ({ serviceId: c.id, customPrice: c.price })),
      ],
    }))
  }

  const handleClearAll = async () => {
    if (form.companyServices.length === 0) return
    const ok = await confirm({
      title: 'Testleri Kaldır',
      message: 'Tüm firma testlerini kaldırmak istediğinize emin misiniz?',
    })
    if (ok) {
      setForm((prev) => ({ ...prev, companyServices: [] }))
    }
  }

  const handleBulkPrice = () => {
    const price = Number(bulkPrice)
    if (isNaN(price) || price < 0) return
    setForm((prev) => ({
      ...prev,
      companyServices: prev.companyServices.map((cs) => ({ ...cs, customPrice: price })),
    }))
    setBulkPrice('')
  }

  const handleResetPrices = () => {
    setForm((prev) => ({
      ...prev,
      companyServices: prev.companyServices.map((cs) => {
        const item = catalog.find((c) => c.id === cs.serviceId)
        return item ? { ...cs, customPrice: item.price } : cs
      }),
    }))
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-3 mb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-50 rounded-full" />
              <Plus className="w-4 h-4 text-blue-500" />
              Firma Testleri ve Özel Fiyatlar
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Bu firmaya özel testler seçin ve özel fiyat belirleyin.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              <span className="font-bold text-slate-800">{form.companyServices.length}</span> / {catalog.length} test
            </span>
            {form.companyServices.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Tümünü Temizle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content — full height dual panel */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2 overflow-hidden">
        {/* Catalog */}
        <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h4 className="text-xs font-bold text-slate-700">Hizmet Kataloğu</h4>
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={filteredCatalog.length === 0}
              className="text-[10px] font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40"
            >
              Tümünü Ekle ({filteredCatalog.length})
            </button>
          </div>

          <div className="flex gap-1.5 mb-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Hizmet ara..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={serviceGroupFilter}
              onChange={(e) => setServiceGroupFilter(e.target.value)}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="Tümü">Tümü</option>
              {groupNames.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'name' ? 'price' : 'name')}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 flex items-center gap-1"
              title={sortBy === 'name' ? 'İsme göre' : 'Fiyata göre'}
            >
              <ArrowDownUp className="w-3 h-3" />
              {sortBy === 'name' ? 'İsim' : 'Fiyat'}
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 -mx-1 px-1">
            {filteredCatalog.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                {allCatalogAdded ? 'Tüm hizmetler eklendi.' : 'Hizmet bulunamadı.'}
              </p>
            ) : (
              filteredCatalog.map((item) => {
                const group = groups.find((g) => g.name === item.group)
                const colors = getGroupColor(group?.color ?? 'slate')
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addCompanyService(item.id)}
                    className="w-full flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-left"
                  >
                    <span className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {item.group} — ₺{item.price.toFixed(2)} (%{item.vatRate} KDV)
                      </p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Selected company services */}
        <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h4 className="text-xs font-bold text-slate-700">Firma Testleri</h4>
            <span className="text-xs text-slate-400">{form.companyServices.length} test</span>
          </div>

          {/* Bulk price toolbar */}
          {form.companyServices.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2 shrink-0 p-2 bg-blue-50 rounded-lg border border-blue-100">
              <Tag className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                placeholder="Toplu fiyat"
                className="flex-1 px-2 py-1 bg-white border border-blue-200 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleBulkPrice}
                disabled={!bulkPrice}
                className="px-2 py-1 text-[10px] font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40"
              >
                Uygula
              </button>
              <button
                type="button"
                onClick={handleResetPrices}
                className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
                title="Liste fiyatlarına sıfırla"
              >
                Sıfırla
              </button>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 -mx-1 px-1">
            {selectedCompanyServices.length === 0 ? (
              <div className="text-center py-8">
                <Plus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Henüz test eklenmemiş.</p>
                <p className="text-[10px] text-slate-400 mt-1">Soldan hizmet ekleyebilirsiniz.</p>
              </div>
            ) : (
              selectedCompanyServices.map((cs) => {
                const group = groups.find((g) => g.name === cs.catalogItem.group)
                const colors = getGroupColor(group?.color ?? 'slate')
                const vatRate = cs.customVatRate ?? cs.catalogItem.vatRate
                const totalWithVat = cs.customPrice * (1 + vatRate / 100)
                const diff = cs.customPrice - cs.catalogItem.price
                const diffPercent = cs.catalogItem.price > 0 ? (diff / cs.catalogItem.price) * 100 : 0
                return (
                  <div key={cs.serviceId} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-start gap-1.5 mb-1.5">
                      <span className={`w-2 h-2 rounded-full ${colors.dot} shrink-0 mt-1`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-800 truncate">{cs.catalogItem.name}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span>{cs.catalogItem.group}</span>
                          <span>•</span>
                          <span>Liste: ₺{cs.catalogItem.price.toFixed(2)}</span>
                          {diff !== 0 && (
                            <span className={`font-medium ${diff < 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {diff < 0 ? '↓' : '↑'} ₺{Math.abs(diff).toFixed(2)} ({Math.abs(diffPercent).toFixed(0)}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCompanyService(cs.serviceId)}
                        className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Firma Fiyatı (₺)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={String(cs.customPrice)}
                          onChange={(e) => updateCompanyServicePrice(cs.serviceId, Number(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">KDV (%)</label>
                        <input
                          type="number"
                          min="0"
                          value={String(vatRate)}
                          onChange={(e) => updateCompanyServiceVat(cs.serviceId, Number(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Toplam (₺)</label>
                        <div className="px-2 py-1 bg-blue-50 border border-blue-100 rounded-md text-xs font-bold text-blue-700 text-right">
                          {totalWithVat.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer summary */}
          {form.companyServices.length > 0 && (
            <div className="shrink-0 mt-2 pt-2 border-t border-slate-100 space-y-1.5">
              {/* Group breakdown */}
              {Object.entries(groupTotals).length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(groupTotals).map(([group, data]) => {
                    const g = groups.find((grp) => grp.name === group)
                    const colors = getGroupColor(g?.color ?? 'slate')
                    return (
                      <span key={group} className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text}`}>
                        {group}: {data.count} — ₺{data.total.toFixed(2)}
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Toplam (KDV dahil):</span>
                <span className="font-bold text-slate-800">₺{servicesTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
