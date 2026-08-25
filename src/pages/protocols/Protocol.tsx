import { useMemo } from 'react'
import { ArrowLeft, Edit2, Mail, Phone, Plus, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePatients } from '@/state/PatientsContext'
import { useProtocols } from '@/state/ProtocolsContext'
import { useConfirm } from '@/state/ConfirmContext'
import { PageHeader } from '@/shared/components/PageHeader'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { PatientAvatar } from '@/shared/components/ui/PatientAvatar'

export function Protocol() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { patients } = usePatients()
  const { protocols, removeProtocol } = useProtocols()
  const confirm = useConfirm()

  const patient = useMemo(
    () => patients.find((p) => p.id === Number(patientId)),
    [patients, patientId]
  )

  const patientProtocols = useMemo(
    () => protocols.filter((p) => p.patientId === Number(patientId)),
    [protocols, patientId]
  )

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Protokol Sil',
      message: 'Protokol kaydını silmek istediğinize emin misiniz?',
    })
    if (ok) {
      removeProtocol(id)
    }
  }

  if (!patient) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <p className="text-slate-600">Hasta bulunamadı.</p>
        <button
          onClick={() => navigate('/hasta-kayit')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          Listeye Dön
        </button>
      </div>
    )
  }

  return (
    <div className="viewport-page">
      <PageHeader
        title="Protokol Kartı"
        subtitle={`${patient.name} için protokol listesi.`}
        action={
          <button
            onClick={() => navigate(`/hasta-kayit/protokol/${patient.id}/yeni`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" />
            Yeni Protokol
          </button>
        }
      />

      {/* Patient identity card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          <PatientAvatar gender={patient.gender} name={patient.name} photoSrc={patient.photo} size="xl" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-800">{patient.name}</h2>
            <p className="text-sm text-slate-500">
              {patient.tc} — [{patient.id}]
            </p>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
              {patient.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-blue-500" />
                  {patient.phone}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-blue-500" />
                  {patient.email}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              <span>Cinsiyet: {patient.gender}</span>
              <span>
                Doğum: {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('tr-TR') : '-'}
              </span>
              <span>Firma: {patient.company || '-'}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 border-b border-slate-100">
          <button className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600 -mb-px">
            Kimlik Kartı
          </button>
          <button
            onClick={() => navigate(`/hasta-kayit/protokol/${patient.id}/yeni`)}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Yeni Protokol
          </button>
        </div>
      </div>

      {/* Protocol list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Protokol Listesi</h3>
          <span className="text-sm text-slate-500">
            Toplam <span className="font-semibold text-slate-800">{patientProtocols.length}</span> protokol
          </span>
        </div>
        <div className="surface-scroll">
          <table className="w-full text-left text-sm sticky-table-header">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Durum</th>
                <th className="px-6 py-3 font-medium">Tarih</th>
                <th className="px-6 py-3 font-medium">Protokol No</th>
                <th className="px-6 py-3 font-medium">Muayene Türü</th>
                <th className="px-6 py-3 font-medium">Firma</th>
                <th className="px-6 py-3 font-medium">Birimi</th>
                <th className="px-6 py-3 font-medium">Açıklama</th>
                <th className="px-6 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patientProtocols.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Henüz protokol oluşturulmamış.
                  </td>
                </tr>
              ) : (
                patientProtocols.map((protocol) => (
                  <tr
                    key={protocol.id}
                    onClick={() => navigate(`/hasta-kayit/protokol/${patient.id}/${protocol.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <StatusBadge status={protocol.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(protocol.protocolDate).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-800">{protocol.protocolNo}</td>
                    <td className="px-6 py-4 text-slate-600">{protocol.examType}</td>
                    <td className="px-6 py-4 text-slate-600">{protocol.company}</td>
                    <td className="px-6 py-4 text-slate-600">{protocol.department}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{protocol.description}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/hasta-kayit/protokol/${patient.id}/${protocol.id}`)
                          }}
                          className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Detay"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(protocol.id)
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
      </div>

      <button
        onClick={() => navigate('/hasta-kayit')}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Hasta Listesine Dön
      </button>
    </div>
  )
}
