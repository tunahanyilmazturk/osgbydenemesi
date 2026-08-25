import { useMemo, useState } from 'react'
import { Building2, FileSpreadsheet, ReceiptText, WalletCards } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { ExportButton } from '@/shared/components/ui/ExportButton'
import { downloadExcelReport } from '@/shared/lib/excel'
import { useProtocols } from '@/state/ProtocolsContext'
import { useToast } from '@/state/ToastContext'
import { nowLocalDate } from '@/shared/lib/date'

const currency = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })

export function InvoiceSummary() {
  const { protocols } = useProtocols()
  const { showToast } = useToast()
  const [month, setMonth] = useState(() => nowLocalDate().slice(0, 7))
  const [company, setCompany] = useState('Tümü')

  const companies = useMemo(() => ['Tümü', ...new Set(protocols.map((protocol) => protocol.company).filter(Boolean))], [protocols])
  const rows = useMemo(() => {
    const grouped = new Map<string, { company: string; protocolCount: number; serviceCount: number; gross: number; collected: number }>()
    protocols.filter((protocol) => protocol.protocolDate.slice(0, 7) === month && (company === 'Tümü' || protocol.company === company)).forEach((protocol) => {
      const current = grouped.get(protocol.company) ?? { company: protocol.company, protocolCount: 0, serviceCount: 0, gross: 0, collected: 0 }
      current.protocolCount += 1
      current.serviceCount += protocol.services.length
      current.gross += protocol.services.reduce((sum, service) => sum + service.totalPrice, 0)
      current.collected += protocol.payments.reduce((sum, payment) => sum + payment.amount, 0)
      grouped.set(protocol.company, current)
    })
    return [...grouped.values()].map((row) => ({ ...row, remaining: Math.max(0, row.gross - row.collected) })).sort((a, b) => b.gross - a.gross)
  }, [protocols, month, company])

  const totals = useMemo(() => rows.reduce((sum, row) => ({ protocolCount: sum.protocolCount + row.protocolCount, gross: sum.gross + row.gross, collected: sum.collected + row.collected, remaining: sum.remaining + row.remaining }), { protocolCount: 0, gross: 0, collected: 0, remaining: 0 }), [rows])

  const handleExport = () => {
    downloadExcelReport({
      fileName: `Fatura_Icmal_${month}.xls`, title: 'Fatura İcmal Raporu', subtitle: `${month} dönemi firma bazlı hizmet özeti`,
      filters: [{ label: 'Dönem', value: month }, { label: 'Firma', value: company }],
      summary: [{ label: 'Firma', value: rows.length }, { label: 'Protokol', value: totals.protocolCount }, { label: 'Hizmet toplamı', value: currency.format(totals.gross) }, { label: 'Tahsil edilen', value: currency.format(totals.collected) }, { label: 'Kalan', value: currency.format(totals.remaining) }],
      sections: [{ title: 'Firma İcmali', columns: [{ header: 'Firma', width: 180 }, { header: 'Protokol', width: 80 }, { header: 'Hizmet', width: 80 }, { header: 'Hizmet Toplamı', width: 110, format: 'currency' }, { header: 'Tahsil Edilen', width: 110, format: 'currency' }, { header: 'Kalan', width: 110, format: 'currency' }], rows: rows.map((row) => [row.company, row.protocolCount, row.serviceCount, row.gross, row.collected, row.remaining]) }],
    })
    showToast('success', 'Fatura icmali indirildi', `${rows.length} firma rapora eklendi.`)
  }

  const cards = [
    { label: 'Protokol', value: totals.protocolCount.toLocaleString('tr-TR'), icon: ReceiptText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Hizmet toplamı', value: currency.format(totals.gross), icon: Building2, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Tahsil edilen', value: currency.format(totals.collected), icon: WalletCards, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Kalan tutar', value: currency.format(totals.remaining), icon: FileSpreadsheet, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="viewport-page">
      <PageHeader title="Fatura İcmal" subtitle="Aylık hizmet bedellerini firma bazında karşılaştırın ve dışa aktarın." action={<ExportButton onClick={handleExport} disabled={rows.length === 0} />} />
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-col sm:flex-row gap-3 shrink-0">
        <label className="text-xs font-semibold text-slate-600">
          Dönem
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="block mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-500" />
        </label>
        <label className="text-xs font-semibold text-slate-600 sm:min-w-64">
          Firma
          <select value={company} onChange={(event) => setCompany(event.target.value)} className="block w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-500">
            {companies.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-slate-100 shadow-sm rounded-2xl p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0`}><Icon className="w-4 h-4" /></div>
            <div className="min-w-0"><p className="text-[11px] text-slate-500">{label}</p><p className="text-base font-bold text-slate-800 mt-0.5 truncate">{value}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        {rows.length === 0 ? (
          <div className="flex-1 grid place-items-center text-center p-8"><div><FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" /><h2 className="font-semibold text-slate-700">Bu dönem için kayıt yok</h2><p className="text-xs text-slate-500 mt-1">Farklı bir ay veya firma seçin.</p></div></div>
        ) : (
          <div className="surface-scroll">
            <table className="w-full text-sm sticky-table-header">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 text-left">Firma</th><th className="px-4 py-3 text-right">Protokol</th><th className="px-4 py-3 text-right">Hizmet</th><th className="px-4 py-3 text-right">Hizmet toplamı</th><th className="px-4 py-3 text-right">Tahsil edilen</th><th className="px-4 py-3 text-right">Kalan</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.company} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-800">{row.company}</td><td className="px-4 py-3 text-right text-slate-600">{row.protocolCount}</td><td className="px-4 py-3 text-right text-slate-600">{row.serviceCount}</td><td className="px-4 py-3 text-right font-medium text-slate-700">{currency.format(row.gross)}</td><td className="px-4 py-3 text-right text-emerald-700">{currency.format(row.collected)}</td><td className="px-4 py-3 text-right font-semibold text-amber-700">{currency.format(row.remaining)}</td></tr>)}</tbody>
              <tfoot className="bg-slate-50 font-bold text-slate-800"><tr><td className="px-4 py-3">Genel Toplam</td><td className="px-4 py-3 text-right">{totals.protocolCount}</td><td /><td className="px-4 py-3 text-right">{currency.format(totals.gross)}</td><td className="px-4 py-3 text-right">{currency.format(totals.collected)}</td><td className="px-4 py-3 text-right">{currency.format(totals.remaining)}</td></tr></tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
