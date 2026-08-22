import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Filter,
  Phone,
  RotateCcw,
  Search,
  User,
} from 'lucide-react'
import { useProtocols } from '../../context/ProtocolsContext'
import { usePatients } from '../../context/PatientsContext'
import { PageHeader } from '../../components/PageHeader'
import { useToast } from '../../context/ToastContext'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { nowLocalDate } from '../../utils/date'

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

export function Debtors() {
  const { protocols } = useProtocols()
  const { patients } = usePatients()
  const { showToast } = useToast()
  const today = nowLocalDate()

  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [companyFilter, setCompanyFilter] = useState('Tümü')
  const [examTypeFilter, setExamTypeFilter] = useState('Tümü')
  const [debtFilter, setDebtFilter] = useState('Tümü')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const allRows = useMemo(() => {
    return protocols
      .map((protocol) => {
        const paid = protocol.payments
          .filter((p) => p.paymentType !== 'İndirim')
          .reduce((sum, p) => sum + p.amount, 0)
        const discount = protocol.payments
          .filter((p) => p.paymentType === 'İndirim')
          .reduce((sum, p) => sum + p.amount, 0)
        const total = protocol.services.reduce((sum, s) => sum + s.totalPrice, 0)
        const debt = Number((total - paid - discount).toFixed(2))
        const patient = patients.find((p) => p.id === protocol.patientId)
        return {
          id: protocol.id,
          status: protocol.status,
          protocolDate: protocol.protocolDate,
          protocolNo: protocol.protocolNo,
          receiptNo: protocol.protocolNo,
          examType: protocol.examType,
          tc: patient?.tc ?? '—',
          registryNo: patient?.id?.toString() ?? '—',
          patientName: patient?.name ?? '—',
          company: protocol.company,
          total,
          discount,
          paid,
          debt,
          phone: patient?.phone ?? '—',
        }
      })
      .filter((row) => row.debt > 0)
      .sort((a, b) => b.debt - a.debt)
  }, [protocols, patients])

  const filteredRows = useMemo(() => {
    const start = new Date(startDate).setHours(0, 0, 0, 0)
    const end = new Date(endDate).setHours(23, 59, 59, 999)
    const term = search.trim().toLowerCase()

    return allRows.filter((row) => {
      const pTime = new Date(row.protocolDate).getTime()
      const matchesDate = pTime >= start && pTime <= end
      const matchesCompany = companyFilter === 'Tümü' || row.company === companyFilter
      const matchesExamType = examTypeFilter === 'Tümü' || row.examType === examTypeFilter
      const matchesDebt = debtFilter === 'Tümü' || (debtFilter === 'Borçlu Olanlar' && row.debt > 0)
      const matchesSearch =
        !term ||
        row.patientName.toLowerCase().includes(term) ||
        row.protocolNo.toLowerCase().includes(term) ||
        row.tc.toLowerCase().includes(term) ||
        row.company.toLowerCase().includes(term)
      return matchesDate && matchesCompany && matchesExamType && matchesDebt && matchesSearch
    })
  }, [allRows, startDate, endDate, companyFilter, examTypeFilter, debtFilter, search])

  const totalItems = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)

  const totalDebt = filteredRows.reduce((sum, r) => sum + r.debt, 0)
  const totalAmount = filteredRows.reduce((sum, r) => sum + r.total, 0)
  const totalDiscount = filteredRows.reduce((sum, r) => sum + r.discount, 0)

  const companyNames = useMemo(
    () => ['Tümü', ...new Set(allRows.map((r) => r.company).filter(Boolean))],
    [allRows]
  )
  const examTypes = useMemo(
    () => ['Tümü', ...new Set(allRows.map((r) => r.examType).filter(Boolean))],
    [allRows]
  )

  const handleReset = () => {
    setStartDate(today)
    setEndDate(today)
    setCompanyFilter('Tümü')
    setExamTypeFilter('Tümü')
    setDebtFilter('Tümü')
    setSearch('')
    setPage(1)
    showToast('info', 'Filtreler sıfırlandı')
  }

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <PageHeader
        title="Borçlu Hastalar"
        subtitle="Ödemesi tamamlanmamış hasta ve firmaları listeleyin."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
          <p className="text-[10px] text-slate-400">Toplam Borçlu</p>
          <p className="text-xl font-bold text-slate-800">{filteredRows.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
          <p className="text-[10px] text-slate-400">Genel Toplam</p>
          <p className="text-xl font-bold text-slate-800">₺{totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
          <p className="text-[10px] text-slate-400">Toplam Borç</p>
          <p className="text-xl font-bold text-red-600">₺{totalDebt.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
          <p className="text-[10px] text-slate-400">Toplam İndirim</p>
          <p className="text-xl font-bold text-amber-600">₺{totalDiscount.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Filter className="w-4 h-4 text-slate-400" />
            Filtreler
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1 ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            Sıfırla
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Başlangıç</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Bitiş</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Firma</label>
            <select
              value={companyFilter}
              onChange={(e) => { setCompanyFilter(e.target.value); setPage(1) }}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {companyNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Muayene Tipi</label>
            <select
              value={examTypeFilter}
              onChange={(e) => { setExamTypeFilter(e.target.value); setPage(1) }}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {examTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Borçlu Olanlar</label>
            <select
              value={debtFilter}
              onChange={(e) => { setDebtFilter(e.target.value); setPage(1) }}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="Tümü">Tümü</option>
              <option value="Borçlu Olanlar">Borçlu Olanlar</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Hasta adı, TC, firma veya protokol no ara..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold text-slate-800">Hastalar</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span>Sayfada</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500"
              >
                {ITEMS_PER_PAGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <span className="text-xs text-slate-400">{totalItems} kayıt</span>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="flex-1">
            <EmptyState
              icon={AlertCircle}
              title="Görüntülenecek veri yok"
              description="Seçilen tarih aralığına veya filtre kritere ait borçlu hasta bulunmuyor."
            />
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Durumu</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Protokol Tarihi</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Protokol No</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Makbuz No</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Muayene Türü</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">TC Kimlik No</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Sicil No</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Hasta</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Firma</th>
                    <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Tutar</th>
                    <th className="px-3 py-2 font-medium text-right whitespace-nowrap">İndirim</th>
                    <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Ödenen</th>
                    <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Kalan</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">İletişim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          row.status === 'Tamamlandı' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{new Date(row.protocolDate).toLocaleDateString('tr-TR')}</td>
                      <td className="px-3 py-2 text-slate-700 font-mono whitespace-nowrap">{row.protocolNo}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono whitespace-nowrap">{row.receiptNo}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.examType || '—'}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap font-mono text-[10px]">{row.tc}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.registryNo}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <User className="w-3 h-3" />
                          </div>
                          <span className="font-medium text-slate-800">{row.patientName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.company}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800 font-mono whitespace-nowrap">₺{row.total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium text-amber-600 font-mono whitespace-nowrap">₺{row.discount.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-600 font-mono whitespace-nowrap">₺{row.paid.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-bold text-red-600 font-mono whitespace-nowrap">₺{row.debt.toFixed(2)}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.phone !== '—' ? (
                          <div className="flex items-center gap-1.5 text-[10px] whitespace-nowrap">
                            <Phone className="w-3 h-3" />
                            {row.phone}
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  )
}
