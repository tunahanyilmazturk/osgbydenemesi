import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Download, FileText, ShieldCheck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import type { AudiometryData, EyeExaminationData, ProtocolService } from '@/shared/types'
import { getSharedPdf, loadFromStorage } from '@/shared/lib/storage'
import { usePatients } from '@/state/PatientsContext'
import { useProtocols } from '@/state/ProtocolsContext'

interface InstitutionInfo { name?: string; address?: string; phone?: string; officialEmail?: string; logo?: string }

function uploadedPdf(service: ProtocolService) {
  if (service.pdfId) return getSharedPdf(service.pdfId)
  if (service.pdfData) return { data: service.pdfData, name: service.pdfName ?? 'Sonuç.pdf' }
  return null
}

export function PublicResult() {
  const { protocolNo = '' } = useParams()
  const { protocols } = useProtocols()
  const { patients } = usePatients()
  const institution = useMemo(() => loadFromStorage<InstitutionInfo>('cetka-institution', {}), [])
  const protocol = protocols.find((item) => item.protocolNo === protocolNo)
  const patient = patients.find((item) => item.id === protocol?.patientId)
  const approvedServices = protocol?.services.filter((service) => service.status === 'Onaylandı') ?? []
  const [openingId, setOpeningId] = useState<number | null>(null)

  useEffect(() => { document.title = protocol ? `${protocol.protocolNo} Sonuçları | ${institution.name || 'HanTech'}` : 'Sonuç Bulunamadı | HanTech' }, [protocol, institution.name])

  const openReport = async (service: ProtocolService) => {
    setOpeningId(service.id)
    try {
      const pdf = uploadedPdf(service)
      if (pdf) { window.open(pdf.data, '_blank', 'noopener,noreferrer'); return }
      if (!protocol || !patient) return
      if (service.audiometryData) {
        const { openAudiometryPdf } = await import('@/features/examinations/audiometry/lib/audiometryReport')
        await openAudiometryPdf({ patient, protocol, service, data: JSON.parse(service.audiometryData) as AudiometryData, recordedBy: service.recordedBy, approvedBy: service.approvedBy, approvedAt: service.approvedAt })
      } else if (service.eyeExaminationData) {
        const { openEyeExaminationPdf } = await import('@/features/examinations/eye-examination/lib/eyeExaminationReport')
        await openEyeExaminationPdf({ patient, protocol, service, data: JSON.parse(service.eyeExaminationData) as EyeExaminationData, recordedBy: service.recordedBy, approvedBy: service.approvedBy, approvedAt: service.approvedAt })
      }
    } finally { setOpeningId(null) }
  }

  if (!protocol || !patient) return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm"><FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" /><h1 className="text-xl font-bold text-slate-800">Sonuç bulunamadı</h1><p className="text-sm text-slate-500 mt-2">Protokol numarasını kontrol edin veya sağlık kuruluşunuzla iletişime geçin.</p></div></main>

  return <main className="min-h-screen bg-slate-50 py-8 px-4">
    <div className="max-w-4xl mx-auto space-y-4">
      <header className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden relative">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          {institution.logo ? <img src={institution.logo} alt={`${institution.name || 'Kurum'} logosu`} className="w-20 h-20 object-contain bg-white rounded-2xl p-2" /> : <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center"><ShieldCheck className="w-8 h-8" /></div>}
          <div><p className="text-xs font-semibold text-blue-300 uppercase tracking-widest">Elektronik Sağlık Sonucu</p><h1 className="text-2xl sm:text-3xl font-bold mt-1">{institution.name || 'Çet-Ka OSGB'}</h1><p className="text-sm text-slate-300 mt-2">Protokol No: <span className="font-mono text-white">{protocol.protocolNo}</span></p></div>
        </div>
      </header>

      <section className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5" aria-labelledby="patient-title"><h2 id="patient-title" className="font-bold text-slate-800">Hasta ve protokol bilgileri</h2><dl className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm"><div><dt className="text-xs text-slate-400">Hasta</dt><dd className="font-semibold text-slate-800 mt-1">{patient.name}</dd></div><div><dt className="text-xs text-slate-400">T.C. Kimlik No</dt><dd className="font-semibold text-slate-800 mt-1">{patient.tc ? `${patient.tc.slice(0, 3)}******${patient.tc.slice(-2)}` : '—'}</dd></div><div><dt className="text-xs text-slate-400">Protokol tarihi</dt><dd className="font-semibold text-slate-800 mt-1">{new Date(protocol.protocolDate).toLocaleDateString('tr-TR')}</dd></div><div><dt className="text-xs text-slate-400">Kurum</dt><dd className="font-semibold text-slate-800 mt-1">{protocol.company}</dd></div></dl></section>

      <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden" aria-labelledby="results-title"><div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><div><h2 id="results-title" className="font-bold text-slate-800">Onaylı tetkik sonuçları</h2><p className="text-xs text-slate-500 mt-1">Yalnızca uzman tarafından onaylanmış sonuçlar gösterilir.</p></div><span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">{approvedServices.length} sonuç</span></div>
        {approvedServices.length === 0 ? <div className="p-10 text-center"><FileText className="w-9 h-9 text-slate-300 mx-auto mb-3" /><p className="text-sm font-semibold text-slate-700">Onaylı sonuç henüz hazır değil</p><p className="text-xs text-slate-500 mt-1">Sonuçlar onaylandığında bu sayfada görüntülenecektir.</p></div> : <div className="divide-y divide-slate-100">{approvedServices.map((service) => { const hasReport = Boolean(uploadedPdf(service) || service.audiometryData || service.eyeExaminationData); return <article key={service.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4"><div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5" /></div><div className="flex-1 min-w-0"><h3 className="font-semibold text-slate-800">{service.name}</h3><p className="text-xs text-slate-500 mt-1">{service.resultText || service.result || 'Sonuç raporda yer almaktadır.'}</p><p className="text-[11px] text-slate-400 mt-1">Onaylayan: {service.approvedBy || 'Yetkili uzman'}{service.approvedAt ? ` · ${new Date(service.approvedAt).toLocaleString('tr-TR')}` : ''}</p></div>{hasReport && <button type="button" onClick={() => openReport(service)} disabled={openingId === service.id} className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 rounded-xl hover:bg-blue-100 disabled:opacity-50"><Download className="w-4 h-4" /> {openingId === service.id ? 'Hazırlanıyor…' : 'PDF Görüntüle'}</button>}</article>})}</div>}
      </section>
      <footer className="text-center text-xs text-slate-400 py-3"><p>{institution.address || ''}</p><p className="mt-1">{[institution.phone, institution.officialEmail].filter(Boolean).join(' · ')}</p></footer>
    </div>
  </main>
}
