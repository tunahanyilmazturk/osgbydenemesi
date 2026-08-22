import { useMemo, useState } from 'react'
import { Building2, Edit2, Package, Plus, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useServices } from '../../context/ServicesContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { PageHeader } from '../../components/PageHeader'

export function PackageDefinitions() {
  const navigate = useNavigate()
  const { catalog, packages, removePackage } = useServices()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('Tümü')

  const allCompanyNames = useMemo(() => {
    const set = new Set<string>()
    packages.forEach((p) => p.companies.forEach((c) => set.add(c)))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'))
  }, [packages])

  const filteredPackages = useMemo(() => {
    const term = search.trim().toLowerCase()
    return packages.filter((p) => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.companies.some((c) => c.toLowerCase().includes(term))
      const matchesCompany =
        companyFilter === 'Tümü' ||
        (companyFilter === '__general__'
          ? p.companies.length === 0
          : p.companies.length === 0 || p.companies.includes(companyFilter))
      return matchesSearch && matchesCompany
    })
  }, [packages, search, companyFilter])

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: 'Paket Sil',
      message: `"${name}" paketini silmek istediğinize emin misiniz?`,
    })
    if (ok) {
      removePackage(id)
      showToast('success', 'Paket silindi', `"${name}" paketi silindi.`)
    }
  }

  const generalCount = packages.filter((p) => p.companies.length === 0).length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Paket Tanımları"
        subtitle="Hizmetleri gruplayarak paket oluşturun ve firma bazında atayın."
        action={
          <button
            onClick={() => navigate('/ayarlar/paketler/yeni')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Yeni Paket
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400">Toplam Paket</p>
          <p className="text-2xl font-bold text-slate-800">{packages.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400">Toplam Hizmet</p>
          <p className="text-2xl font-bold text-slate-700">
            {packages.reduce((sum, p) => sum + p.services.length, 0)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400">Paket Değeri</p>
          <p className="text-2xl font-bold text-blue-600">
            ₺{packages.reduce((sum, p) => {
              const pkgServices = p.services
                .map((ps) => catalog.find((c) => c.id === ps.serviceId))
                .filter(Boolean) as Array<{ id: number; price: number; vatRate: number }>
              const svcTotal = pkgServices.reduce((s, item) => {
                const ps = p.services.find((sp) => sp.serviceId === item.id)
                const price = ps?.customPrice ?? item.price
                const vatRate = ps?.customVatRate ?? item.vatRate
                return s + price * (1 + vatRate / 100)
              }, 0)
              const hasCustom = p.services.some((ps) => ps.customPrice !== undefined || ps.customVatRate !== undefined)
              return sum + (hasCustom ? svcTotal + p.price : p.price)
            }, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400">Genel Paket (Tüm Firmalar)</p>
          <p className="text-2xl font-bold text-emerald-600">{generalCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Paket ara (ad veya firma)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="Tümü">Tüm Firmalar</option>
            <option value="__general__">Genel Paketler (Tümü)</option>
            {allCompanyNames.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Packages list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPackages.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">
              {packages.length === 0 ? 'Henüz paket tanımlanmamış.' : 'Aramaya uygun paket bulunamadı.'}
            </p>
            {packages.length === 0 && (
              <button
                onClick={() => navigate('/ayarlar/paketler/yeni')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                İlk Paketi Oluştur
              </button>
            )}
          </div>
        ) : (
          filteredPackages.map((pkg) => {
            const pkgServices = pkg.services
              .map((ps) => {
                const item = catalog.find((c) => c.id === ps.serviceId)
                if (!item) return null
                const price = ps.customPrice ?? item.price
                const vatRate = ps.customVatRate ?? item.vatRate
                return { ...item, customPrice: ps.customPrice, customVatRate: ps.customVatRate, effectivePrice: price, effectiveVatRate: vatRate }
              })
              .filter(Boolean) as Array<{ id: number; name: string; group: string; price: number; vatRate: number; customPrice?: number; customVatRate?: number; effectivePrice: number; effectiveVatRate: number }>
            const hasCustomPricing = pkgServices.some((s) => s.customPrice !== undefined || s.customVatRate !== undefined)
            const serviceTotalWithKdv = pkgServices.reduce(
              (sum, s) => sum + s.effectivePrice * (1 + s.effectiveVatRate / 100),
              0
            )
            const effectiveTotal = hasCustomPricing ? serviceTotalWithKdv + pkg.price : pkg.price
            const customCount = pkgServices.filter((s) => s.customPrice !== undefined || s.customVatRate !== undefined).length
            const isGeneral = pkg.companies.length === 0
            return (
              <div key={pkg.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 truncate">{pkg.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {isGeneral ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-full">
                            <Building2 className="w-2.5 h-2.5" />
                            Tüm Firmalar
                          </span>
                        ) : (
                          pkg.companies.slice(0, 3).map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded-full max-w-[140px]"
                            >
                              <Building2 className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{c}</span>
                            </span>
                          ))
                        )}
                        {pkg.companies.length > 3 && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-full">
                            +{pkg.companies.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => navigate(`/ayarlar/paketler/duzenle/${pkg.id}`)}
                      className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Düzenle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg.id, pkg.name)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                  {pkgServices.map((s) => {
                    const hasCustom = s.customPrice !== undefined || s.customVatRate !== undefined
                    return (
                      <div key={s.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 truncate flex items-center gap-1">
                          {hasCustom && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Özel fiyat" />}
                          {s.name}
                        </span>
                        <span className={`font-mono shrink-0 ml-2 ${hasCustom ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                          ₺{s.effectivePrice.toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400">Hizmet</p>
                    <p className="text-sm font-bold text-slate-800">{pkg.services.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">{hasCustomPricing ? 'Test+Paket' : 'Paket Fiy.'}</p>
                    <p className="text-sm font-bold text-blue-600">₺{effectiveTotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Liste Fiy.</p>
                    <p className="text-sm font-bold text-slate-400">₺{serviceTotalWithKdv.toFixed(2)}</p>
                  </div>
                </div>
                {customCount > 0 && (
                  <p className="mt-2 text-[10px] text-amber-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {customCount} hizmette özel fiyat — paket fiyatı üstüne eklenir
                  </p>
                )}
                {customCount === 0 && (
                  <p className="mt-2 text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Paket fiyatı toplam olarak baz alınır
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/ayarlar')}
          className="text-sm text-slate-600 hover:text-slate-800 font-medium"
        >
          ← Genel Ayarlar'a Dön
        </button>
        <button
          onClick={() => navigate('/ayarlar/hizmetler')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-auto"
        >
          Hizmet Tanımları →
        </button>
      </div>
    </div>
  )
}

