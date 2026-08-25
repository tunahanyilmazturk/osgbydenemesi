import { useMemo, useState } from 'react'
import { ArrowLeft, Building2, Check, Package, Percent, Plus, RotateCcw, Save, Search, Tag, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCompanies } from '@/state/CompaniesContext'
import { useServices, getGroupColor } from '@/state/ServicesContext'
import { useToast } from '@/state/ToastContext'
import { Input } from '@/shared/components/ui/Input'
import { PageHeader } from '@/shared/components/PageHeader'
import type { PackageService, ServiceCatalogItem } from '@/shared/types'

const emptyForm = {
  name: '',
  companies: [] as string[],
  price: 0,
  services: [] as PackageService[],
}

export function NewPackage() {
  const navigate = useNavigate()
  const { packageId } = useParams<{ packageId: string }>()
  const isEditing = Boolean(packageId)
  const { catalog, packages, groups, addPackage, updatePackage } = useServices()
  const { activeCompanies } = useCompanies()
  const { showToast } = useToast()

  const existingPackage = useMemo(
    () => (isEditing ? packages.find((p) => p.id === Number(packageId)) : undefined),
    [packages, packageId, isEditing]
  )

  const [form, setForm] = useState(() => {
    if (existingPackage) {
      return {
        name: existingPackage.name,
        companies: [...existingPackage.companies],
        price: existingPackage.price,
        services: [...existingPackage.services],
      }
    }
    return emptyForm
  })
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('Tümü')
  const [companySearch, setCompanySearch] = useState('')
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [bulkVat, setBulkVat] = useState('')

  const groupNames = useMemo(() => groups.map((g) => g.name), [groups])

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase()
    return catalog.filter((c) => {
      if (!c.isActive) return false
      const matchesSearch = !term || c.name.toLowerCase().includes(term)
      const matchesGroup = groupFilter === 'Tümü' || c.group === groupFilter
      return matchesSearch && matchesGroup
    })
  }, [catalog, search, groupFilter])

  const selectedServices = useMemo(
    () =>
      form.services
        .map((ps) => {
          const item = catalog.find((c) => c.id === ps.serviceId)
          if (!item) return null
          const price = ps.customPrice ?? item.price
          const vatRate = ps.customVatRate ?? item.vatRate
          return { ...item, customPrice: ps.customPrice, customVatRate: ps.customVatRate, effectivePrice: price, effectiveVatRate: vatRate }
        })
        .filter(Boolean) as Array<ServiceCatalogItem & { customPrice?: number; customVatRate?: number; effectivePrice: number; effectiveVatRate: number }>,
    [form.services, catalog]
  )

  const selectedTotal = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.effectivePrice, 0),
    [selectedServices]
  )

  const selectedKdv = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.effectivePrice * s.effectiveVatRate) / 100, 0),
    [selectedServices]
  )

  const selectedTotalWithKdv = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.effectivePrice * (1 + s.effectiveVatRate / 100), 0),
    [selectedServices]
  )

  const hasCustomPricing = form.services.some((ps) => ps.customPrice !== undefined || ps.customVatRate !== undefined)
  const effectiveTotal = hasCustomPricing ? selectedTotalWithKdv + form.price : form.price
  const difference = effectiveTotal - selectedTotalWithKdv

  const isAllCompanies = form.companies.length === 0

  const filteredCompanies = useMemo(() => {
    const term = companySearch.trim().toLowerCase()
    return activeCompanies.filter((c) => {
      const matchesSearch = !term || c.name.toLowerCase().includes(term)
      const notSelected = !form.companies.includes(c.name)
      return matchesSearch && notSelected
    })
  }, [activeCompanies, companySearch, form.companies])

  const toggleService = (serviceId: number) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.some((ps) => ps.serviceId === serviceId)
        ? prev.services.filter((ps) => ps.serviceId !== serviceId)
        : [...prev.services, { serviceId }],
    }))
  }

  const handleSelectAll = () => {
    const allIds = filteredCatalog.map((c) => c.id)
    const allSelected = allIds.every((id) => form.services.some((ps) => ps.serviceId === id))
    if (allSelected) {
      setForm((prev) => ({
        ...prev,
        services: prev.services.filter((ps) => !allIds.includes(ps.serviceId)),
      }))
    } else {
      setForm((prev) => {
        const existingIds = new Set(prev.services.map((ps) => ps.serviceId))
        const toAdd = allIds.filter((id) => !existingIds.has(id)).map((serviceId) => ({ serviceId }))
        return { ...prev, services: [...prev.services, ...toAdd] }
      })
    }
  }

  const updateServicePrice = (serviceId: number, customPrice: number) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((ps) =>
        ps.serviceId === serviceId ? { ...ps, customPrice } : ps
      ),
    }))
  }

  const updateServiceVat = (serviceId: number, customVatRate: number) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((ps) =>
        ps.serviceId === serviceId ? { ...ps, customVatRate } : ps
      ),
    }))
  }

  const resetServicePrice = (serviceId: number) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((ps) =>
        ps.serviceId === serviceId
          ? { ...ps, customPrice: undefined, customVatRate: undefined }
          : ps
      ),
    }))
  }

  const resetAllPrices = () => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((ps) => ({ serviceId: ps.serviceId })),
    }))
  }

  const handleBulkVat = () => {
    const vat = Number(bulkVat)
    if (isNaN(vat) || vat < 0) return
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((ps) => ({ ...ps, customVatRate: vat })),
    }))
    setBulkVat('')
  }

  const resetAllVat = () => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((ps) => ({ ...ps, customVatRate: undefined })),
    }))
  }

  const addCompany = (name: string) => {
    setForm((prev) => ({
      ...prev,
      companies: [...new Set([...prev.companies, name])],
    }))
    setCompanySearch('')
  }

  const removeCompany = (name: string) => {
    setForm((prev) => ({
      ...prev,
      companies: prev.companies.filter((c) => c !== name),
    }))
  }

  const setAllCompanies = () => {
    setForm((prev) => ({ ...prev, companies: [] }))
    setShowCompanyDropdown(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.services.length === 0) {
      showToast('warning', 'Hizmet seçilmedi', 'Pakete en az bir hizmet eklemelisiniz.')
      return
    }
    if (!form.name.trim()) {
      showToast('warning', 'Paket adı gerekli', 'Lütfen paket için bir ad girin.')
      return
    }
    const normalizedName = form.name.trim().toLocaleLowerCase('tr-TR')
    if (packages.some((item) => item.id !== existingPackage?.id && item.name.trim().toLocaleLowerCase('tr-TR') === normalizedName)) {
      showToast('warning', 'Paket zaten mevcut', 'Aynı adla ikinci bir paket oluşturamazsınız.')
      return
    }
    if (isEditing && existingPackage) {
      updatePackage(existingPackage.id, form)
      showToast('success', 'Paket güncellendi', `"${form.name}" paketi başarıyla güncellendi.`)
    } else {
      addPackage(form)
      showToast('success', 'Paket oluşturuldu', `"${form.name}" paketi başarıyla oluşturuldu.`)
    }
    navigate('/ayarlar/paketler')
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <PageHeader
        title={isEditing ? 'Paket Düzenle' : 'Yeni Paket'}
        subtitle={isEditing ? `${form.name} — düzenleniyor` : 'Hizmetleri seçerek paket oluşturun'}
        className="shrink-0 mb-0"
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/ayarlar/paketler')}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Vazgeç
            </button>
            <button
              type="submit"
              form="package-form"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Sidebar */}
        <div className="lg:col-span-3 h-full min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto flex flex-col gap-3">
            {/* Package info */}
            <form id="package-form" onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                Paket Bilgileri
              </h3>
              <Input
                size="sm"
                label="Paket Adı"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Paket adı"
                required
              />

              {/* Multi-company selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Firmalar
                </label>

                {/* Selected companies tags */}
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px] p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {isAllCompanies ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-medium rounded-full">
                      <Check className="w-3 h-3" />
                      Tüm Firmalar
                    </span>
                  ) : (
                    form.companies.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-medium rounded-full"
                      >
                        <Building2 className="w-3 h-3" />
                        {name}
                        <button
                          type="button"
                          onClick={() => removeCompany(name)}
                          aria-label={`${name} firmasını paketten çıkar`}
                          className="hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Search + dropdown */}
                <div className="relative">
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Firma ara..."
                        value={companySearch}
                        onChange={(e) => {
                          setCompanySearch(e.target.value)
                          setShowCompanyDropdown(true)
                        }}
                        onFocus={() => setShowCompanyDropdown(true)}
                        className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={setAllCompanies}
                      className={`px-2 py-1.5 text-[10px] font-medium rounded-lg whitespace-nowrap border ${
                        isAllCompanies
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      title="Paket tüm firmalarda görünsün"
                    >
                      Tümü
                    </button>
                  </div>

                  {showCompanyDropdown && filteredCompanies.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCompanies.map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => {
                            addCompany(company.name)
                            setShowCompanyDropdown(false)
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-blue-50 text-left"
                        >
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{company.name}</p>
                            <p className="text-[10px] text-slate-400">{company.companyType} • {company.dangerClass}</p>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {showCompanyDropdown && filteredCompanies.length === 0 && companySearch && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-center text-xs text-slate-500">
                      Eşleşen firma yok.
                    </div>
                  )}

                  {/* Click-away overlay */}
                  {showCompanyDropdown && (
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowCompanyDropdown(false)}
                    />
                  )}
                </div>

                <p className="text-[10px] text-slate-400 mt-1.5">
                  {isAllCompanies
                    ? 'Bu paket tüm firmalarda görünür.'
                    : `${form.companies.length} firma seçildi. "Tümü" seçilirse paket her firmada görünür.`}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Paket Fiyatı (₺)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={String(form.price)}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
                <p className="text-[10px] text-slate-400 mt-1.5">
                  {hasCustomPricing
                    ? 'Test fiyatlarının üstüne eklenir. 0 yazarsanız sadece test fiyatları geçerli olur.'
                    : 'Test fiyatı verilmediği için bu tutar toplam olarak baz alınır.'}
                </p>
              </div>
            </form>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h3 className="text-xs font-bold text-slate-800 mb-2">Özet</h3>

              {/* Pricing mode banner */}
              <div className={`mb-3 p-2.5 rounded-lg border text-[11px] ${
                hasCustomPricing
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {hasCustomPricing ? (
                  <>
                    <p className="font-bold mb-0.5">Test Fiyatları + Paket Fiyatı</p>
                    <p>Testlere özel fiyat/KDV verilmiş. Paket fiyatı test fiyatlarının üstüne eklenir.</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold mb-0.5">Sadece Paket Fiyatı</p>
                    <p>Testlere özel fiyat/KDV verilmemiş. Paket fiyatı toplam tutar olarak baz alınır.</p>
                  </>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Hizmet Sayısı:</span>
                  <span className="font-medium text-slate-800">{form.services.length}</span>
                </div>
                {hasCustomPricing && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Test Ara Toplam:</span>
                      <span className="font-medium text-slate-800">₺{selectedTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Test KDV:</span>
                      <span className="font-medium text-slate-800">₺{selectedKdv.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Test Toplam (KDV dahil):</span>
                      <span className="font-medium text-slate-800">₺{selectedTotalWithKdv.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>+ Paket Fiyatı:</span>
                      <span className="font-medium text-blue-600">₺{form.price.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {!hasCustomPricing && (
                  <div className="flex justify-between text-slate-600">
                    <span>Liste Fiyatı (referans):</span>
                    <span className="text-slate-400">₺{selectedTotalWithKdv.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-slate-100 flex justify-between text-sm font-bold">
                  <span className="text-slate-800">Geçerli Toplam:</span>
                  <span className="text-blue-600">₺{effectiveTotal.toFixed(2)}</span>
                </div>
                {hasCustomPricing && difference !== 0 && (
                  <div className={`flex justify-between text-[11px] font-medium ${
                    difference < 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}>
                    <span>Liste'ye göre fark:</span>
                    <span>{difference < 0 ? '↓' : '↑'} ₺{Math.abs(difference).toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-slate-100 flex justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Firmalar:
                  </span>
                  <span className="font-medium text-slate-800">
                    {isAllCompanies ? 'Tümü' : `${form.companies.length} firma`}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/ayarlar/paketler')}
              className="flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium py-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Paket Listesine Dön
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-9 h-full min-h-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
            <div className="flex flex-col lg:flex-row gap-2.5 h-full min-h-0 overflow-hidden">
              {/* Left: Catalog */}
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden border border-slate-100 rounded-xl p-2.5 bg-slate-50">
                <div className="flex items-center justify-between mb-1.5 shrink-0">
                  <h4 className="text-xs font-bold text-slate-700">Hizmet Kataloğu</h4>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[10px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    Tümünü Seç/Kaldır
                  </button>
                </div>

                <div className="flex gap-1.5 mb-1.5 shrink-0">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ara..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Tümü">Tümü</option>
                    {groupNames.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-1">
                  {filteredCatalog.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">Hizmet bulunamadı.</p>
                  ) : (
                    filteredCatalog.map((item) => {
                      const isSelected = form.services.some((ps) => ps.serviceId === item.id)
                      const group = groups.find((g) => g.name === item.group)
                      const colors = getGroupColor(group?.color ?? 'slate')
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleService(item.id)}
                          className={`w-full flex items-center gap-2 p-1.5 rounded-lg border text-left transition-colors ${
                            isSelected
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-white border-slate-100 hover:border-blue-200'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-800 truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {item.group} — ₺{item.price.toFixed(2)} (%{item.vatRate} KDV)
                            </p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Right: Selected services */}
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden border border-slate-100 rounded-xl p-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 shrink-0">
                  <h4 className="text-xs font-bold text-slate-700">Paket Hizmetleri</h4>
                  <div className="flex items-center gap-2">
                    {form.services.some((ps) => ps.customPrice !== undefined || ps.customVatRate !== undefined) && (
                      <button
                        type="button"
                        onClick={resetAllPrices}
                        className="text-[10px] font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        title="Tüm özel fiyatları sıfırla"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Fiyatları Sıfırla
                      </button>
                    )}
                    <span className="text-xs text-slate-400">{form.services.length} hizmet</span>
                  </div>
                </div>

                {/* KDV Ekle toolbar */}
                {form.services.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-1.5 shrink-0 p-2 bg-violet-50 rounded-lg border border-violet-100">
                    <Percent className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={bulkVat}
                      onChange={(e) => setBulkVat(e.target.value)}
                      placeholder="KDV %"
                      className="flex-1 px-2 py-1 bg-white border border-violet-200 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={handleBulkVat}
                      disabled={!bulkVat}
                      className="px-2 py-1 text-[10px] font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:opacity-40"
                    >
                      Tümüne Uygula
                    </button>
                    {form.services.some((ps) => ps.customVatRate !== undefined) && (
                      <button
                        type="button"
                        onClick={resetAllVat}
                        className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
                        title="Tüm KDV'leri sıfırla"
                      >
                        Sıfırla
                      </button>
                    )}
                  </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-1.5">
                  {form.services.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">
                      Henüz hizmet seçilmedi. Soldan ekleyin.
                    </p>
                  ) : (
                    selectedServices.map((service) => {
                      const group = groups.find((g) => g.name === service.group)
                      const colors = getGroupColor(group?.color ?? 'slate')
                      const hasCustomPrice = service.customPrice !== undefined
                      const hasCustomVat = service.customVatRate !== undefined
                      const hasCustom = hasCustomPrice || hasCustomVat
                      const priceDiff = service.effectivePrice - service.price
                      const totalWithVat = service.effectivePrice * (1 + service.effectiveVatRate / 100)
                      return (
                        <div
                          key={service.id}
                          className="p-1.5 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-800 truncate">{service.name}</p>
                              <p className="text-[10px] text-slate-500">
                                {service.group}
                                {hasCustom ? (
                                  <span className="ml-1 text-amber-600 font-medium">• Özel fiyat</span>
                                ) : (
                                  <> — Liste: ₺{service.price.toFixed(2)}</>
                                )}
                                {hasCustomPrice && priceDiff !== 0 && (
                                  <span className={`ml-1 font-medium ${priceDiff < 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    ({priceDiff < 0 ? '↓' : '↑'}₺{Math.abs(priceDiff).toFixed(2)})
                                  </span>
                                )}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleService(service.id)}
                              aria-label={`${service.name} hizmetini paketten çıkar`}
                              className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Fiyat (₺)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={String(service.effectivePrice)}
                                onChange={(e) => updateServicePrice(service.id, Number(e.target.value) || 0)}
                                className={`w-full px-2 py-1 bg-white border rounded-md text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 ${
                                  hasCustomPrice ? 'border-amber-300 text-amber-700 font-medium' : 'border-slate-200 focus:border-blue-500'
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">KDV (%)</label>
                              <input
                                type="number"
                                min="0"
                                value={String(service.effectiveVatRate)}
                                onChange={(e) => updateServiceVat(service.id, Number(e.target.value) || 0)}
                                className={`w-full px-2 py-1 bg-white border rounded-md text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 ${
                                  hasCustomVat ? 'border-amber-300 text-amber-700 font-medium' : 'border-slate-200 focus:border-blue-500'
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Toplam (₺)</label>
                              <div className="px-2 py-1 bg-blue-50 border border-blue-100 rounded-md text-xs font-bold text-blue-700 text-right">
                                {totalWithVat.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {hasCustom && (
                            <button
                              type="button"
                              onClick={() => resetServicePrice(service.id)}
                              className="mt-1 text-[10px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              Liste fiyatına dön
                            </button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="mt-1.5 pt-1.5 border-t border-slate-100 shrink-0 space-y-0.5">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Ara Toplam:</span>
                    <span>₺{selectedTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>KDV:</span>
                    <span>₺{selectedKdv.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span>Toplam:</span>
                    <span>₺{selectedTotalWithKdv.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
