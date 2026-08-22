import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Pagination } from '../../../components/ui/Pagination'

const paymentTypeBadges: Record<string, string> = {
  Nakit: 'bg-emerald-100 text-emerald-700',
  'Eft/Havale': 'bg-violet-100 text-violet-700',
  Kart: 'bg-blue-100 text-blue-700',
  'Kuruma Fatura': 'bg-indigo-100 text-indigo-700',
  İndirim: 'bg-amber-100 text-amber-700',
}

interface AccountingRow {
  paymentId: number
  protocolId: number
  protocolNo: string
  protocolDate: string
  paymentDate: string
  paymentType: string
  amount: number
  description: string
  recordedBy: string
  patientId: number
  patientName: string
  tc: string
  phone: string
  email: string
  company: string
  examType: string
  status: string
  kasa: string
}

interface AccountingTableProps {
  rows: AccountingRow[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export function AccountingTable({ rows, page, totalPages, onPageChange, totalItems }: AccountingTableProps) {
  const navigate = useNavigate()

  if (rows.length === 0) {
    return (
      <div className="flex-1">
        <EmptyState
          title="Kayıt bulunamadı"
          description="Seçilen tarih aralığına veya filtre kritere ait tahsilat kaydı yok."
        />
      </div>
    )
  }

  return (
    <>
      <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-bold text-slate-800">Tahsilat Kayıtları</h3>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{totalItems} kayıt</span>
          <span>•</span>
          <span>Sayfa {page} / {totalPages}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Protokol Tarihi</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Tahsilat Tarihi</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Makbuz No / Kasa</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Ödeme Tipi</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Açıklama</th>
              <th className="px-2 py-2 font-medium text-right whitespace-nowrap">Tutar</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">TC No</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Hasta</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Telefon</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Mail</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Firma</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Müşteri Türü</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Durum</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">İşlem Yapan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={`${row.protocolId}-${row.paymentId}`}
                onClick={() => navigate(`/hasta-kayit/protokol/${row.patientId}/${row.protocolId}`)}
                className="hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{formatDate(row.protocolDate)}</td>
                <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{formatDate(row.paymentDate)}</td>
                <td className="px-2 py-2 text-slate-700 font-medium whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{row.protocolNo}</span>
                    <span className="text-[10px] text-slate-400">{row.kasa}</span>
                  </div>
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${paymentTypeBadges[row.paymentType] ?? 'bg-slate-100 text-slate-700'}`}>
                    {row.paymentType}
                  </span>
                </td>
                <td className="px-2 py-2 text-slate-500 max-w-[120px] truncate" title={row.description}>
                  {row.description || '—'}
                </td>
                <td className="px-2 py-2 text-right font-bold text-slate-800 font-mono whitespace-nowrap">₺{row.amount.toFixed(2)}</td>
                <td className="px-2 py-2 text-slate-600 whitespace-nowrap font-mono text-[10px]">{row.tc}</td>
                <td className="px-2 py-2 text-slate-800 font-medium whitespace-nowrap">{row.patientName}</td>
                <td className="px-2 py-2 text-slate-600 whitespace-nowrap text-[10px]">{row.phone}</td>
                <td className="px-2 py-2 text-slate-600 whitespace-nowrap text-[10px] max-w-[100px] truncate" title={row.email}>{row.email}</td>
                <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{row.company}</td>
                <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{row.examType || '—'}</td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    row.status === 'Tamamlandı' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-2 py-2 text-slate-600 whitespace-nowrap text-[10px]">{row.recordedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
        <span className="text-xs text-slate-400">{totalItems} kayıt</span>
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </>
  )
}
