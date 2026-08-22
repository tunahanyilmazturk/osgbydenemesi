import { FileText, History } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Pagination } from '../../../components/ui/Pagination'

interface MovementRow {
  id: number
  date: string
  kasa: string
  operation: string
  paymentType: string
  amount: number
  balance: number
  recordedBy: string
  description: string
  patientName: string
  protocolNo: string
}

const paymentTypeBadges: Record<string, string> = {
  Nakit: 'bg-emerald-100 text-emerald-700',
  'Eft/Havale': 'bg-violet-100 text-violet-700',
  Kart: 'bg-blue-100 text-blue-700',
  'Kuruma Fatura': 'bg-indigo-100 text-indigo-700',
  İndirim: 'bg-amber-100 text-amber-700',
}

interface CashMovementsTableProps {
  movements: MovementRow[]
  totalItems: number
  page: number
  totalPages: number
  pageSize: number
  pageSizeOptions: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function CashMovementsTable({
  movements,
  totalItems,
  page,
  totalPages,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: CashMovementsTableProps) {
  if (movements.length === 0) {
    return (
      <div className="flex-1">
        <EmptyState
          title="Kayıt bulunamadı"
          description="Seçilen tarih aralığına veya filtre kritere ait kasa hareketi yok."
        />
      </div>
    )
  }

  return (
    <>
      <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-500" />
          Kasa Hareketleri
        </h3>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Kasa</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">İşlem</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Ödeme Tipi</th>
              <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Tutar</th>
              <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Hareket Sonrası Bakiye</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">İşlem Yapan</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">İşlem Tarihi</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Hasta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2 text-slate-800 font-medium whitespace-nowrap">{m.kasa}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    {m.operation.startsWith('Transfer (Giriş)') ? (
                      <FileText className="w-3 h-3 text-emerald-500" />
                    ) : m.operation.startsWith('Transfer (Çıkış)') ? (
                      <FileText className="w-3 h-3 text-red-500" />
                    ) : (
                      <FileText className="w-3 h-3 text-blue-500" />
                    )}
                    {m.operation}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${paymentTypeBadges[m.paymentType] ?? 'bg-slate-100 text-slate-700'}`}>
                    {m.paymentType}
                  </span>
                </td>
                <td className={`px-3 py-2 text-right font-bold font-mono whitespace-nowrap ${m.amount >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                  {m.amount >= 0 ? '+' : ''}₺{m.amount.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right font-bold text-emerald-600 font-mono whitespace-nowrap">₺{m.balance.toFixed(2)}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{m.recordedBy}</td>
                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{new Date(m.date).toLocaleString('tr-TR')}</td>
                <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{m.patientName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>Sayfada</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
            >
              {pageSizeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <span className="text-xs text-slate-400">{totalItems} kayıt</span>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </>
  )
}
