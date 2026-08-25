import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock3, FlaskConical, Send, TestTube2 } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { useProtocols } from '@/state/ProtocolsContext'

const statuses = [
  { key: 'waiting', label: 'İşlem bekleyen', icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-50', matches: (status: string) => !['Onaylandı', 'Sonuç Girildi', 'Numune Red'].includes(status) },
  { key: 'resulted', label: 'Onay bekleyen', icon: TestTube2, color: 'text-blue-600', bg: 'bg-blue-50', matches: (status: string) => status === 'Sonuç Girildi' },
  { key: 'approved', label: 'Onaylanan', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', matches: (status: string) => status === 'Onaylandı' },
] as const

export function Laboratory() {
  const { protocols } = useProtocols()
  const services = protocols.flatMap((protocol) => protocol.services)
  const counts = statuses.map((item) => ({ ...item, count: services.filter((service) => item.matches(service.status)).length }))
  const groupRows = (() => {
    const groups = new Map<string, { total: number; approved: number; pending: number }>()
    services.forEach((service) => {
      const current = groups.get(service.group) ?? { total: 0, approved: 0, pending: 0 }
      current.total += 1
      current.approved += service.status === 'Onaylandı' ? 1 : 0
      current.pending += service.status === 'Sonuç Girildi' ? 1 : 0
      groups.set(service.group, current)
    })
    return [...groups.entries()].map(([group, values]) => ({ group, ...values })).sort((a, b) => b.total - a.total)
  })()

  return (
    <div className="viewport-page">
      <PageHeader title="Laboratuvar" subtitle="Laboratuvar iş yükünü izleyin ve ilgili işlem ekranlarına geçin." />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm"><FlaskConical className="w-6 h-6 text-blue-300 mb-4" /><p className="text-3xl font-bold">{services.length}</p><p className="text-xs text-slate-300 mt-1">Toplam laboratuvar hizmeti</p></div>
        {counts.map(({ key, label, icon: Icon, color, bg, count }) => <div key={key} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"><div className={`w-9 h-9 rounded-xl ${bg} ${color} flex items-center justify-center mb-3`}><Icon className="w-5 h-5" /></div><p className="text-2xl font-bold text-slate-800">{count}</p><p className="text-xs text-slate-500 mt-1">{label}</p></div>)}
      </div>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-3 flex-1 min-h-0">
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-0 flex flex-col" aria-labelledby="group-summary-title">
          <div className="px-5 py-4 border-b border-slate-100"><h2 id="group-summary-title" className="font-bold text-slate-800">Birim bazlı durum</h2><p className="text-xs text-slate-500 mt-0.5">Hizmet gruplarının güncel dağılımı</p></div>
          {groupRows.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Henüz laboratuvar hizmeti bulunmuyor.</p> : <div className="divide-y divide-slate-100 surface-scroll">{groupRows.map((row) => { const ratio = row.total ? Math.round((row.approved / row.total) * 100) : 0; return <div key={row.group} className="px-5 py-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-800">{row.group}</p><p className="text-xs text-slate-500 mt-0.5">{row.pending} onay bekliyor · {row.approved} onaylandı</p></div><span className="text-xs font-bold text-slate-600">{row.approved}/{row.total}</span></div><div className="h-1.5 rounded-full bg-slate-100 mt-3 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${ratio}%` }} /></div></div>})}</div>}
        </section>
        <aside className="space-y-3 overflow-y-auto pr-1" aria-label="Laboratuvar hızlı işlemleri">
          <Link to="/laboratuvar" className="group flex items-center justify-between gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all"><div><p className="text-sm font-bold text-slate-800">Sonuç İşlemleri</p><p className="text-xs text-slate-500 mt-1">Sonuç girme ve ayrıntılı inceleme</p></div><ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600" /></Link>
          <Link to="/laboratuvar/hizli-onay" className="group flex items-center justify-between gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all"><div><p className="text-sm font-bold text-slate-800">Hızlı Onay</p><p className="text-xs text-slate-500 mt-1">Hazır sonuçları toplu onaylayın</p></div><ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600" /></Link>
          <Link to="/laboratuvar/dis-lab-gonderim" className="group flex items-center justify-between gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all"><div className="flex gap-3"><Send className="w-5 h-5 text-violet-500 mt-0.5" /><div><p className="text-sm font-bold text-slate-800">Dış Laboratuvar</p><p className="text-xs text-slate-500 mt-1">Gönderim ve takip işlemleri</p></div></div><ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600" /></Link>
        </aside>
      </div>
    </div>
  )
}
