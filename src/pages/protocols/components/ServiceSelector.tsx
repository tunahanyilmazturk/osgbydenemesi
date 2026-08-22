import { useMemo, useState } from 'react'
import { Package, Plus, Search, Trash2 } from 'lucide-react'
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
      if (companyServices.length > 0) {
        // Firma özel testleri varsa, onları özel fiyatlarıyla göster
        list = companyServices
          .map((cs) => catalog.find((c) => c.id === cs.serviceId))
          .filter(Boolean) as ServiceCatalogItem[]
        // Ayrıca firmanın companies alanında kayıtlı olduğu hizmetleri de ekle (tekrar etmeden)
        catalog.forEach((c) => {
          if (
            !companyServices.some((cs) => cs.serviceId === c.id) &&
            c.companies.some((comp) => comp.toLowerCase() === company.toLowerCase())
          ) {
            list.push(c)
          }
        })
      } else {
        // Firma özel test yoksa, tüm genel hizmetleri ve firma adına kayıtlı olanları göster
        list = catalog.filter(
          (c) =>
            c.companies.length === 0 ||
            c.companies.some((comp) => comp.toLowerCase() === company.toLowerCase())
        )
      }
    } else if (tab === 'packages') {
      list = packages.filter(
        (p) =>
          p.companies.length === 0 ||
          p.companies.some((comp) => comp.toLowerCase() === company.toLowerCase())
      )
    } else {
      list = [...catalog]
    }

    // Hide already-added catalog items
    list = list.filter((item) => !selectedNames.has(item.name.toLowerCase()))

    if (term) {
      list = list.filter((item) => item.name.toLowerCase().includes(term))
    }

    return list
  }, [catalog, packages, company, search, tab, selectedNames, companyServices])

  const isCatalogItem = (item: ServiceCatalogItem | ServicePackage): item is ServiceCatalogItem =>
    'vatRate' in item

  const handleAdd = (item: ServiceCatalogItem | ServicePackage) => {
    if (isCatalogItem(item)) {
      // Firma özel fiyatı varsa onu kullan
      const companyService = companyServiceMap.get(item.id)
      const price = companyService ? companyService.customPrice : item.price
      const vatRate = companyService?.customVatRate ?? item.vatRate
      onAddService({
        name: item.name,
        group: item.group,
        status: 'Numune Bekliyor',
        price,
        vatRate,
        recordedBy: 'Kullanıcı',
        processDate: nowLocalDateTime(),
      })
    } else {
      const hasCustomPricing = item.services.some((ps) => ps.customPrice !== undefined || ps.customVatRate !== undefined)
      // Testleri ekle
      item.services.forEach((ps) => {
        const service = catalog.find((c) => c.id === ps.serviceId)
        if (service && !selectedNames.has(service.name.toLowerCase())) {
          const companyService = companyServiceMap.get(service.id)
          // Öncelik: firma özel fiyatı > paket özel fiyatı > katalog fiyatı
          // Eğer pakette hiç özel fiyat yoksa, testler 0 fiyatla eklenir (paket fiyatı tek satır olarak eklenir)
          let price: number
          let vatRate: number
          if (companyService) {
            price = companyService.customPrice
            vatRate = companyService.customVatRate ?? service.vatRate
          } else if (hasCustomPricing) {
            price = ps.customPrice ?? service.price
            vatRate = ps.customVatRate ?? service.vatRate
          } else {
            // Paket fiyatı baz alındığı için testler 0 fiyatla eklenir
            price = 0
            vatRate = service.vatRate
          }
          onAddService({
            name: service.name,
            group: service.group,
            status: 'Numune Bekliyor',
            price,
            vatRate,
            recordedBy: 'Kullanıcı',
            processDate: nowLocalDateTime(),
          })
        }
      })
      // Paket fiyatını tek satır olarak ekle (hem baz hem ekleme modunda)
      const packageName = `Paket: ${item.name}`
      if (!selectedNames.has(packageName.toLowerCase())) {
        onAddService({
          name: packageName,
          group: 'Paket',
          status: 'Numune Bekliyor',
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
      name: newService.name,
      group: newService.group,
      status: 'Numune Bekliyor',
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
    { key: 'company' as SelectorTab, label: 'Firma Hizmetleri' },
    { key: 'packages' as SelectorTab, label: 'Firma Paketleri' },
    { key: 'all' as SelectorTab, label: 'Tüm Hizmetler' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 h-full min-h-0 overflow-hidden">
      {/* Left: Catalog */}
      <div className="flex flex-col h-full min-h-0 overflow-hidden border border-slate-100 rounded-xl p-2.5 bg-slate-50">
        <div className="flex gap-1.5 border-b border-slate-100 pb-1.5 mb-1.5 overflow-x-auto shrink-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-2 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap ${
                tab === t.key
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative mb-1.5 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-1">
          {filteredCatalog.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              {selectedServices.length > 0 ? 'Tüm hizmetler eklendi.' : 'Hizmet bulunamadı.'}
            </p>
          ) : (
            filteredCatalog.map((item) => (
              <button
                key={isCatalogItem(item) ? `s-${item.id}` : `p-${item.id}`}
                onClick={() => handleAdd(item)}
                className="w-full flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 truncate">
                    {!isCatalogItem(item) && <Package className="w-3.5 h-3.5 inline-block mr-1 text-amber-500" />}
                    {item.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {'group' in item ? item.group : 'Paket'} —{' '}
                    {(() => {
                      if (!isCatalogItem(item)) return `₺${item.price.toFixed(2)}`
                      const cs = companyServiceMap.get(item.id)
                      if (cs && cs.customPrice !== item.price) {
                        return (
                          <>
                            <span className="text-blue-600 font-medium">₺{cs.customPrice.toFixed(2)}</span>
                            <span className="line-through text-slate-400 ml-1">₺{item.price.toFixed(2)}</span>
                          </>
                        )
                      }
                      return `₺${item.price.toFixed(2)}`
                    })()}
                  </p>
                </div>
                <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />
              </button>
            ))
          )}
        </div>

        <div className="pt-1.5 border-t border-slate-100 mt-1.5 shrink-0">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Hizmet Ekle
            </button>
          ) : (
            <form onSubmit={handleAddCustom} className="space-y-1.5">
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
                  className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Vazgeç
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Right: Selected services */}
      <div className="flex flex-col h-full min-h-0 overflow-hidden border border-slate-100 rounded-xl p-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 shrink-0">
          <h3 className="text-sm font-bold text-slate-800">Protokol Hizmetleri</h3>
          <span className="text-xs text-slate-500">{selectedServices.length} hizmet</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-1">
          {selectedServices.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">Henüz hizmet eklenmemiş.</p>
          ) : (
            selectedServices.map((service) => (
              <div
                key={service.id}
                className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 truncate">{service.name}</p>
                  <p className="text-[10px] text-slate-500">{service.group}</p>
                </div>
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
                        className="w-14 pl-4 pr-1 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-right"
                        title="Fiyat (KDV hariç)"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 w-12 text-right">
                      ₺{calculateTotal(service.price, service.vatRate).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 shrink-0">
                    ₺{service.totalPrice.toFixed(2)}
                  </span>
                )}
                <button
                  onClick={() => onRemoveService(service.id)}
                  className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
                  title="Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Hizmet Sayısı: <span className="font-semibold text-slate-800">{selectedServices.length}</span>
          </span>
          <span className="text-sm font-bold text-slate-800">₺{totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
