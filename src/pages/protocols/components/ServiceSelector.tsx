import { useMemo, useState } from 'react'
import { Building2, CheckCircle2, FlaskConical, Package, Plus, Search, Trash2 } from 'lucide-react'
import { useServices } from '../../../context/ServicesContext'
import { Input } from '../../../components/ui/Input'
import type { CompanyService } from '../../../context/CompaniesContext'
import type { ProtocolService, ServiceCatalogItem, ServicePackage } from '../../../types'
import { nowLocalDateTime } from '../../../utils/date'

type SelectorTab = 'company' | 'packages' | 'all'

interface ServiceSelectorProps {
  company: string
  companyServices?: CompanyService[]
  selectedServices: Array<{
    id: number
    code: number
    name: string
    group: string
    price: number
    vatRate: number
    totalPrice: number
    status?: string
    recordedBy?: string
  }>
  onAddService: (service: Omit<ProtocolService, 'id' | 'protocolId' | 'barcode' | 'totalPrice'>) => void
  onRemoveService: (serviceId: number) => void
  onUpdateService?: (serviceId: number, updates: { price?: number; vatRate?: number }) => void
}

function calculateTotal(price: number, vatRate: number) {
  return Number((price * (1 + vatRate / 100)).toFixed(2))
}

export function ServiceSelector({
  company,
  companyServices = [],
  selectedServices,
  onAddService,
  onRemoveService,
  onUpdateService,
}: ServiceSelectorProps) {
  const { catalog, packages } = useServices()
  const [tab, setTab] = useState<SelectorTab>('company')
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newService, setNewService] = useState({
    name: '',
    group: 'Biyokimya',
    price: '',
    vatRate: '0',
  })

  const totalAmount = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.totalPrice, 0),
    [selectedServices]
  )

  const totalExcludingVat = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price, 0),
    [selectedServices]
  )

  const selectedNames = useMemo(
    () => new Set(selectedServices.map((s) => s.name.toLowerCase())),
    [selectedServices]
  )

  // Firma özel fiyat map'i
  const companyServiceMap = useMemo(() => {
    const map = new Map<number, CompanyService>()
    companyServices.forEach((cs) => map.set(cs.serviceId, cs))
    return map
  }, [companyServices])

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase()
    let list: (ServiceCatalogItem | ServicePackage)[] = []

    if (tab === 'company') {
      list = companyServices
        .map((cs) => catalog.find((c) => c.id === cs.serviceId))
        .filter(Boolean) as ServiceCatalogItem[]
    } else if (tab === 'packages') {
      list = packages.filter(
        (p) =>
          p.companies.length === 0 ||
          p.companies.some((comp) => comp.toLowerCase() === company.toLowerCase())
      )
    } else {
      list = [...catalog]
    }

    // Zaten eklenmiş hizmetleri/paketleri listeden gizle
    list = list.filter((item) => {
      if (selectedNames.has(item.name.toLowerCase())) return false
      // Paketler "Paket: X" adıyla eklendiği için paket adını da kontrol et
      if (!('vatRate' in item) && selectedNames.has(`paket: ${item.name.toLowerCase()}`)) return false
      return true
    })

    if (term) {
      list = list.filter((item) => item.name.toLowerCase().includes(term))
    }

    return list
  }, [catalog, packages, company, search, tab, selectedNames, companyServices])

  const isCatalogItem = (item: ServiceCatalogItem | ServicePackage): item is ServiceCatalogItem =>
    'vatRate' in item

  const handleAdd = (item: ServiceCatalogItem | ServicePackage) => {
    if (isCatalogItem(item)) {
      const companyService = companyServiceMap.get(item.id)
      const price = companyService ? companyService.customPrice : item.price
      const vatRate = companyService?.customVatRate ?? item.vatRate
      onAddService({
        code: item.code,
        name: item.name,
        group: item.group,
        status: 'İşlem Bekliyor',
        price,
        vatRate,
        recordedBy: 'Kullanıcı',
        processDate: nowLocalDateTime(),
      })
    } else {
      const hasCustomPricing = item.services.some((ps) => ps.customPrice !== undefined || ps.customVatRate !== undefined)
      item.services.forEach((ps) => {
        const service = catalog.find((c) => c.id === ps.serviceId)
        if (service && !selectedNames.has(service.name.toLowerCase())) {
          const companyService = companyServiceMap.get(service.id)
          let price: number
          let vatRate: number
          if (companyService) {
            price = companyService.customPrice
            vatRate = companyService.customVatRate ?? service.vatRate
          } else if (hasCustomPricing) {
            price = ps.customPrice ?? service.price
            vatRate = ps.customVatRate ?? service.vatRate
          } else {
            price = 0
            vatRate = service.vatRate
          }
          onAddService({
            code: service.code,
            name: service.name,
            group: service.group,
            status: 'İşlem Bekliyor',
            price,
            vatRate,
            recordedBy: 'Kullanıcı',
            processDate: nowLocalDateTime(),
          })
        }
      })
      const packageName = `Paket: ${item.name}`
      if (!selectedNames.has(packageName.toLowerCase())) {
        onAddService({
          code: 0,
          name: packageName,
          group: 'Paket',
          status: 'İşlem Bekliyor',
          price: item.price,
          vatRate: 0,
          recordedBy: 'Kullanıcı',
          processDate: nowLocalDateTime(),
        })
      }
    }
  }

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    onAddService({
      code: 0,
      name: newService.name,
      group: newService.group,
      status: 'İşlem Bekliyor',
      price: Number(newService.price) || 0,
      vatRate: Number(newService.vatRate) || 0,
      recordedBy: 'Kullanıcı',
      processDate: nowLocalDateTime(),
    })
    setNewService({ name: '', group: 'Biyokimya', price: '', vatRate: '0' })
    setShowAddForm(false)
  }

  const handlePriceChange = (serviceId: number, price: number) => {
    if (!onUpdateService) return
    const service = selectedServices.find((s) => s.id === serviceId)
    if (!service) return
    onUpdateService(serviceId, { price, vatRate: service.vatRate })
  }

  const tabs = [
    { key: 'company' as SelectorTab, label: 'Firma Hizmetleri', icon: Building2 },
    { key: 'packages' as SelectorTab, label: 'Paketler', icon: Package },
    { key: 'all' as SelectorTab, label: 'Tümü', icon: FlaskConical },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full min-h-0 overflow-hidden">
      {/* Sol: Katalog */}
      <div className="flex flex-col h-full min-h-0 overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
        {/* Tab'lar */}
        <div className="flex gap-1 px-2 pt-2 bg-slate-50 border-b border-slate-200 shrink-0">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-t-lg whitespace-nowrap transition-all ${
                  tab === t.key
                    ? 'text-blue-600 bg-white border-x border-t border-slate-200 -mb-px'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Arama */}
        <div className="relative px-2 py-2 border-b border-slate-100 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Hizmet/test/paket ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        {/* Hizmet/Paket listesi */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          {filteredCatalog.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Search className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">
                {selectedServices.length > 0
                  ? 'Tüm hizmetler eklendi veya aramanızla eşleşen bulunamadı.'
                  : 'Aramanızla eşleşen hizmet bulunamadı.'}
              </p>
            </div>
          ) : (
            filteredCatalog.map((item) => {
              const isCatalog = isCatalogItem(item)
              let priceDisplay: React.ReactNode = ''
              if (isCatalog) {
                const cs = companyServiceMap.get(item.id)
                if (cs && cs.customPrice !== item.price) {
                  priceDisplay = (
                    <>
                      <span className="text-blue-600 font-bold">₺{cs.customPrice.toFixed(2)}</span>
                      <span className="line-through text-slate-400 ml-1 text-[9px]">₺{item.price.toFixed(2)}</span>
                    </>
                  )
                } else {
                  priceDisplay = `₺${item.price.toFixed(2)}`
                }
              } else {
                priceDisplay = `₺${item.price.toFixed(2)}`
              }

              return (
                <button
                  key={isCatalog ? `s-${item.id}` : `p-${item.id}`}
                  onClick={() => handleAdd(item)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg border transition-all text-left group bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm"
                >
                  {/* Sol ikon */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isCatalog
                      ? 'bg-blue-50 group-hover:bg-blue-100'
                      : 'bg-amber-50 group-hover:bg-amber-100'
                  }`}>
                    {isCatalog ? (
                      <FlaskConical className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <Package className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </div>
                  {/* Orta — ad + grup */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      {isCatalog ? item.group : 'Paket'}
                      {!isCatalog && (
                        <span className="px-1 py-0 rounded bg-amber-100 text-amber-600 text-[9px] font-bold">
                          {item.services.length} test
                        </span>
                      )}
                    </p>
                  </div>
                  {/* Sağ — fiyat + ekle ikonu */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-slate-500">{priceDisplay}</span>
                    <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                      <Plus className="w-3 h-3 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Manuel Hizmet Ekleme */}
        <div className="border-t border-slate-200 shrink-0">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Hizmet Ekle (Manuel)
            </button>
          ) : (
            <form onSubmit={handleAddCustom} className="p-2 space-y-1.5 bg-slate-50">
              <Input
                size="sm"
                label="Hizmet Adı"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                required
              />
              <div className="grid grid-cols-3 gap-1.5">
                <Input
                  size="sm"
                  label="Grup"
                  value={newService.group}
                  onChange={(e) => setNewService({ ...newService, group: e.target.value })}
                  required
                />
                <Input
                  size="sm"
                  label="Fiyat"
                  type="number"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  required
                />
                <Input
                  size="sm"
                  label="KDV %"
                  type="number"
                  value={newService.vatRate}
                  onChange={(e) => setNewService({ ...newService, vatRate: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Sağ: Seçili Hizmetler + Fiyat Düzenleme */}
      <div className="flex flex-col h-full min-h-0 overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
        {/* Başlık */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-50 to-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Protokol Hizmetleri</h3>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-md">
            {selectedServices.length} hizmet
          </span>
        </div>

        {/* Hizmet listesi */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          {selectedServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Plus className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">Henüz hizmet eklenmemiş.</p>
              <p className="text-[10px] text-slate-400 mt-1">Soldan hizmet seçerek ekleyin.</p>
            </div>
          ) : (
            selectedServices.map((service) => (
              <div
                key={service.id}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                {/* Sol renk çubuğu — gruba göre */}
                <div className={`w-1 h-8 rounded-full shrink-0 ${
                  service.group === 'Paket' ? 'bg-amber-400' :
                  service.group === 'Biyokimya' ? 'bg-blue-400' :
                  service.group === 'Hematoloji' ? 'bg-rose-400' :
                  service.group === 'Mikrobiyoloji' ? 'bg-purple-400' :
                  service.group === 'Seroloji' ? 'bg-cyan-400' :
                  service.group === 'Radyoloji' ? 'bg-indigo-400' :
                  'bg-slate-400'
                }`} />
                {/* Ad + grup */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 truncate">{service.name}</p>
                  <p className="text-[10px] text-slate-500">{service.group}</p>
                </div>
                {/* Fiyat düzenleme */}
                {onUpdateService ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="relative">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₺</span>
                      <input
                        type="number"
                        value={service.price}
                        onChange={(e) => handlePriceChange(service.id, Number(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                        className="w-16 pl-4 pr-1 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 text-right"
                        title="Fiyat (KDV hariç)"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 w-14 text-right">
                      ₺{calculateTotal(service.price, service.vatRate).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 shrink-0">
                    ₺{service.totalPrice.toFixed(2)}
                  </span>
                )}
                {/* Sil */}
                <button
                  onClick={() => onRemoveService(service.id)}
                  className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  title="Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Alt özet — toplam */}
        <div className="px-3 py-2 bg-gradient-to-r from-slate-50 to-white border-t border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500">
                Hizmet: <span className="font-bold text-slate-700">{selectedServices.length}</span>
              </span>
              <span className="text-[10px] text-slate-500">
                KDV Hariç: <span className="font-bold text-slate-700">₺{totalExcludingVat.toFixed(2)}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500">Toplam:</span>
              <span className="text-sm font-bold text-emerald-600">₺{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
