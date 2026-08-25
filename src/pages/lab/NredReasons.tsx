import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  Eye,
  FileSearch,
  Filter,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { Modal } from '@/shared/components/ui/Modal'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Pagination } from '@/shared/components/ui/Pagination'
import { usePatients } from '@/state/PatientsContext'
import { useProtocols } from '@/state/ProtocolsContext'
import type { ProtocolService } from '@/shared/types'
import { formatDateLocal } from '@/shared/lib/date'

interface RejectionRow {
  id: string
  service: ProtocolService
  protocolId: number
  protocolNo: string
  patientName: string
  patientTc: string
  company: string
  examType: string
}

function formatDateTime(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatDateInput(date: Date) {
  return formatDateLocal(date)
}

export function NredReasons() {
  const navigate = useNavigate()
  const { protocols } = useProtocols()
  const { patients } = usePatients()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tümü')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return formatDateInput(date)
  })
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()))
  const [page, setPage] = useState(1)
  const [selectedRow, setSelectedRow] = useState<RejectionRow | null>(null)
  const pageSize = 10

  const rows = useMemo<RejectionRow[]>(() => {
    const patientMap = new Map(patients.map((patient) => [patient.id, patient]))
    return protocols.flatMap((protocol) => {
      const patient = patientMap.get(protocol.patientId)
      return protocol.services
        .filter((service) => service.rejectionReason)
        .map((service) => ({
          id: `${protocol.id}-${service.id}`,
          service,
          protocolId: protocol.id,
          protocolNo: protocol.protocolNo,
          patientName: patient?.name ?? 'Bilinmeyen hasta',
          patientTc: patient?.tc ?? '—',
          company: protocol.company,
          examType: protocol.examType,
        }))
    }).sort((a, b) => new Date(b.service.rejectedAt ?? '').getTime() - new Date(a.service.rejectedAt ?? '').getTime())
  }, [patients, protocols])

  const filteredRows = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`).getTime()
    const end = new Date(`${endDate}T23:59:59`).getTime()
    const query = search.trim().toLocaleLowerCase('tr-TR')
    return rows.filter((row) => {
      const rejectedAt = new Date(row.service.rejectedAt ?? '').getTime()
      if (!Number.isNaN(rejectedAt) && (rejectedAt < start || rejectedAt > end)) return false
      if (statusFilter !== 'Tümü' && row.service.status !== statusFilter) return false
      if (query && ![row.patientName, row.patientTc, row.protocolNo, row.company, row.examType, row.service.name, row.service.rejectionReason ?? '', row.service.rejectedBy ?? ''].some((value) => value.toLocaleLowerCase('tr-TR').includes(query))) return false
      return true
    })
  }, [rows, search, statusFilter, startDate, endDate])

  const stats = useMemo(() => ({
    total: filteredRows.length,
    waiting: filteredRows.filter((row) => row.service.status === 'Numune Red').length,
    resolved: filteredRows.filter((row) => row.service.status !== 'Numune Red').length,
    doctors: new Set(filteredRows.map((row) => row.service.rejectedBy).filter(Boolean)).size,
  }), [filteredRows])

  const totalPages = Math.ceil(filteredRows.length / pageSize)
  const safePage = Math.min(page, Math.max(1, totalPages))
  const pagedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)
  const hasFilters = search || statusFilter !== 'Tümü'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('Tümü')
    setPage(1)
  }

  return (
    <div className="viewport-page">
      <PageHeader
        title="N.Red Nedenleri"
        subtitle="Doktorlar tarafından reddedilen numuneleri ve red açıklamalarını ayrıntılı olarak takip edin."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={AlertTriangle} label="Toplam Red" value={stats.total} color="text-red-600" bg="bg-red-50" />
        <StatCard icon={ClipboardList} label="Bekleyen İşlem" value={stats.waiting} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={FileSearch} label="İşleme Alınan" value={stats.resolved} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={UserRound} label="Doktor" value={stats.doctors} color="text-blue-600" bg="bg-blue-50" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3"><Filter className="w-4 h-4 text-slate-400" /><h2 className="text-sm font-semibold text-slate-800">Red Kayıtlarını Filtrele</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-4 relative"><label className="block text-[11px] font-medium text-slate-500 mb-1.5">Ara</label><Search className="absolute left-2.5 top-8 w-3.5 h-3.5 text-slate-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Hasta, TC, protokol, test veya neden..." className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500" /></div>
          <div className="lg:col-span-2"><DateInput label="Başlangıç" value={startDate} onChange={(value) => { setStartDate(value); setPage(1) }} /></div>
          <div className="lg:col-span-2"><DateInput label="Bitiş" value={endDate} onChange={(value) => { setEndDate(value); setPage(1) }} /></div>
          <div className="lg:col-span-2"><FilterSelect label="Durum" value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1) }} options={['Tümü', 'Numune Red', 'İşleme Alındı', 'Kapandı']} /></div>
          <div className="lg:col-span-2 text-right"><span className="text-xs text-slate-500"><strong className="text-slate-800">{filteredRows.length}</strong> kayıt bulundu</span></div>
        </div>
        {(hasFilters || startDate || endDate) && <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end"><button onClick={() => { clearFilters(); const date = new Date(); date.setDate(date.getDate() - 30); setStartDate(formatDateInput(date)); setEndDate(formatDateInput(new Date())) }} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"><X className="w-3.5 h-3.5" />Filtreleri Temizle</button></div>}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /><h2 className="text-sm font-semibold text-slate-800">Numune Red Kayıtları</h2></div><span className="text-[10px] text-slate-400">Detay için satıra tıklayın</span></div>
        <div className="overflow-auto flex-1">
          {pagedRows.length === 0 ? <EmptyState icon={AlertTriangle} title="N.Red kaydı bulunamadı" description={hasFilters ? 'Filtreleri temizleyip tekrar deneyin.' : 'Henüz doktor tarafından reddedilmiş numune bulunmuyor.'} /> : (
            <table className="w-full text-left text-xs min-w-[1050px]"><thead className="bg-slate-50 text-slate-500 sticky top-0 z-10"><tr>
              <th className="px-3 py-3 font-medium">Durum</th><th className="px-3 py-3 font-medium">Red Tarihi</th><th className="px-3 py-3 font-medium">Hasta / TC</th><th className="px-3 py-3 font-medium">Firma</th><th className="px-3 py-3 font-medium">Muayene Türü</th><th className="px-3 py-3 font-medium">Test</th><th className="px-3 py-3 font-medium">Red Nedeni</th><th className="px-3 py-3 font-medium">Doktor</th><th className="px-3 py-3 font-medium">Protokol</th><th className="px-3 py-3 font-medium text-right">Detay</th>
            </tr></thead><tbody className="divide-y divide-slate-100">{pagedRows.map((row) => <tr key={row.id} onClick={() => setSelectedRow(row)} className="hover:bg-red-50/40 cursor-pointer transition-colors">
              <td className="px-3 py-3"><span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-medium">Numune Red</span></td>
              <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{formatDateTime(row.service.rejectedAt)}</td>
              <td className="px-3 py-3"><div className="font-medium text-slate-700">{row.patientName}</div><div className="text-[10px] text-slate-400">{row.patientTc}</div></td>
              <td className="px-3 py-3 text-slate-600 max-w-[130px] truncate" title={row.company}>{row.company}</td><td className="px-3 py-3 text-slate-600">{row.examType}</td>
              <td className="px-3 py-3"><div className="font-medium text-slate-700 max-w-[180px] truncate" title={row.service.name}>{row.service.name}</div><div className="text-[10px] text-slate-400">{row.service.barcode}</div></td>
              <td className="px-3 py-3 text-red-700 max-w-[240px] truncate" title={row.service.rejectionReason}>{row.service.rejectionReason}</td><td className="px-3 py-3 text-slate-600">{row.service.rejectedBy || '—'}</td><td className="px-3 py-3 text-slate-700 font-medium">{row.protocolNo}</td><td className="px-3 py-3 text-right"><Eye className="w-4 h-4 text-slate-400 inline" /></td>
            </tr>)}</tbody></table>
          )}
        </div>
        {totalPages > 1 && <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />}
      </div>

      <Modal isOpen={!!selectedRow} onClose={() => setSelectedRow(null)} title="Numune Red Detayı" subtitle={selectedRow?.service.name} size="lg">
        {selectedRow && <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between"><div><h3 className="text-base font-bold text-slate-800">{selectedRow.patientName}</h3><p className="text-xs text-slate-600 mt-1">{selectedRow.company} · {selectedRow.examType} · {selectedRow.protocolNo}</p></div><span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-xs font-semibold">Numune Red</span></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3"><Detail label="Test" value={selectedRow.service.name} /><Detail label="Barkod" value={selectedRow.service.barcode} /><Detail label="TC Kimlik No" value={selectedRow.patientTc} /><Detail label="Red Tarihi" value={formatDateTime(selectedRow.service.rejectedAt)} /><Detail label="Reddeden Doktor" value={selectedRow.service.rejectedBy || '—'} /><Detail label="Hizmet Grubu" value={selectedRow.service.group} /></div>
          <div className="p-4 bg-white rounded-2xl border border-red-200"><h4 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Doktorun Red Açıklaması</h4><p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedRow.service.rejectionReason}</p></div>
          <div className="flex justify-end pt-2 border-t border-slate-100"><button onClick={() => { setSelectedRow(null); navigate(`/hasta-kayit/protokol/${selectedRow.protocolId}`) }} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"><ClipboardList className="w-4 h-4" />Protokole Git</button></div>
        </div>}
      </Modal>
    </div>
  )
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><label className="block text-[11px] font-medium text-slate-500 mb-1.5">{label}</label><div className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg"><Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" /><input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 bg-transparent text-xs text-slate-700 focus:outline-none" /></div></div>
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <div><label className="block text-[11px] font-medium text-slate-500 mb-1.5">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: typeof AlertTriangle; label: string; value: number; color: string; bg: string }) {
  return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-3"><div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${color}`} /></div><div><div className="text-[10px] text-slate-400">{label}</div><div className="text-lg font-bold text-slate-800">{value}</div></div></div>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="p-3 bg-slate-50 rounded-xl border border-slate-100"><div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div><div className="text-xs font-medium text-slate-700 mt-1 break-words">{value}</div></div>
}
