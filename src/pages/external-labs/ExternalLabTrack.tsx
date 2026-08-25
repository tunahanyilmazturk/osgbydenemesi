import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileCheck2,
  FileSearch,
  Filter,
  FlaskConical,
  History,
  RefreshCw,
  Search,
  Send,
  UserRound,
  X,
} from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { Modal } from '@/shared/components/ui/Modal'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Pagination } from '@/shared/components/ui/Pagination'
import { usePatients } from '@/state/PatientsContext'
import { useProtocols } from '@/state/ProtocolsContext'
import type { ExternalLabSendRecord, ProtocolService } from '@/shared/types'
import { formatDateLocal, nowLocalDate } from '@/shared/lib/date'

const SENDS_KEY = 'cetka-external-lab-sends'
const PAGE_SIZE = 12

type TrackingStatus = 'Sonuç Bekleniyor' | 'Sonuç Girildi' | 'Onaylandı' | 'İptal'

interface TrackingRow {
  id: string
  sendId: number
  sendDate: string
  status: TrackingStatus
  labName: string
  patientName: string
  patientTc: string
  company: string
  examType: string
  protocolNo: string
  protocolId: number
  serviceName: string
  serviceGroup: string
  barcode: string
  service: ProtocolService
}

function loadSends(_refreshKey?: number): ExternalLabSendRecord[] {
  try {
    const raw = localStorage.getItem(SENDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ExternalLabSendRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatDateTime(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusFromService(service?: ProtocolService): TrackingStatus {
  if (!service) return 'Sonuç Bekleniyor'
  if (service.status === 'İptal') return 'İptal'
  if (service.status === 'Onaylandı') return 'Onaylandı'
  if (service.status === 'Sonuç Girildi') return 'Sonuç Girildi'
  return 'Sonuç Bekleniyor'
}

const statusStyles: Record<TrackingStatus, string> = {
  'Sonuç Bekleniyor': 'bg-amber-50 text-amber-700 border-amber-200',
  'Sonuç Girildi': 'bg-blue-50 text-blue-700 border-blue-200',
  Onaylandı: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  İptal: 'bg-red-50 text-red-700 border-red-200',
}

function StatusBadge({ status }: { status: TrackingStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border whitespace-nowrap ${statusStyles[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

export function ExternalLabTrack() {
  const navigate = useNavigate()
  const { patients } = usePatients()
  const { protocols } = useProtocols()
  const [refreshKey, setRefreshKey] = useState(0)
  const sends = useMemo(() => loadSends(refreshKey), [refreshKey])

  const today = new Date()
  const [startDate, setStartDate] = useState(() => {
    const date = new Date(today)
    date.setDate(date.getDate() - 30)
    return formatDateLocal(date)
  })
  const [endDate, setEndDate] = useState(nowLocalDate)
  const [statusFilter, setStatusFilter] = useState('Tümü')
  const [labFilter, setLabFilter] = useState('Tümü')
  const [companyFilter, setCompanyFilter] = useState('Tümü')
  const [examTypeFilter, setExamTypeFilter] = useState('Tümü')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedRow, setSelectedRow] = useState<TrackingRow | null>(null)

  const rows = useMemo<TrackingRow[]>(() => {
    const protocolMap = new Map(protocols.map((protocol) => [protocol.id, protocol]))
    const patientMap = new Map(patients.map((patient) => [patient.id, patient]))
    const result: TrackingRow[] = []

    sends.forEach((send) => {
      send.services.forEach((sentService) => {
        const protocol = protocolMap.get(sentService.protocolId)
        const service = protocol?.services.find((item) => item.id === sentService.serviceId)
        const patient = protocol ? patientMap.get(protocol.patientId) : undefined
        result.push({
          id: `${send.id}-${sentService.serviceId}`,
          sendId: send.id,
          sendDate: send.sendDate,
          status: statusFromService(service),
          labName: send.externalLabName,
          patientName: patient?.name ?? sentService.patientName,
          patientTc: patient?.tc ?? '—',
          company: protocol?.company ?? '—',
          examType: protocol?.examType ?? '—',
          protocolNo: protocol?.protocolNo ?? sentService.protocolNo,
          protocolId: sentService.protocolId,
          serviceName: service?.name ?? sentService.serviceName,
          serviceGroup: service?.group ?? '—',
          barcode: service?.barcode ?? sentService.barcode,
          service: service ?? {
            id: sentService.serviceId,
            protocolId: sentService.protocolId,
            code: 0,
            status: 'Sonuç Bekleniyor',
            barcode: sentService.barcode,
            processDate: send.sendDate,
            group: '—',
            name: sentService.serviceName,
            price: 0,
            vatRate: 0,
            totalPrice: 0,
            recordedBy: send.sentBy,
          },
        })
      })
    })
    return result.sort((a, b) => new Date(b.sendDate).getTime() - new Date(a.sendDate).getTime())
  }, [patients, protocols, sends])

  const options = useMemo(() => ({
    labs: ['Tümü', ...Array.from(new Set(rows.map((row) => row.labName))).sort((a, b) => a.localeCompare(b, 'tr'))],
    companies: ['Tümü', ...Array.from(new Set(rows.map((row) => row.company).filter((value) => value !== '—'))).sort((a, b) => a.localeCompare(b, 'tr'))],
    examTypes: ['Tümü', ...Array.from(new Set(rows.map((row) => row.examType).filter((value) => value !== '—'))).sort((a, b) => a.localeCompare(b, 'tr'))],
  }), [rows])

  const filteredRows = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`).getTime()
    const end = new Date(`${endDate}T23:59:59`).getTime()
    const query = search.trim().toLocaleLowerCase('tr-TR')

    return rows.filter((row) => {
      const sentAt = new Date(row.sendDate).getTime()
      if (sentAt < start || sentAt > end) return false
      if (statusFilter !== 'Tümü' && row.status !== statusFilter) return false
      if (labFilter !== 'Tümü' && row.labName !== labFilter) return false
      if (companyFilter !== 'Tümü' && row.company !== companyFilter) return false
      if (examTypeFilter !== 'Tümü' && row.examType !== examTypeFilter) return false
      if (query && ![
        row.patientName,
        row.patientTc,
        row.protocolNo,
        row.serviceName,
        row.barcode,
        row.company,
      ].some((value) => value.toLocaleLowerCase('tr-TR').includes(query))) return false
      return true
    })
  }, [rows, startDate, endDate, statusFilter, labFilter, companyFilter, examTypeFilter, search])

  const stats = useMemo(() => ({
    total: filteredRows.length,
    waiting: filteredRows.filter((row) => row.status === 'Sonuç Bekleniyor').length,
    entered: filteredRows.filter((row) => row.status === 'Sonuç Girildi').length,
    approved: filteredRows.filter((row) => row.status === 'Onaylandı').length,
    patients: new Set(filteredRows.map((row) => row.patientName)).size,
  }), [filteredRows])

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(1, totalPages))
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const hasFilters = search || statusFilter !== 'Tümü' || labFilter !== 'Tümü' || companyFilter !== 'Tümü' || examTypeFilter !== 'Tümü'

  const shiftDay = (days: number) => {
    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)
    start.setDate(start.getDate() + days)
    end.setDate(end.getDate() + days)
    setStartDate(formatDateLocal(start))
    setEndDate(formatDateLocal(end))
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('Tümü')
    setLabFilter('Tümü')
    setCompanyFilter('Tümü')
    setExamTypeFilter('Tümü')
    setPage(1)
  }

  const exportCsv = () => {
    const header = ['Durum', 'Laboratuvar', 'Gönderim Tarihi', 'TC Kimlik No', 'Hasta', 'Firma', 'Muayene Türü', 'Hizmet', 'Grup', 'Barkod', 'Protokol No']
    const body = filteredRows.map((row) => [
      row.status,
      row.labName,
      formatDateTime(row.sendDate),
      row.patientTc,
      row.patientName,
      row.company,
      row.examType,
      row.serviceName,
      row.serviceGroup,
      row.barcode,
      row.protocolNo,
    ])
    const csv = [header, ...body].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dis-lab-izlem-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="viewport-page">
      <PageHeader
        title="Dış Lab İzlem"
        subtitle="Dış laboratuvarlara gönderilen hizmetlerin durumunu ve sonuç sürecini takip edin."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefreshKey((value) => value + 1)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
              title="Kayıtları yenile"
            >
              <RefreshCw className="w-4 h-4" />
              Yenile
            </button>
            <button
              onClick={() => navigate('/laboratuvar/dis-lab-gonderim/yeni')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Yeni Gönderim
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={ClipboardList} label="Toplam Hizmet" value={stats.total} color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={History} label="Sonuç Bekleyen" value={stats.waiting} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={FileCheck2} label="Sonuç Girilen" value={stats.entered} color="text-violet-600" bg="bg-violet-50" />
        <StatCard icon={FlaskConical} label="Onaylanan" value={stats.approved} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={UserRound} label="Hasta" value={stats.patients} color="text-slate-600" bg="bg-slate-100" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">İzlem Filtreleri</h2>
          <span className="text-[10px] text-slate-400">Filtreler anlık uygulanır</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Gönderim Tarihi</label>
            <div className="flex items-center gap-1.5">
              <button onClick={() => shiftDay(-1)} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 shrink-0" title="Önceki gün">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg min-w-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} className="w-full min-w-0 bg-transparent text-xs text-slate-700 focus:outline-none" />
              </div>
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg min-w-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} className="w-full min-w-0 bg-transparent text-xs text-slate-700 focus:outline-none" />
              </div>
              <button onClick={() => shiftDay(1)} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 shrink-0" title="Sonraki gün">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="lg:col-span-2"><FilterSelect label="Durum" value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1) }} options={['Tümü', 'Sonuç Bekleniyor', 'Sonuç Girildi', 'Onaylandı', 'İptal']} /></div>
          <div className="lg:col-span-2"><FilterSelect label="Laboratuvar" value={labFilter} onChange={(value) => { setLabFilter(value); setPage(1) }} options={options.labs} /></div>
          <div className="lg:col-span-2"><FilterSelect label="Firma" value={companyFilter} onChange={(value) => { setCompanyFilter(value); setPage(1) }} options={options.companies} /></div>
          <div className="lg:col-span-2"><FilterSelect label="Muayene Türü" value={examTypeFilter} onChange={(value) => { setExamTypeFilter(value); setPage(1) }} options={options.examTypes} /></div>
          <div className="lg:col-span-1 relative">
            <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Ara</label>
            <Search className="absolute left-2.5 top-8 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Ara..." className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500"><strong className="text-slate-800">{filteredRows.length}</strong> hizmet bulundu</span>
          <div className="flex items-center gap-3">
            {hasFilters && <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"><X className="w-3.5 h-3.5" />Filtreleri Temizle</button>}
            <button onClick={exportCsv} disabled={filteredRows.length === 0} className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 disabled:text-slate-300"><Download className="w-3.5 h-3.5" />CSV Dışa Aktar</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2"><FileSearch className="w-4 h-4 text-slate-400" /><h2 className="text-sm font-semibold text-slate-800">Gönderilen Hizmetler</h2></div>
          <span className="text-[10px] text-slate-400">Detay için satıra tıklayın</span>
        </div>
        <div className="overflow-auto flex-1">
          {pagedRows.length === 0 ? (
            <EmptyState icon={FlaskConical} title="İzlem kaydı bulunamadı" description={hasFilters ? 'Filtreleri temizleyip tekrar deneyin.' : 'Henüz dış laboratuvara gönderilmiş hizmet bulunmuyor.'} actionLabel={hasFilters ? undefined : 'Yeni Gönderim'} onAction={hasFilters ? undefined : () => navigate('/laboratuvar/dis-lab-gonderim/yeni')} />
          ) : (
            <table className="w-full text-left text-xs min-w-[1100px]">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 font-medium">Durum</th>
                  <th className="px-3 py-3 font-medium">Laboratuvar</th>
                  <th className="px-3 py-3 font-medium">Gönderim Tarihi</th>
                  <th className="px-3 py-3 font-medium">Hasta / TC</th>
                  <th className="px-3 py-3 font-medium">Firma</th>
                  <th className="px-3 py-3 font-medium">Muayene Türü</th>
                  <th className="px-3 py-3 font-medium">Hizmet</th>
                  <th className="px-3 py-3 font-medium">Barkod</th>
                  <th className="px-3 py-3 font-medium">Protokol</th>
                  <th className="px-3 py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRows.map((row) => (
                  <tr key={row.id} onClick={() => setSelectedRow(row)} className="hover:bg-blue-50/40 cursor-pointer transition-colors">
                    <td className="px-3 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-3 py-3 font-medium text-slate-700 max-w-[130px] truncate" title={row.labName}>{row.labName}</td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{formatDateTime(row.sendDate)}</td>
                    <td className="px-3 py-3"><div className="font-medium text-slate-700">{row.patientName}</div><div className="text-[10px] text-slate-400">{row.patientTc}</div></td>
                    <td className="px-3 py-3 text-slate-600 max-w-[130px] truncate" title={row.company}>{row.company}</td>
                    <td className="px-3 py-3 text-slate-600 max-w-[120px] truncate" title={row.examType}>{row.examType}</td>
                    <td className="px-3 py-3"><div className="font-medium text-slate-700 max-w-[190px] truncate" title={row.serviceName}>{row.serviceName}</div><div className="text-[10px] text-slate-400">{row.serviceGroup}</div></td>
                    <td className="px-3 py-3 text-slate-600 font-medium">{row.barcode}</td>
                    <td className="px-3 py-3 text-slate-700 font-medium">{row.protocolNo}</td>
                    <td className="px-3 py-3 text-right"><button onClick={(e) => { e.stopPropagation(); setSelectedRow(row) }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Detay"><Eye className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />}
      </div>

      <Modal isOpen={!!selectedRow} onClose={() => setSelectedRow(null)} title="Dış Lab Hizmet Detayı" subtitle={selectedRow?.serviceName} size="lg">
        {selectedRow && <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"><div><p className="text-base font-semibold text-slate-800">{selectedRow.patientName}</p><p className="text-xs text-slate-500">{selectedRow.company} · {selectedRow.examType}</p></div><StatusBadge status={selectedRow.status} /></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Detail label="Laboratuvar" value={selectedRow.labName} />
            <Detail label="Gönderim Tarihi" value={formatDateTime(selectedRow.sendDate)} />
            <Detail label="Protokol No" value={selectedRow.protocolNo} />
            <Detail label="TC Kimlik No" value={selectedRow.patientTc} />
            <Detail label="Barkod" value={selectedRow.barcode} />
            <Detail label="Hizmet Grubu" value={selectedRow.serviceGroup} />
          </div>
          <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-4"><h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Sonuç Bilgisi</h4><div className="grid grid-cols-2 gap-3"><Detail label="Sonuç" value={selectedRow.service.result || 'Henüz sonuç girilmedi'} /><Detail label="Sonuç Metni" value={selectedRow.service.resultText || '—'} /><Detail label="Kabul Tarihi" value={formatDateTime(selectedRow.service.acceptDate)} /><Detail label="Onay Tarihi" value={formatDateTime(selectedRow.service.approvedAt)} /></div></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100"><button onClick={() => navigate(`/hasta-kayit/protokol/${selectedRow.service.protocolId}/${selectedRow.protocolId}`)} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"><ClipboardList className="w-4 h-4" />Protokole Git</button><button onClick={() => { setSelectedRow(null); navigate('/laboratuvar') }} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"><FileSearch className="w-4 h-4" />Sonuç İşlemlerine Git</button></div>
        </div>}
      </Modal>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <><label className="sr-only">{label}</label><div><span className="block text-[11px] font-medium text-slate-500 mb-1.5">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div></>
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: typeof ClipboardList; label: string; value: number; color: string; bg: string }) {
  return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-3"><div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}><Icon className={`w-4 h-4 ${color}`} /></div><div><div className="text-[10px] text-slate-400">{label}</div><div className="text-lg font-bold text-slate-800">{value}</div></div></div>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="p-3 bg-white rounded-xl border border-slate-100"><div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div><div className="text-xs font-medium text-slate-700 mt-1 break-words">{value}</div></div>
}
