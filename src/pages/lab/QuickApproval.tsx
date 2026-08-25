import { useMemo, useState } from 'react'
import { CheckCheck, Search, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { useAuth } from '@/state/AuthContext'
import { usePatients } from '@/state/PatientsContext'
import { useProtocols } from '@/state/ProtocolsContext'
import { useToast } from '@/state/ToastContext'

export function QuickApproval() {
  const { protocols, updateServiceInProtocol } = useProtocols()
  const { patients } = usePatients()
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const rows = useMemo(() => protocols.flatMap((protocol) => { const patient = patients.find((item) => item.id === protocol.patientId); return protocol.services.filter((service) => service.status === 'Sonuç Girildi').map((service) => ({ protocol, service, patient })) }), [protocols, patients])
  const filteredRows = useMemo(() => { const term = query.trim().toLocaleLowerCase('tr-TR'); if (!term) return rows; return rows.filter(({ protocol, service, patient }) => [protocol.protocolNo, protocol.company, service.name, patient?.name ?? '', patient?.tc ?? ''].some((value) => value.toLocaleLowerCase('tr-TR').includes(term))) }, [rows, query])
  const rowKey = (protocolId: number, serviceId: number) => `${protocolId}:${serviceId}`
  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(({ protocol, service }) => selected.has(rowKey(protocol.id, service.id)))
  const toggleAll = () => setSelected((current) => { const next = new Set(current); filteredRows.forEach(({ protocol, service }) => { const key = rowKey(protocol.id, service.id); if (allVisibleSelected) next.delete(key); else next.add(key) }); return next })
  const approveSelected = () => {
    const now = new Date().toISOString(); let approved = 0
    rows.forEach(({ protocol, service }) => { if (!selected.has(rowKey(protocol.id, service.id))) return; updateServiceInProtocol(protocol.id, service.id, { status: 'Onaylandı', approvedAt: now, approvedBy: currentUser?.displayName ?? 'Kullanıcı' }); approved += 1 })
    setSelected(new Set()); showToast(approved ? 'success' : 'warning', approved ? `${approved} sonuç onaylandı` : 'Onaylanacak sonuç seçilmedi')
  }

  return (
    <div className="viewport-page">
      <PageHeader
        title="Hızlı Onay"
        subtitle="Sonucu girilmiş hizmetleri tek ekrandan kontrol edip onaylayın."
        action={
          <button type="button" onClick={approveSelected} disabled={selected.size === 0} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <CheckCheck className="w-4 h-4" /> Seçilenleri Onayla ({selected.size})
          </button>
        }
      />
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="p-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <label className="relative block w-full max-w-md">
            <span className="sr-only">Onaylanacak sonuçlarda ara</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hasta, protokol, firma veya hizmet ara..." className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          </label>
          <span className="ml-auto text-xs font-semibold text-slate-500 whitespace-nowrap">{filteredRows.length} kayıt</span>
        </div>
        {filteredRows.length === 0 ? (
          <div className="flex-1 min-h-0"><EmptyState icon={ShieldCheck} title={query ? 'Aramayla eşleşen kayıt yok' : 'Onay bekleyen sonuç yok'} description={query ? 'Arama ifadesini değiştirin.' : 'Sonucu girilen hizmetler burada otomatik görünür.'} /></div>
        ) : (
          <div className="surface-scroll">
            <table className="w-full text-sm sticky-table-header">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr><th className="px-4 py-3 w-10"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Görünen sonuçların tümünü seç" className="w-4 h-4 accent-blue-600" /></th><th className="px-3 py-3 text-left">Protokol / Hasta</th><th className="px-3 py-3 text-left">Firma</th><th className="px-3 py-3 text-left">Hizmet</th><th className="px-3 py-3 text-left">Sonuç</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map(({ protocol, service, patient }) => {
                  const key = rowKey(protocol.id, service.id)
                  return <tr key={key} className="hover:bg-slate-50"><td className="px-4 py-3"><input type="checkbox" checked={selected.has(key)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next })} aria-label={`${patient?.name ?? protocol.protocolNo} için ${service.name} sonucunu seç`} className="w-4 h-4 accent-blue-600" /></td><td className="px-3 py-3"><p className="font-semibold text-slate-800">{patient?.name ?? 'Hasta bulunamadı'}</p><p className="text-xs text-slate-500 mt-0.5">{protocol.protocolNo} · {patient?.tc ?? 'TC yok'}</p></td><td className="px-3 py-3 text-slate-600">{protocol.company}</td><td className="px-3 py-3"><p className="font-medium text-slate-700">{service.name}</p><p className="text-xs text-slate-400 mt-0.5">{service.group}</p></td><td className="px-3 py-3 text-slate-700 max-w-xs"><span className="line-clamp-2">{service.resultText || service.result || 'Sonuç kaydedildi'}</span></td></tr>
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
