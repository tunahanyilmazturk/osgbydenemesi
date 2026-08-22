import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Search, Trash2 } from 'lucide-react'
import { usePatients } from '../../context/PatientsContext'
import { useProtocols } from '../../context/ProtocolsContext'
import { useConfirm } from '../../context/ConfirmContext'
import { PageHeader } from '../../components/PageHeader'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Pagination } from '../../components/ui/Pagination'

type PatientTab = 'patients' | 'protocols'

export function Patients() {
  const navigate = useNavigate()
  const { patients, removePatient } = usePatients()
  const { protocols, removeProtocolsForPatient } = useProtocols()
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState<PatientTab>('patients')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tümü')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [protocolSearch, setProtocolSearch] = useState('')
  const [protocolStatusFilter, setProtocolStatusFilter] = useState('Tümü')
  const [protocolPage, setProtocolPage] = useState(1)
  const [protocolPageSize, setProtocolPageSize] = useState(10)

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    setProtocolPage(1)
  }, [protocolSearch, protocolStatusFilter])

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const term = search.trim().toLowerCase()
      const matchesSearch =
        term === '' ||
        p.name.toLowerCase().includes(term) ||
        p.tc.includes(search) ||
        p.phone.includes(search) ||
        p.email.toLowerCase().includes(term) ||
        p.company.toLowerCase().includes(term)

      const matchesStatus =
        statusFilter === 'Tümü' || p.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [patients, search, statusFilter])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredPatients.length / pageSize)), [filteredPatients, pageSize])

  const paginatedPatients = useMemo(
    () => filteredPatients.slice((page - 1) * pageSize, page * pageSize),
    [filteredPatients, page, pageSize]
  )

  const filteredProtocols = useMemo(() => {
    return protocols
      .map((protocol) => {
        const patient = patients.find((p) => p.id === protocol.patientId)
        return { ...protocol, patientName: patient?.name ?? '—', patientTc: patient?.tc ?? '—' }
      })
      .filter((protocol) => {
        const term = protocolSearch.trim().toLowerCase()
        const matchesSearch =
          term === '' ||
          protocol.protocolNo.toLowerCase().includes(term) ||
          protocol.patientName.toLowerCase().includes(term) ||
          protocol.patientTc.includes(protocolSearch) ||
          protocol.company.toLowerCase().includes(term)

        const matchesStatus =
          protocolStatusFilter === 'Tümü' || protocol.status === protocolStatusFilter

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => new Date(b.protocolDate).getTime() - new Date(a.protocolDate).getTime())
  }, [protocols, patients, protocolSearch, protocolStatusFilter])

  const totalProtocolPages = useMemo(() => Math.max(1, Math.ceil(filteredProtocols.length / protocolPageSize)), [filteredProtocols, protocolPageSize])

  const paginatedProtocols = useMemo(
    () => filteredProtocols.slice((protocolPage - 1) * protocolPageSize, protocolPage * protocolPageSize),
    [filteredProtocols, protocolPage, protocolPageSize]
  )

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: 'Hasta Sil',
      message: `"${name}" hasta kaydını ve bu hastaya bağlı protokolleri silmek istediğinize emin misiniz?`,
    })
    if (ok) {
      removeProtocolsForPatient(id)
      removePatient(id)
    }
  }

  const openPatient = (id: number) => {
    navigate(`/hasta-kayit/protokol/${id}`)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredPatients.length === 1) {
      openPatient(filteredPatients[0].id)
    }
  }

  const openProtocol = (patientId: number, protocolId: number) => {
    navigate(`/hasta-kayit/protokol/${patientId}/${protocolId}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hasta Kayıt Kabul"
        subtitle={
          activeTab === 'patients'
            ? 'Hasta kayıtlarını görüntüleyin, arayın ve yeni kayıtlar ekleyin.'
            : 'Açılan tüm protokolleri durum bazında takip edin.'
        }
        action={
          <button
            onClick={() => navigate('/hasta-kayit/yeni')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" />
            Yeni Hasta
          </button>
        }
      />

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex gap-1 w-fit">
        <button
          onClick={() => setActiveTab('patients')}
          className={`px-4 py-2 text-xs font-medium rounded-xl transition-colors ${
            activeTab === 'patients'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Hastalar
        </button>
        <button
          onClick={() => setActiveTab('protocols')}
          className={`px-4 py-2 text-xs font-medium rounded-xl transition-colors ${
            activeTab === 'protocols'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Protokol Listesi
        </button>
      </div>

      {activeTab === 'patients' ? (
        <>
          {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="İsim, telefon, TC veya firma ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              label=""
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'Tümü', label: 'Tüm Durumlar' },
                { value: 'Bekliyor', label: 'Bekliyor' },
                { value: 'Tamamlandı', label: 'Tamamlandı' },
                { value: 'Sonuç Bekleniyor', label: 'Sonuç Bekleniyor' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Hasta</th>
                <th className="px-6 py-4 font-medium">TC Kimlik No</th>
                <th className="px-6 py-4 font-medium">Firma</th>
                <th className="px-6 py-4 font-medium">Tür</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium">Son İşlem</th>
                <th className="px-6 py-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Arama kriterlerine uygun hasta bulunamadı.
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => openPatient(patient.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{patient.name}</div>
                      <div className="text-xs text-slate-500">{patient.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono">{patient.tc}</td>
                    <td className="px-6 py-4 text-slate-600">{patient.company}</td>
                    <td className="px-6 py-4 text-slate-600">{patient.type}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={patient.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-500">{patient.time}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/hasta-kayit/protokol/${patient.id}`)
                          }}
                          className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Protokol Kartı"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(patient.id, patient.name)
                          }}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500 bg-slate-50">
          <div className="flex items-center gap-2">
            <span>Sayfa başına</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            >
              {[10, 25, 50, 100].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <span>
            {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredPatients.length)} / {filteredPatients.length}
          </span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
        </>
      ) : (
        <>
          {/* Protocol filters */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Protokol no, hasta adı veya firma ara..."
                  value={protocolSearch}
                  onChange={(e) => setProtocolSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
              <div className="w-full md:w-48">
                <Select
                  label=""
                  value={protocolStatusFilter}
                  onChange={(e) => setProtocolStatusFilter(e.target.value)}
                  options={[
                    { value: 'Tümü', label: 'Tüm Durumlar' },
                    { value: 'Bekliyor', label: 'Bekliyor' },
                    { value: 'Sonuç Bekleniyor', label: 'Sonuç Bekleniyor' },
                    { value: 'Tamamlandı', label: 'Tamamlandı' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Protocols table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-fixed w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium w-28">Protokol No</th>
                    <th className="px-3 py-2 font-medium">Hasta</th>
                    <th className="px-3 py-2 font-medium w-28">Firma</th>
                    <th className="px-3 py-2 font-medium w-28">Muayene</th>
                    <th className="px-3 py-2 font-medium w-24">Durum</th>
                    <th className="px-3 py-2 font-medium w-28">Tarih</th>
                    <th className="px-3 py-2 font-medium text-right w-20">Tutar</th>
                    <th className="px-3 py-2 font-medium text-right w-16">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedProtocols.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        Arama kriterlerine uygun protokol bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    paginatedProtocols.map((protocol) => (
                      <tr
                        key={protocol.id}
                        onClick={() => openProtocol(protocol.patientId, protocol.id)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-2 font-mono text-slate-600 truncate">{protocol.protocolNo}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-800 truncate" title={protocol.patientName}>{protocol.patientName}</div>
                          <div className="text-[10px] text-slate-500 truncate">{protocol.patientTc}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-600 truncate" title={protocol.company}>{protocol.company}</td>
                        <td className="px-3 py-2 text-slate-600 truncate" title={protocol.examType}>{protocol.examType}</td>
                        <td className="px-3 py-2 align-middle">
                          <StatusBadge status={protocol.status} />
                        </td>
                        <td className="px-3 py-2 text-slate-600 truncate">
                          {new Date(protocol.protocolDate).toLocaleString('tr-TR')}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">
                          ₺{protocol.services.reduce((sum, s) => sum + s.totalPrice, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openProtocol(protocol.patientId, protocol.id)
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Protokol Detay"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
              <div className="flex items-center gap-2">
                <span>Sayfa başına</span>
                <select
                  value={protocolPageSize}
                  onChange={(e) => { setProtocolPageSize(Number(e.target.value)); setProtocolPage(1) }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] focus:outline-none focus:border-blue-500"
                >
                  {[10, 25, 50, 100].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <span>
                {(protocolPage - 1) * protocolPageSize + 1}-{Math.min(protocolPage * protocolPageSize, filteredProtocols.length)} / {filteredProtocols.length}
              </span>
              <Pagination page={protocolPage} totalPages={totalProtocolPages} onPageChange={setProtocolPage} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
