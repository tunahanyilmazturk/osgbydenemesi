import { useMemo, useState } from 'react'
import { useProtocols } from '../../context/ProtocolsContext'
import { usePatients } from '../../context/PatientsContext'
import { PageHeader } from '../../components/PageHeader'
import { useToast } from '../../context/ToastContext'
import { useCash } from '../../context/CashContext'
import { ExportButton } from '../../components/ui/ExportButton'
import { CashMovementsFilters } from '../../pages/cash/components/CashMovementsFilters'
import { CashMovementsTable } from '../../pages/cash/components/CashMovementsTable'
import { nowLocalDate } from '../../utils/date'
import { downloadExcelReport } from '../../utils/excel'

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]
const ITEMS_PER_PAGE = 10

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

export function CashMovements() {
  const { protocols } = useProtocols()
  const { patients } = usePatients()
  const { cashAccounts, transfers } = useCash()
  const { showToast } = useToast()
  const today = nowLocalDate()

  const defaultCash = cashAccounts[0]?.name ?? 'MERKEZ KASA'

  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('Tümü')
  const [kasaFilter, setKasaFilter] = useState('Tümü')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE)

  const allMovements = useMemo(() => {
    const movements: MovementRow[] = []

    // Protokol ödemelerini varsayılan kasaya ekle
    protocols.forEach((protocol) => {
      const patient = patients.find((p) => p.id === protocol.patientId)
      protocol.payments.forEach((payment) => {
        movements.push({
          id: payment.id,
          date: payment.paymentDate,
          kasa: defaultCash,
          operation: 'Tahsilat',
          paymentType: payment.paymentType,
          amount: payment.amount,
          balance: 0,
          recordedBy: payment.recordedBy,
          description: payment.description,
          patientName: patient?.name ?? '—',
          protocolNo: protocol.protocolNo,
        })
      })
    })

    // Transferleri hem kaynak hem hedef kasa için ekle
    transfers.forEach((t) => {
      movements.push({
        id: t.id * -1, // negative id for source side
        date: t.date,
        kasa: t.from,
        operation: 'Transfer (Ã‡ıkış)',
        paymentType: 'Nakit',
        amount: -t.amount,
        balance: 0,
        recordedBy: t.recordedBy,
        description: `→ ${t.to}${t.description ? ` | ${t.description}` : ''}`,
        patientName: '—',
        protocolNo: '—',
      })
      movements.push({
        id: t.id * -2, // another negative id for target side
        date: t.date,
        kasa: t.to,
        operation: 'Transfer (Giriş)',
        paymentType: 'Nakit',
        amount: t.amount,
        balance: 0,
        recordedBy: t.recordedBy,
        description: `← ${t.from}${t.description ? ` | ${t.description}` : ''}`,
        patientName: '—',
        protocolNo: '—',
      })
    })

    // Tarihe göre eskiden yeniye sırala (balance artan sırada hesaplanacak)
    return movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [protocols, patients, transfers, defaultCash])

  const filteredMovements = useMemo(() => {
    const start = new Date(startDate).setHours(0, 0, 0, 0)
    const end = new Date(endDate).setHours(23, 59, 59, 999)
    const term = search.trim().toLowerCase()

    return allMovements
      .filter((m) => {
        const mTime = new Date(m.date).getTime()
        const matchesDate = mTime >= start && mTime <= end
        const matchesPaymentType = paymentTypeFilter === 'Tümü' || m.paymentType === paymentTypeFilter
        const matchesKasa = kasaFilter === 'Tümü' || m.kasa === kasaFilter
        const matchesSearch =
          !term ||
          m.kasa.toLowerCase().includes(term) ||
          m.operation.toLowerCase().includes(term) ||
          m.patientName.toLowerCase().includes(term) ||
          m.protocolNo.toLowerCase().includes(term)
        return matchesDate && matchesPaymentType && matchesKasa && matchesSearch
      })
      .map((m, _, arr) => {
        // Her kasa için ayrı running balance hesapla
        const kasaMovements = arr.filter((x) => x.kasa === m.kasa && new Date(x.date).getTime() <= new Date(m.date).getTime())
        const balance = kasaMovements.reduce((sum, x) => sum + x.amount, 0)
        return { ...m, balance }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [allMovements, startDate, endDate, paymentTypeFilter, kasaFilter, search])

  const totalItems = filteredMovements.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedMovements = filteredMovements.slice((page - 1) * pageSize, page * pageSize)

  const totalAmount = filteredMovements.reduce((sum, m) => sum + m.amount, 0)
  const totalIn = filteredMovements.reduce((sum, m) => (m.amount > 0 ? sum + m.amount : sum), 0)
  const totalOut = filteredMovements.reduce((sum, m) => (m.amount < 0 ? sum - m.amount : sum), 0)

  const handleReset = () => {
    setStartDate(today)
    setEndDate(today)
    setPaymentTypeFilter('Tümü')
    setKasaFilter('Tümü')
    setSearch('')
    setPage(1)
    showToast('info', 'Filtreler sıfırlandı')
  }

  const handleExport = () => {
    const totalIn = filteredMovements
      .filter((movement) => movement.operation === 'Giriş')
      .reduce((sum, movement) => sum + movement.amount, 0)
    const totalOut = filteredMovements
      .filter((movement) => movement.operation === 'Çıkış')
      .reduce((sum, movement) => sum + movement.amount, 0)

    downloadExcelReport({
      fileName: `Kasa_Hareketleri_${startDate}_${endDate}.xls`,
      title: 'Kasa Hareketleri',
      subtitle: 'Kasa hareketleri ve işlem bakiyeleri',
      filters: [
        { label: 'Tarih aralığı', value: `${startDate} - ${endDate}` },
        { label: 'Ödeme tipi', value: paymentTypeFilter },
        { label: 'Kasa', value: kasaFilter },
        { label: 'Arama', value: search || 'Tümü' },
      ],
      summary: [
        { label: 'Kayıt', value: filteredMovements.length },
        { label: 'Toplam giriş', value: `₺${totalIn.toFixed(2)}` },
        { label: 'Toplam çıkış', value: `₺${totalOut.toFixed(2)}` },
        { label: 'Net hareket', value: `₺${(totalIn - totalOut).toFixed(2)}` },
      ],
      sections: [{
        title: 'Kasa Hareket Listesi',
        columns: [
          { header: 'Kasa', width: 110 },
          { header: 'İşlem', width: 90 },
          { header: 'Ödeme Tipi', width: 110 },
          { header: 'Tutar', width: 95, align: 'right', format: 'currency' },
          { header: 'Hareket Sonrası Bakiye', width: 130, align: 'right', format: 'currency' },
          { header: 'İşlem Yapan', width: 110 },
          { header: 'İşlem Tarihi', width: 130, format: 'date' },
          { header: 'Hasta', width: 140 },
          { header: 'Protokol No', width: 105 },
          { header: 'Açıklama', width: 220 },
        ],
        rows: filteredMovements.map((movement) => [
          movement.kasa,
          movement.operation,
          movement.paymentType,
          movement.amount,
          movement.balance,
          movement.recordedBy,
          new Date(movement.date).toLocaleString('tr-TR'),
          movement.patientName,
          movement.protocolNo,
          movement.description,
        ]),
      }],
    })
    showToast('success', 'Excel raporu indirildi', `${filteredMovements.length} kayıt biçimlendirilmiş olarak dışa aktarıldı.`)
  }

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <PageHeader
        title="Kasa Hareketleri"
        subtitle="Tüm kasa hareketlerini tarih, ödeme tipi ve kasa bazında inceleyin."
        action={
          <ExportButton
            onClick={handleExport}
            disabled={filteredMovements.length === 0}
          />
        }
      />

      <CashMovementsFilters
        startDate={startDate}
        endDate={endDate}
        paymentTypeFilter={paymentTypeFilter}
        kasaFilter={kasaFilter}
        search={search}
        paymentTypes={['Tümü', 'Nakit', 'Eft/Havale', 'Kart', 'Kuruma Fatura', 'İndirim']}
        kasaOptions={['Tümü', ...cashAccounts.map((k) => k.name)]}
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
        onPaymentTypeFilterChange={(v) => { setPaymentTypeFilter(v); setPage(1) }}
        onKasaFilterChange={(v) => { setKasaFilter(v); setPage(1) }}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        onReset={handleReset}
      />

      {/* Total summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] text-slate-400">Toplam Hareket</p>
          <p className="text-2xl font-bold text-slate-800">{filteredMovements.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] text-slate-400">Toplam Giriş</p>
          <p className="text-2xl font-bold text-emerald-600">₺{totalIn.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] text-slate-400">Toplam Ã‡ıkış</p>
          <p className="text-2xl font-bold text-red-600">₺{totalOut.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] text-slate-400">Net Bakiye</p>
          <p className={`text-2xl font-bold ${totalAmount >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
            ₺{totalAmount.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Movements table */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <CashMovementsTable
          movements={paginatedMovements}
          totalItems={totalItems}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={ITEMS_PER_PAGE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      </div>
    </div>
  )
}
