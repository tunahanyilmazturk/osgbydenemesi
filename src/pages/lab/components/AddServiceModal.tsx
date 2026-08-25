import type { ReactNode } from 'react'
import { Building2, CheckCircle2, FlaskConical, Package, Plus, Search, Trash2, User } from 'lucide-react'
import { Modal } from '@/shared/components/ui/Modal'
import type { PatientDetail, Protocol, ProtocolService, ServiceCatalogItem, ServicePackage } from '@/shared/types'
import type { CompanyService } from '@/state/CompaniesContext'

interface AddServiceModalProps {
  isOpen: boolean
  onClose: () => void
  selectedProtocol: Protocol | null
  selectedPatient: PatientDetail | undefined
  addServiceTab: 'company' | 'packages' | 'all'
  onAddServiceTabChange: (tab: 'company' | 'packages' | 'all') => void
  addServiceSearch: string
  onAddServiceSearchChange: (value: string) => void
  filteredAddServiceList: (ServiceCatalogItem | ServicePackage)[]
  companyServiceMap: Map<number, CompanyService>
  onQuickAddService: (item: ServiceCatalogItem | ServicePackage) => void
  onUpdateServicePrice: (protocolId: number, serviceId: number, price: number, vatRate: number) => void
  onRemoveService: (protocolId: number, serviceId: number, serviceName: string) => void
  protocolTotalAmount: number
}

export function AddServiceModal({
  isOpen,
  onClose,
  selectedProtocol,
  selectedPatient,
  addServiceTab,
  onAddServiceTabChange,
  addServiceSearch,
  onAddServiceSearchChange,
  filteredAddServiceList,
  companyServiceMap,
  onQuickAddService,
  onUpdateServicePrice,
  onRemoveService,
  protocolTotalAmount,
}: AddServiceModalProps) {
  const tabs = [
    { key: 'company' as const, label: 'Firma Hizmetleri', icon: Building2 },
    { key: 'packages' as const, label: 'Paketler', icon: Package },
    { key: 'all' as const, label: 'Tümü', icon: FlaskConical },
  ]

  const renderPriceDisplay = (item: ServiceCatalogItem | ServicePackage): ReactNode => {
    const isCatalog = 'vatRate' in item
    if (isCatalog) {
      const cs = companyServiceMap.get((item as ServiceCatalogItem).id)
      if (cs && cs.customPrice !== (item as ServiceCatalogItem).price) {
        return (
          <>
            <span className="text-blue-600 font-bold">₺{cs.customPrice.toFixed(2)}</span>
            <span className="line-through text-slate-400 ml-1 text-[9px]">₺{(item as ServiceCatalogItem).price.toFixed(2)}</span>
          </>
        )
      }
      return `₺${(item as ServiceCatalogItem).price.toFixed(2)}`
    }
    return `₺${(item as ServicePackage).price.toFixed(2)}`
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hızlı Hizmet Ekle"
      subtitle={selectedProtocol && selectedPatient ? (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-xs font-bold text-slate-800 truncate">{selectedPatient.name}</span>
          <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
            {selectedProtocol.company} — {selectedProtocol.protocolNo}
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-medium bg-slate-100 text-slate-600 rounded shrink-0">
            {selectedProtocol.examType}
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white rounded shrink-0">
            {selectedProtocol.services.length} hizmet
          </span>
        </div>
      ) : undefined}
      size="2xl"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[520px]">
          {/* Sol: Katalog */}
          <div className="flex flex-col h-full min-h-0 overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
            {/* Tab'lar */}
            <div className="flex gap-1 px-2 pt-2 bg-slate-50 border-b border-slate-200 shrink-0">
              {tabs.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.key}
                    onClick={() => onAddServiceTabChange(t.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-t-lg whitespace-nowrap transition-all ${
                      addServiceTab === t.key
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
                value={addServiceSearch}
                onChange={(e) => onAddServiceSearchChange(e.target.value)}
                placeholder="Hizmet/test/paket ara..."
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {/* Hizmet/Paket listesi */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
              {filteredAddServiceList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Search className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">
                    {selectedProtocol && selectedProtocol.services.length > 0
                      ? 'Tüm hizmetler eklendi veya aramanızla eşleşen bulunamadı.'
                      : 'Aramanızla eşleşen hizmet bulunamadı.'}
                  </p>
                </div>
              ) : (
                filteredAddServiceList.map((item) => {
                  const isCatalog = 'vatRate' in item
                  return (
                    <button
                      key={isCatalog ? `s-${(item as ServiceCatalogItem).id}` : `p-${(item as ServicePackage).id}`}
                      onClick={() => onQuickAddService(item)}
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
                          {isCatalog ? (item as ServiceCatalogItem).group : 'Paket'}
                          {!isCatalog && (
                            <span className="px-1 py-0 rounded bg-amber-100 text-amber-600 text-[9px] font-bold">
                              {(item as ServicePackage).services.length} test
                            </span>
                          )}
                        </p>
                      </div>
                      {/* Sağ — fiyat + ekle ikonu */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-slate-500">{renderPriceDisplay(item)}</span>
                        <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                          <Plus className="w-3 h-3 text-blue-600 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </button>
                  )
                })
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
                {selectedProtocol?.services.length ?? 0} hizmet
              </span>
            </div>

            {/* Hizmet listesi */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
              {(selectedProtocol?.services ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Plus className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">Henüz hizmet eklenmemiş.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Soldan hizmet seçerek ekleyin.</p>
                </div>
              ) : (
                (selectedProtocol?.services ?? []).map((service: ProtocolService) => (
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
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="relative">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">₺</span>
                        <input
                          type="number"
                          value={service.price}
                          onChange={(e) => {
                            if (selectedProtocol) {
                              onUpdateServicePrice(selectedProtocol.id, service.id, Number(e.target.value) || 0, service.vatRate)
                            }
                          }}
                          step="0.01"
                          min="0"
                          className="w-16 pl-4 pr-1 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 text-right"
                          title="Fiyat (KDV hariç)"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 w-14 text-right">
                        ₺{Number((service.price * (1 + service.vatRate / 100)).toFixed(2)).toFixed(2)}
                      </span>
                    </div>
                    {/* Sil */}
                    <button
                      onClick={() => {
                        if (selectedProtocol) {
                          onRemoveService(selectedProtocol.id, service.id, service.name)
                        }
                      }}
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
                    Hizmet: <span className="font-bold text-slate-700">{selectedProtocol?.services.length ?? 0}</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    KDV Hariç: <span className="font-bold text-slate-700">
                      ₺{((selectedProtocol?.services ?? []).reduce((sum, s) => sum + s.price, 0)).toFixed(2)}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">Toplam:</span>
                  <span className="text-sm font-bold text-emerald-600">
                    ₺{protocolTotalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
