import { useMemo, useState } from 'react'
import { useProtocols } from '@/state/ProtocolsContext'
import { usePatients } from '@/state/PatientsContext'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/state/ToastContext'
import { useCash } from '@/state/CashContext'
import { ExportButton } from '@/shared/components/ui/ExportButton'
import { AccountingFilters } from '@/pages/accounting/components/AccountingFilters'
import { AccountingSummary } from '@/pages/accounting/components/AccountingSummary'
import { AccountingTable } from '@/pages/accounting/components/AccountingTable'
import { nowLocalDate } from '@/shared/lib/date'
import { downloadExcelReport } from '@/shared/lib/excel'

const ITEMS_PER_PAGE = 10

export function Accounting() {
  const { protocols } = useProtocols()
  const { patients } = usePatients()
  const { cashAccounts } = useCash()
  const { showToast } = useToast()

  const today = nowLocalDate()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [companyFilter, setCompanyFilter] = useState('Tümü')
  const [examTypeFilter, setExamTypeFilter] = useState('Tümü')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('Tümü')
  const [kasaFilter, setKasaFilter] = useState('Tümü')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const defaultCash = cashAccounts[0]?.name ?? 'MERKEZ KASA'

  const allRows = useMemo(() => {
    const rows: Array<{
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
    }> = []

    protocols.forEach((protocol) => {
      const patient = patients.find((p) => p.id === protocol.patientId)
      protocol.payments.forEach((payment) => {
        rows.push({
          paymentId: payment.id,
          protocolId: protocol.id,
          protocolNo: protocol.protocolNo,
          protocolDate: protocol.protocolDate,
          paymentDate: payment.paymentDate,
          paymentType: payment.paymentType,
          amount: payment.amount,
          description: payment.description,
          recordedBy: payment.recordedBy,
          patientId: protocol.patientId,
          patientName: patient?.name ?? '—',
          tc: patient?.tc ?? '—',
          phone: patient?.phone ?? '—',
          email: patient?.email ?? '—',
          company: protocol.company,
          examType: protocol.examType,
          status: protocol.status,
          kasa: defaultCash,
        })
      })
    })

    return rows.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
  }, [protocols, patients, defaultCash])

  const filteredRows = useMemo(() => {
    const start = new Date(startDate).setHours(0, 0, 0, 0)
    const end = new Date(endDate).setHours(23, 59, 59, 999)
    const term = search.trim().toLowerCase()

    return allRows.filter((row) => {
      const paymentTime = new Date(row.paymentDate).getTime()
      const matchesDate = paymentTime >= start && paymentTime <= end
      const matchesCompany = companyFilter === 'Tümü' || row.company === companyFilter
      const matchesExamType = examTypeFilter === 'Tümü' || row.examType === examTypeFilter
      const matchesPaymentType = paymentTypeFilter === 'Tümü' || row.paymentType === paymentTypeFilter
      const matchesKasa = kasaFilter === 'Tümü' || row.kasa === kasaFilter
      const matchesSearch =
        !term ||
        row.patientName.toLowerCase().includes(term) ||
        row.protocolNo.toLowerCase().includes(term) ||
        row.tc.toLowerCase().includes(term) ||
        row.company.toLowerCase().includes(term)
      return matchesDate && matchesCompany && matchesExamType && matchesPaymentType && matchesKasa && matchesSearch
    })
  }, [allRows, startDate, endDate, companyFilter, examTypeFilter, paymentTypeFilter, kasaFilter, search])

  const totalsByType = useMemo(() => {
    const totals: Record<string, number> = {
      Nakit: 0,
      'Eft/Havale': 0,
      Kart: 0,
      'Kuruma Fatura': 0,
      İndirim: 0,
    }
    filteredRows.forEach((row) => {
      totals[row.paymentType] = (totals[row.paymentType] ?? 0) + row.amount
    })
    return totals
  }, [filteredRows])

  const grandTotal = useMemo(
    () => Object.values(totalsByType).reduce((sum, v) => sum + v, 0),
    [totalsByType]
  )

  const totalItems = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  const paginatedRows = filteredRows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const companyNames = useMemo(
    () => ['Tümü', ...new Set(allRows.map((r) => r.company).filter(Boolean))],
    [allRows]
  )

  const examTypes = useMemo(
    () => ['Tümü', ...new Set(allRows.map((r) => r.examType).filter(Boolean))],
    [allRows]
  )

  const paymentTypes = ['Tümü', 'Nakit', 'Eft/Havale', 'Kart', 'Kuruma Fatura', 'İndirim']
  const kasaOptions = useMemo(
    () => ['Tümü', ...cashAccounts.map((a) => a.name)],
    [cashAccounts]
  )

  const handleReset = () => {
    setStartDate(today)
    setEndDate(today)
    setCompanyFilter('Tümü')
    setExamTypeFilter('Tümü')
    setPaymentTypeFilter('Tümü')
    setKasaFilter('Tümü')
    setSearch('')
    setPage(1)
    showToast('info', 'Filtreler sıfırlandı')
  }

  const handleExport = () => {
    downloadExcelReport({
      fileName: `Kasa_Raporu_${startDate}_${endDate}.xls`,
      title: 'Kasa Raporu',
      subtitle: 'Tahsilat, fatura ve indirim hareketleri',
      filters: [
        { label: 'Tarih aralığı', value: `${startDate} - ${endDate}` },
        { label: 'Firma', value: companyFilter },
        { label: 'Muayene türü', value: examTypeFilter },
        { label: 'Ödeme tipi', value: paymentTypeFilter },
        { label: 'Kasa', value: kasaFilter },
        { label: 'Arama', value: search || 'Tümü' },
      ],
      summary: [
        { label: 'Kayıt', value: filteredRows.length },
        { label: 'Genel toplam', value: `₺${grandTotal.toFixed(2)}` },
        ...Object.entries(totalsByType).map(([type, total]) => ({ label: type, value: `₺${total.toFixed(2)}` })),
      ],
      sections: [{
        title: 'Tahsilat Hareketleri',
        columns: [
          { header: 'Protokol Tarihi', width: 125, format: 'date' },
          { header: 'Tahsilat Tarihi', width: 125, format: 'date' },
          { header: 'Makbuz No', width: 95 },
          { header: 'Kasa', width: 110 },
          { header: 'Ödeme Tipi', width: 110 },
          { header: 'Açıklama', width: 180 },
          { header: 'Tutar', width: 90, align: 'right', format: 'currency' },
          { header: 'TC No', width: 110 },
          { header: 'Hasta', width: 140 },
          { header: 'Telefon', width: 115 },
          { header: 'Mail', width: 180 },
          { header: 'Firma', width: 140 },
          { header: 'Muayene Türü', width: 130 },
          { header: 'Durum', width: 110 },
          { header: 'İşlem Yapan', width: 110 },
        ],
        rows: filteredRows.map((row) => [
          new Date(row.protocolDate).toLocaleString('tr-TR'),
          new Date(row.paymentDate).toLocaleString('tr-TR'),
          row.protocolNo,
          row.kasa,
          row.paymentType,
          row.description,
          row.amount,
          row.tc,
          row.patientName,
          row.phone,
          row.email,
          row.company,
          row.examType,
          row.status,
          row.recordedBy,
        ]),
      }],
    })
    showToast('success', 'Excel raporu indirildi', `${filteredRows.length} kayıt biçimlendirilmiş olarak dışa aktarıldı.`)
  }

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <PageHeader
        title="Kasa Raporu"
        subtitle="Tüm tahsilat, fatura ve indirim hareketlerini görüntüleyin."
        action={
          <ExportButton
            onClick={handleExport}
            disabled={filteredRows.length === 0}
          />
        }
      />

      <AccountingFilters
        startDate={startDate}
        endDate={endDate}
        companyFilter={companyFilter}
        examTypeFilter={examTypeFilter}
        paymentTypeFilter={paymentTypeFilter}
        kasaFilter={kasaFilter}
        search={search}
        companyNames={companyNames}
        examTypes={examTypes}
        paymentTypes={paymentTypes}
        kasaOptions={kasaOptions}
        onStartDateChange={(v) => {
          setStartDate(v)
          if (endDate && v > endDate) setEndDate(v)
          setPage(1)
        }}
        onEndDateChange={(v) => {
          setEndDate(v)
          if (startDate && v < startDate) setStartDate(v)
          setPage(1)
        }}
        onCompanyFilterChange={(v) => { setCompanyFilter(v); setPage(1) }}
        onExamTypeFilterChange={(v) => { setExamTypeFilter(v); setPage(1) }}
        onPaymentTypeFilterChange={(v) => { setPaymentTypeFilter(v); setPage(1) }}
        onKasaFilterChange={(v) => { setKasaFilter(v); setPage(1) }}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        onReset={handleReset}
      />

      <AccountingSummary totalsByType={totalsByType} grandTotal={grandTotal} />

      {/* Table */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <AccountingTable
          rows={paginatedRows}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filteredRows.length}
        />
      </div>
    </div>
  )
}


