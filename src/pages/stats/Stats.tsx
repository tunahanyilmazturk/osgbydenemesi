import { useMemo, useState } from 'react'
import { Download, Filter, RotateCcw } from 'lucide-react'
import { useProtocols } from '@/state/ProtocolsContext'
import { usePatients } from '@/state/PatientsContext'
import { useServices } from '@/state/ServicesContext'
import { PageHeader } from '@/shared/components/PageHeader'
import { useToast } from '@/state/ToastContext'
import { nowLocalDate, addDays } from '@/shared/lib/date'
import { downloadExcelReport } from '@/shared/lib/excel'
import { StatCard, TableCard } from '@/pages/stats/components/StatsCards'

interface FilteredService {
  id: number
  protocolId: number
  protocolNo: string
  protocolDate: string
  patientId: number
  patientName: string
  patientTc: string
  company: string
  examType: string
  serviceId: number
  serviceName: string
  serviceGroup: string
  status: string
  recordedBy: string
  processDate: string
  price: number
  totalPrice: number
}

interface DailyStat {
  date: string
  patients: Set<number>
  protocols: Set<number>
  services: number
  amount: number
  paid: number
  debt: number
}

export function Stats() {
  const { protocols } = useProtocols()
  const { patients } = usePatients()
  const { catalog, groups } = useServices()
  const { showToast } = useToast()

  const today = nowLocalDate()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [companyFilter, setCompanyFilter] = useState('Tümü')
  const [examTypeFilter, setExamTypeFilter] = useState('Tümü')
  const [groupFilter, setGroupFilter] = useState('Tümü')
  const [serviceFilter, setServiceFilter] = useState('Tümü')
  const [statusFilter, setStatusFilter] = useState('Tümü')
  const [userFilter, setUserFilter] = useState('Tümü')

  const allRows = useMemo<FilteredService[]>(() => {
    const rows: FilteredService[] = []
    protocols.forEach((protocol) => {
      const patient = patients.find((p) => p.id === protocol.patientId)
      protocol.services.forEach((service) => {
        rows.push({
          id: service.id,
          protocolId: protocol.id,
          protocolNo: protocol.protocolNo,
          protocolDate: protocol.protocolDate,
          patientId: protocol.patientId,
          patientName: patient?.name ?? '—',
          patientTc: patient?.tc ?? '—',
          company: protocol.company,
          examType: protocol.examType,
          serviceId: service.id,
          serviceName: service.name,
          serviceGroup: service.group,
          status: service.status,
          recordedBy: service.recordedBy,
          processDate: service.processDate,
          price: service.price,
          totalPrice: service.totalPrice,
        })
      })
    })
    return rows
  }, [protocols, patients])

  const filteredRows = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null
    const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null
    return allRows.filter((row) => {
      const pTime = new Date(`${row.protocolDate.slice(0, 10)}T00:00:00`).getTime()
      if (start !== null && pTime < start) return false
      if (end !== null && pTime > end) return false
      if (companyFilter !== 'Tümü' && row.company !== companyFilter) return false
      if (examTypeFilter !== 'Tümü' && row.examType !== examTypeFilter) return false
      if (groupFilter !== 'Tümü' && row.serviceGroup !== groupFilter) return false
      if (serviceFilter !== 'Tümü' && row.serviceName !== serviceFilter) return false
      if (statusFilter !== 'Tümü' && row.status !== statusFilter) return false
      if (userFilter !== 'Tümü' && row.recordedBy !== userFilter) return false
      return true
    })
  }, [allRows, startDate, endDate, companyFilter, examTypeFilter, groupFilter, serviceFilter, statusFilter, userFilter])

  const companyOptions = useMemo(() => {
    return ['Tümü', ...Array.from(new Set(allRows.map((r) => r.company)).values())]
  }, [allRows])

  const examTypeOptions = useMemo(() => {
    return ['Tümü', ...Array.from(new Set(allRows.map((r) => r.examType)).values())]
  }, [allRows])

  const groupOptions = useMemo(() => {
    const names = new Set([...groups.map((g) => g.name), ...allRows.map((row) => row.serviceGroup)])
    return ['Tümü', ...Array.from(names)]
  }, [groups, allRows])

  const serviceOptions = useMemo(() => {
    const names = new Set([...catalog.map((c) => c.name), ...allRows.map((row) => row.serviceName)])
    return ['Tümü', ...Array.from(names)]
  }, [catalog, allRows])

  const userOptions = useMemo(() => {
    return ['Tümü', ...Array.from(new Set(allRows.map((r) => r.recordedBy)).values())]
  }, [allRows])

  const stats = useMemo(() => {
    const uniquePatients = new Set(filteredRows.map((r) => r.patientId))
    const uniqueProtocols = new Set(filteredRows.map((r) => r.protocolId))
    const totalServices = filteredRows.length
    const totalAmount = filteredRows.reduce((sum, r) => sum + r.totalPrice, 0)

    const companyMap = new Map<string, { protocols: Set<number>; services: number; amount: number }>()
    const examTypeMap = new Map<string, number>()
    const groupMap = new Map<string, number>()
    const serviceMap = new Map<string, { group: string; count: number; amount: number }>()
    const statusMap = new Map<string, number>()
    const userMap = new Map<string, { protocols: Set<number>; services: number; amount: number }>()
    const dailyMap = new Map<string, DailyStat>()

    filteredRows.forEach((row) => {
      // Company
      if (!companyMap.has(row.company)) {
        companyMap.set(row.company, { protocols: new Set(), services: 0, amount: 0 })
      }
      const c = companyMap.get(row.company)!
      c.protocols.add(row.protocolId)
      c.services += 1
      c.amount += row.totalPrice

      // Exam type
      examTypeMap.set(row.examType, (examTypeMap.get(row.examType) ?? 0) + 1)

      // Group
      groupMap.set(row.serviceGroup, (groupMap.get(row.serviceGroup) ?? 0) + 1)

      // Service
      if (!serviceMap.has(row.serviceName)) {
        serviceMap.set(row.serviceName, { group: row.serviceGroup, count: 0, amount: 0 })
      }
      const s = serviceMap.get(row.serviceName)!
      s.count += 1
      s.amount += row.totalPrice

      // Status
      statusMap.set(row.status, (statusMap.get(row.status) ?? 0) + 1)

      // User
      if (!userMap.has(row.recordedBy)) {
        userMap.set(row.recordedBy, { protocols: new Set(), services: 0, amount: 0 })
      }
      const u = userMap.get(row.recordedBy)!
      u.protocols.add(row.protocolId)
      u.services += 1
      u.amount += row.totalPrice

      // Daily
      const date = row.protocolDate.slice(0, 10)
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, patients: new Set(), protocols: new Set(), services: 0, amount: 0, paid: 0, debt: 0 })
      }
      const d = dailyMap.get(date)!
      d.patients.add(row.patientId)
      d.protocols.add(row.protocolId)
      d.services += 1
      d.amount += row.totalPrice
    })

    const filteredProtocolIds = new Set(filteredRows.map((row) => row.protocolId))

    // Payment and debt figures must follow the same filtered protocol set.
    protocols.forEach((protocol) => {
      if (!filteredProtocolIds.has(protocol.id)) return
      const date = protocol.protocolDate.slice(0, 10)
      const d = dailyMap.get(date)
      if (!d) return
      const paid = protocol.payments
        .filter((p) => p.paymentType !== 'İndirim')
        .reduce((sum, p) => sum + p.amount, 0)
      const discount = protocol.payments
        .filter((p) => p.paymentType === 'İndirim')
        .reduce((sum, p) => sum + p.amount, 0)
      const total = protocol.services.reduce((sum, s) => sum + s.totalPrice, 0)
      d.paid += paid
      d.debt += Math.max(0, total - paid - discount)
    })

    const selectedProtocols = protocols.filter((protocol) => filteredProtocolIds.has(protocol.id))
    const totalPaid = selectedProtocols
      .flatMap((p) => p.payments)
      .filter((p) => p.paymentType !== 'İndirim')
      .reduce((sum, p) => sum + p.amount, 0)

    const totalDebt = selectedProtocols.reduce((sum, p) => {
      const paid = p.payments
        .filter((payment) => payment.paymentType !== 'İndirim')
        .reduce((s, payment) => s + payment.amount, 0)
      const discount = p.payments
        .filter((payment) => payment.paymentType === 'İndirim')
        .reduce((s, payment) => s + payment.amount, 0)
      const total = p.services.reduce((s, service) => s + service.totalPrice, 0)
      return sum + Math.max(0, total - paid - discount)
    }, 0)

    return {
      uniquePatients: uniquePatients.size,
      uniqueProtocols: uniqueProtocols.size,
      totalServices,
      totalAmount,
      totalPaid,
      totalDebt,
      companyList: Array.from(companyMap.entries()).sort((a, b) => b[1].services - a[1].services),
      examTypeList: Array.from(examTypeMap.entries()).sort((a, b) => b[1] - a[1]),
      groupList: Array.from(groupMap.entries()).sort((a, b) => b[1] - a[1]),
      serviceList: Array.from(serviceMap.entries()).sort((a, b) => b[1].count - a[1].count),
      statusList: Array.from(statusMap.entries()).sort((a, b) => b[1] - a[1]),
      userList: Array.from(userMap.entries()).sort((a, b) => b[1].services - a[1].services),
      dailyList: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    }
  }, [filteredRows, protocols])

  const handleReset = () => {
    setStartDate(today)
    setEndDate(today)
    setCompanyFilter('Tümü')
    setExamTypeFilter('Tümü')
    setGroupFilter('Tümü')
    setServiceFilter('Tümü')
    setStatusFilter('Tümü')
    setUserFilter('Tümü')
    showToast('info', 'Filtreler sıfırlandı')
  }

  const handleExport = () => {
    downloadExcelReport({
      fileName: `Istatistikler_${startDate}_${endDate}.xls`,
      title: 'İstatistikler',
      subtitle: 'Filtrelenmiş hasta, protokol, test ve finansal özet raporu',
      filters: [
        { label: 'Tarih aralığı', value: `${startDate} - ${endDate}` },
        { label: 'Firma', value: companyFilter },
        { label: 'Muayene türü', value: examTypeFilter },
        { label: 'Test grubu', value: groupFilter },
        { label: 'Test', value: serviceFilter },
        { label: 'Durum', value: statusFilter },
        { label: 'Kullanıcı', value: userFilter },
      ],
      summary: [
        { label: 'Hasta', value: stats.uniquePatients },
        { label: 'Protokol', value: stats.uniqueProtocols },
        { label: 'Test', value: stats.totalServices },
        { label: 'Tutar', value: `₺${stats.totalAmount.toFixed(2)}` },
        { label: 'Tahsilat', value: `₺${stats.totalPaid.toFixed(2)}` },
        { label: 'Borç', value: `₺${stats.totalDebt.toFixed(2)}` },
      ],
      sections: [
        {
          title: 'Test Detayları',
          columns: [
            { header: 'Tarih', width: 110, format: 'date' },
            { header: 'Protokol No', width: 105 },
            { header: 'Hasta', width: 145 },
            { header: 'TC', width: 110 },
            { header: 'Firma', width: 140 },
            { header: 'Muayene Türü', width: 130 },
            { header: 'Test Grubu', width: 120 },
            { header: 'Test Adı', width: 220 },
            { header: 'Durum', width: 120 },
            { header: 'Kullanıcı', width: 115 },
            { header: 'Tutar', width: 90, align: 'right', format: 'currency' },
          ],
          rows: filteredRows.map((row) => [
            row.protocolDate.slice(0, 10),
            row.protocolNo,
            row.patientName,
            row.patientTc,
            row.company,
            row.examType,
            row.serviceGroup,
            row.serviceName,
            row.status,
            row.recordedBy,
            row.totalPrice,
          ]),
        },
        {
          title: 'Günlük Özet',
          columns: [
            { header: 'Tarih', width: 110 },
            { header: 'Hasta', width: 80, align: 'right', format: 'number' },
            { header: 'Protokol', width: 90, align: 'right', format: 'number' },
            { header: 'Test', width: 80, align: 'right', format: 'number' },
            { header: 'Tutar', width: 100, align: 'right', format: 'currency' },
            { header: 'Tahsilat', width: 100, align: 'right', format: 'currency' },
            { header: 'Borç', width: 100, align: 'right', format: 'currency' },
          ],
          rows: stats.dailyList.map((day) => [
            day.date,
            day.patients.size,
            day.protocols.size,
            day.services,
            day.amount,
            day.paid,
            day.debt,
          ]),
        },
      ],
    })
    showToast('success', 'Excel raporu indirildi', `${filteredRows.length} kayıt biçimlendirilmiş olarak dışa aktarıldı.`)
  }

  return (
    <div className="viewport-page">
      <PageHeader
        title="İstatistikler"
        subtitle="Günlük, haftalık ve aylık performans raporlarını görüntüleyin."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={filteredRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              Excel İndir
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          Filtreler
          <button
            onClick={handleReset}
            className="ml-auto text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Sıfırla
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setStartDate(addDays(startDate || today, -1))
                setEndDate(addDays(endDate || today, -1))
              }}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
              title="Önceki gün"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                const value = e.target.value
                setStartDate(value)
                if (endDate && value > endDate) setEndDate(value)
              }}
              className="w-[110px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] focus:outline-none focus:border-blue-500"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                const value = e.target.value
                setEndDate(value)
                if (startDate && value < startDate) setStartDate(value)
              }}
              className="w-[110px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => {
                setStartDate(addDays(startDate || today, 1))
                setEndDate(addDays(endDate || today, 1))
              }}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
              title="Sonraki gün"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          >
            {companyOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={examTypeFilter}
            onChange={(e) => setExamTypeFilter(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          >
            {examTypeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          >
            {groupOptions.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          >
            {serviceOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="Tümü">Tüm Durumlar</option>
            <option value="Barkod Verildi">Barkod Verildi</option>
            <option value="İşlem Bekliyor">İşlem Bekliyor</option>
            <option value="Numune Kabul">Numune Kabul</option>
            <option value="Sonuç Bekleniyor">Sonuç Bekleniyor</option>
            <option value="Sonuç Girildi">Sonuç Girildi</option>
            <option value="Onaylandı">Onaylandı</option>
          </select>

          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          >
            {userOptions.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Hasta" value={stats.uniquePatients} color="bg-blue-50" />
        <StatCard title="Protokol" value={stats.uniqueProtocols} color="bg-emerald-50" />
        <StatCard title="Test" value={stats.totalServices} color="bg-violet-50" />
        <StatCard title="Tutar" value={`₺${stats.totalAmount.toFixed(2)}`} color="bg-amber-50" />
        <StatCard title="Tahsilat" value={`₺${stats.totalPaid.toFixed(2)}`} color="bg-indigo-50" />
        <StatCard title="Borç" value={`₺${stats.totalDebt.toFixed(2)}`} color="bg-rose-50" />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 flex-1 min-h-0 overflow-y-auto pb-2">
        <TableCard
          title="Firma Bazında"
          headers={['Firma', 'Protokol', 'Test', 'Tutar']}
          rows={stats.companyList.map(([name, data]) => [
            name,
            data.protocols.size,
            data.services,
            `₺${data.amount.toFixed(2)}`,
          ])}
        />

        <TableCard
          title="Muayene Türü Bazında"
          headers={['Muayene Türü', 'Adet']}
          rows={stats.examTypeList.map(([name, count]) => [name, count])}
        />

        <TableCard
          title="Test Grubu Bazında"
          headers={['Grup', 'Adet']}
          rows={stats.groupList.map(([name, count]) => [name, count])}
        />

        <TableCard
          title="Test Bazında"
          headers={['Test', 'Grup', 'Adet', 'Tutar']}
          rows={stats.serviceList.map(([name, data]) => [name, data.group, data.count, `₺${data.amount.toFixed(2)}`])}
        />

        <TableCard
          title="Kullanıcı Bazında"
          headers={['Kullanıcı', 'Protokol', 'Test', 'Tutar']}
          rows={stats.userList.map(([name, data]) => [name, data.protocols.size, data.services, `₺${data.amount.toFixed(2)}`])}
        />

        <TableCard
          title="Durum Bazında"
          headers={['Durum', 'Adet']}
          rows={stats.statusList.map(([name, count]) => [name, count])}
        />

        <TableCard
          title="Günlük Özet"
          headers={['Tarih', 'Hasta', 'Protokol', 'Test', 'Tutar', 'Tahsilat', 'Borç']}
          rows={stats.dailyList.map((d) => [
            d.date,
            d.patients.size,
            d.protocols.size,
            d.services,
            `₺${d.amount.toFixed(2)}`,
            `₺${d.paid.toFixed(2)}`,
            `₺${d.debt.toFixed(2)}`,
          ])}
        />
      </div>
    </div>
  )
}
