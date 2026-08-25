import { useMemo, useState } from 'react'
import { Activity, BriefcaseBusiness, Building2, CheckCircle2, ClipboardCheck, Copy, FileHeart, HeartPulse, Save, Sparkles } from 'lucide-react'
import { Modal } from '@/shared/components/ui/Modal'
import { PatientAvatar } from '@/shared/components/ui/PatientAvatar'
import { loadDoctors } from '@/shared/lib/doctors'
import { applyEk2AutomaticValues, buildEk2AutomaticValues } from '@/features/examinations/ek2/lib/ek2AutoFill'
import { EK2_DISEASES, EK2_NARRATIVE_FIELDS, EK2_PHYSICAL_FIELDS, EK2_SYMPTOMS, loadEk2Settings } from '@/features/examinations/ek2/lib/ek2Settings'
import type { Company } from '@/state/CompaniesContext'
import type { Ek2Data, Ek2MedicalAnswer, PatientDetail, Protocol, ProtocolService } from '@/shared/types'

interface Ek2ModalProps {
  isOpen: boolean
  onClose: () => void
  service: ProtocolService | null
  patient: PatientDetail | null | undefined
  protocol: Protocol | null
  company?: Company
  previousData?: Ek2Data
  sourceServices: ProtocolService[]
  onSave: (data: string, resultText: string, complete: boolean) => void
}

const SYMPTOMS = EK2_SYMPTOMS
const DISEASES = EK2_DISEASES
const NARRATIVE_QUESTIONS = EK2_NARRATIVE_FIELDS
const PHYSICAL_FIELDS = EK2_PHYSICAL_FIELDS
const LAB_FIELDS = [
  ['blood', 'Kan analizleri'], ['urine', 'İdrar analizleri'], ['radiology', 'Radyolojik analizler'],
  ['audiometry', 'Odyometri'], ['sft', 'Solunum fonksiyon testi'], ['eye', 'Göz muayenesi'],
  ['psychological', 'Psikolojik testler'], ['other', 'Diğer'],
] as const
const SECTIONS = [
  { id: 'identity', label: 'Kişi ve İşyeri', icon: Building2 },
  { id: 'history', label: 'Çalışma ve Özgeçmiş', icon: BriefcaseBusiness },
  { id: 'anamnesis', label: 'Tıbbi Anamnez', icon: FileHeart },
  { id: 'habits', label: 'Alışkanlıklar', icon: Activity },
  { id: 'examination', label: 'Fizik Muayene', icon: HeartPulse },
  { id: 'conclusion', label: 'Bulgular ve Sonuç', icon: ClipboardCheck },
] as const

type SectionId = typeof SECTIONS[number]['id']
const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500'

function emptyAnswer(): Ek2MedicalAnswer { return { answer: '', note: '' } }
function uid() { return `work-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

function createInitialData(patient?: PatientDetail | null, protocol?: Protocol | null, company?: Company): Ek2Data {
  const doctor = loadDoctors().find((item) => item.testType.toLocaleUpperCase('tr-TR').includes('EK-2'))
  const settings = loadEk2Settings()
  const answers: Record<string, Ek2MedicalAnswer> = {}
  ;[...SYMPTOMS, ...DISEASES].forEach(([key]) => { answers[key] = settings.anamnesisDefaults[key] ?? emptyAnswer() })
  return {
    version: 1,
    reportDate: new Date().toISOString().slice(0, 10),
    examinationReason: protocol?.examType.toLocaleLowerCase('tr-TR').includes('periyodik') ? 'Periyodik' : 'İşe Giriş',
    workplace: { title: company?.name ?? protocol?.company ?? '', sgkNumber: company?.sgkNumber ?? '', address: company?.address ?? '', phone: company?.phone ?? '', fax: '', email: company?.email ?? '' },
    employee: {
      fullName: patient?.name ?? '', tc: patient?.tc ?? '', birthPlace: '', birthDate: patient?.birthDate ?? '', gender: patient?.gender ?? '',
      education: '', maritalStatus: '', childCount: '', address: patient?.address ?? '', phone: patient?.phone ?? '', email: patient?.email ?? '',
      occupation: protocol?.occupation ?? '', jobDescription: protocol?.description ?? '', department: protocol?.department ?? '',
    },
    workHistory: [{ id: uid(), workplace: '', sector: '', job: '', startDate: '', endDate: '' }],
    personalHistory: '', bloodGroup: '', chronicDiseases: '',
    immunization: { tetanus: '', hepatitis: '', other: '' }, familyHistory: { mother: '', father: '', sibling: '', child: '' },
    medicalAnswers: answers, narrativeAnswers: { ...settings.narrativeDefaults },
    smoking: { status: 'Kullanmıyor', startDate: '', endDate: '', dailyAmount: '' },
    alcohol: { status: 'Kullanmıyor', startDate: '', endDate: '', frequency: '' },
    physicalExamination: Object.fromEntries(PHYSICAL_FIELDS.map(([key]) => [key, settings.autoFillPhysicalExamination ? settings.physicalExaminationDefaults[key] ?? '' : ''])),
    measurements: { bloodPressure: '', pulse: '', height: '', weight: '', bmi: '' },
    laboratoryFindings: Object.fromEntries(LAB_FIELDS.map(([key]) => [key, ''])),
    opinion: settings.defaultOpinion, conditions: settings.defaultConditions, conclusion: settings.defaultConclusion, doctorId: doctor?.id ?? '',
    doctorName: doctor ? `${doctor.title} ${doctor.name}`.trim() : '', status: 'Taslak', updatedAt: new Date().toISOString(),
  }
}

function parseData(service: ProtocolService | null, patient?: PatientDetail | null, protocol?: Protocol | null, company?: Company): Ek2Data {
  const fallback = createInitialData(patient, protocol, company)
  if (!service?.ek2Data) return fallback
  try {
    const saved = JSON.parse(service.ek2Data) as Partial<Ek2Data>
    return {
      ...fallback, ...saved,
      workplace: { ...fallback.workplace, ...saved.workplace }, employee: { ...fallback.employee, ...saved.employee },
      immunization: { ...fallback.immunization, ...saved.immunization }, familyHistory: { ...fallback.familyHistory, ...saved.familyHistory },
      smoking: { ...fallback.smoking, ...saved.smoking }, alcohol: { ...fallback.alcohol, ...saved.alcohol },
      measurements: { ...fallback.measurements, ...saved.measurements }, medicalAnswers: { ...fallback.medicalAnswers, ...saved.medicalAnswers },
      narrativeAnswers: { ...fallback.narrativeAnswers, ...saved.narrativeAnswers }, physicalExamination: { ...fallback.physicalExamination, ...saved.physicalExamination },
      laboratoryFindings: { ...fallback.laboratoryFindings, ...saved.laboratoryFindings }, workHistory: saved.workHistory?.length ? saved.workHistory : fallback.workHistory,
    }
  } catch { return fallback }
}

function Field({ label, value, onChange, type = 'text', placeholder, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; readOnly?: boolean }) {
  return <label><span className={labelClass}>{label}</span><input type={type} value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${inputClass} ${readOnly ? 'cursor-default bg-slate-100 text-slate-500' : ''}`} /></label>
}

function TextArea({ label, value, onChange, placeholder, rows = 2 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return <label><span className={labelClass}>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className={`${inputClass} resize-none`} /></label>
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-3"><h4 className="text-xs font-bold text-slate-800">{title}</h4>{subtitle && <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p>}</div>{children}</section>
}

export function Ek2Modal({ isOpen, onClose, service, patient, protocol, company, previousData, sourceServices, onSave }: Ek2ModalProps) {
  const automaticValues = useMemo(() => buildEk2AutomaticValues(sourceServices), [sourceServices])
  const ek2Settings = useMemo(() => loadEk2Settings(), [])
  const [data, setData] = useState<Ek2Data>(() => applyEk2AutomaticValues(parseData(service, patient, protocol, company), automaticValues))
  const [selectedOpinionId, setSelectedOpinionId] = useState('')
  const [activeSection, setActiveSection] = useState<SectionId>('identity')
  const [validationMessage, setValidationMessage] = useState('')
  const doctors = useMemo(() => loadDoctors(), [])

  const completedAnswers = Object.values(data.medicalAnswers).filter((answer) => answer.answer).length
  const completion = Math.round((completedAnswers / Math.max(1, Object.keys(data.medicalAnswers).length)) * 45 + (data.employee.fullName && data.employee.tc ? 20 : 0) + (data.workplace.title ? 10 : 0) + (Object.values(data.physicalExamination).filter(Boolean).length / PHYSICAL_FIELDS.length) * 15 + (data.conclusion !== 'Değerlendirme Bekliyor' ? 10 : 0))

  const updateEmployee = (key: keyof Ek2Data['employee'], value: string) => setData((previous) => ({ ...previous, employee: { ...previous.employee, [key]: value } }))
  const updateWorkplace = (key: keyof Ek2Data['workplace'], value: string) => setData((previous) => ({ ...previous, workplace: { ...previous.workplace, [key]: value } }))
  const updateMedical = (key: string, patch: Partial<Ek2MedicalAnswer>) => setData((previous) => ({ ...previous, medicalAnswers: { ...previous.medicalAnswers, [key]: { ...(previous.medicalAnswers[key] ?? emptyAnswer()), ...patch } } }))
  const calculateBmi = (height: string, weight: string) => {
    const heightMeters = Number(height) / 100
    return heightMeters > 0 && Number(weight) > 0 ? (Number(weight) / (heightMeters * heightMeters)).toFixed(1) : ''
  }

  const quickFillNormal = () => setData((previous) => ({
    ...previous,
    medicalAnswers: Object.fromEntries(Object.keys(previous.medicalAnswers).map((key) => [key, { answer: ek2Settings.anamnesisDefaults[key]?.answer || 'Hayır', note: ek2Settings.anamnesisDefaults[key]?.note ?? '' }])),
    narrativeAnswers: { ...previous.narrativeAnswers, ...ek2Settings.narrativeDefaults },
    physicalExamination: ek2Settings.autoFillPhysicalExamination ? { ...ek2Settings.physicalExaminationDefaults } : previous.physicalExamination,
    opinion: ek2Settings.defaultOpinion || 'Yapılan işe giriş/periyodik muayene ve tetkikler sonucunda çalışanın sağlık açısından değerlendirmesi tamamlanmıştır.',
    conditions: ek2Settings.defaultConditions,
    conclusion: ek2Settings.defaultConclusion === 'Değerlendirme Bekliyor' ? 'Çalışmaya Uygundur' : ek2Settings.defaultConclusion,
    status: 'Taslak',
  }))

  const save = (complete: boolean) => {
    setValidationMessage('')
    if (!data.employee.fullName.trim() || data.employee.tc.replace(/\D/g, '').length !== 11) {
      setActiveSection('identity')
      setValidationMessage('Hasta adı ve 11 haneli T.C. Kimlik No zorunludur.')
      return
    }
    if (complete && Object.values(data.medicalAnswers).some((answer) => !answer.answer)) {
      setActiveSection('anamnesis')
      setValidationMessage('Raporu tamamlamak için anamnez sorularının tamamını işaretleyin.')
      return
    }
    if (complete && data.conclusion === 'Değerlendirme Bekliyor') {
      setActiveSection('conclusion')
      setValidationMessage('Raporu tamamlamak için hekim sonucunu seçin.')
      return
    }
    const updated: Ek2Data = { ...data, status: complete ? 'Tamamlandı' : 'Taslak', updatedAt: new Date().toISOString() }
    setData(updated)
    const result = complete ? updated.conclusion : 'EK-2 taslak kaydedildi'
    onSave(JSON.stringify(updated), result, complete)
  }

  const renderQuestions = (questions: ReadonlyArray<readonly [string, string]>) => (
    <div className="divide-y divide-slate-100">
      {questions.map(([key, label], index) => {
        const answer = data.medicalAnswers[key] ?? emptyAnswer()
        return <div key={key} className="grid gap-2 py-2 sm:grid-cols-[24px_minmax(190px,1fr)_150px_minmax(160px,1fr)] sm:items-center">
          <span className="text-[10px] font-bold text-slate-400">{index + 1}</span><p className="text-[11px] font-medium text-slate-700">{label}</p>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(['Hayır', 'Evet'] as const).map((option) => <button type="button" key={option} onClick={() => updateMedical(key, { answer: option })} className={`flex-1 rounded-md px-2 py-1 text-[10px] font-semibold ${answer.answer === option ? option === 'Evet' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-white'}`}>{option}</button>)}
          </div>
          <input value={answer.note} onChange={(event) => updateMedical(key, { note: event.target.value })} placeholder="Açıklama / tarih" className={inputClass} />
        </div>
      })}
    </div>
  )

  return <Modal isOpen={isOpen} onClose={onClose} title="EK-2 Sağlık Raporu" size="2xl" subtitle={<div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${data.status === 'Tamamlandı' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{data.status}</span><span className="text-[10px] text-slate-500">Protokol {protocol?.protocolNo}</span></div>}>
    <div className="flex h-[76vh] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3"><PatientAvatar gender={patient?.gender} name={patient?.name} photoSrc={patient?.photo} size="lg" className="ring-white/20" /><div className="min-w-0"><p className="truncate text-sm font-bold">{patient?.name}</p><p className="mt-0.5 text-[10px] text-slate-300">T.C. {patient?.tc || '-'} · {patient?.gender || '-'} · {patient?.birthDate || '-'}</p><p className="mt-0.5 truncate text-[10px] text-blue-200">{protocol?.company} · {protocol?.department || 'Bölüm belirtilmemiş'}</p></div></div>
        <div className="flex items-center gap-2"><div className="hidden text-right sm:block"><p className="text-[10px] text-slate-300">Form tamamlanma</p><p className="text-sm font-bold">%{Math.min(100, completion)}</p></div><div className="h-9 w-24 overflow-hidden rounded-full bg-white/10 p-1"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${Math.min(100, completion)}%` }} /></div></div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-48 shrink-0 border-r border-slate-200 bg-white p-2 lg:block">
          <p className="px-2 pb-2 pt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">Rapor Bölümleri</p>
          <nav className="space-y-1">{SECTIONS.map((section, index) => { const Icon = section.icon; return <button type="button" key={section.id} onClick={() => setActiveSection(section.id)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-medium ${activeSection === section.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}><span className={`flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold ${activeSection === section.id ? 'bg-white/20' : 'bg-slate-100'}`}>{index + 1}</span><Icon className="h-3.5 w-3.5" />{section.label}</button> })}</nav>
          <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3"><button type="button" onClick={quickFillNormal} className="flex w-full items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-left text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"><Sparkles className="h-3.5 w-3.5" />Normal bulgularla doldur</button>{previousData && <button type="button" onClick={() => setData(applyEk2AutomaticValues({ ...previousData, reportDate: new Date().toISOString().slice(0, 10), status: 'Taslak', updatedAt: new Date().toISOString() }, automaticValues))} className="flex w-full items-center gap-2 rounded-lg bg-violet-50 px-2.5 py-2 text-left text-[10px] font-semibold text-violet-700 hover:bg-violet-100"><Copy className="h-3.5 w-3.5" />Önceki raporu kopyala</button>}</div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-3">
          <div className="mb-3 flex gap-1 overflow-x-auto lg:hidden">{SECTIONS.map((section) => <button type="button" key={section.id} onClick={() => setActiveSection(section.id)} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${activeSection === section.id ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{section.label}</button>)}</div>

          {activeSection === 'identity' && <div className="space-y-3"><Card title="Rapor Bilgileri" subtitle="Muayene türü ve rapor tarihi"><div className="grid gap-3 md:grid-cols-3"><Field label="Rapor Tarihi" type="date" value={data.reportDate} onChange={(reportDate) => setData((previous) => ({ ...previous, reportDate }))} /><label><span className={labelClass}>Muayene Nedeni</span><select value={data.examinationReason} onChange={(event) => setData((previous) => ({ ...previous, examinationReason: event.target.value as Ek2Data['examinationReason'] }))} className={inputClass}>{['İşe Giriş','Periyodik','İş Değişikliği','İşe Dönüş','Diğer'].map((value) => <option key={value}>{value}</option>)}</select></label><Field label="Protokol No" value={protocol?.protocolNo ?? ''} onChange={() => {}} readOnly /></div></Card>
            <Card title="İşyeri Bilgileri" subtitle="Firma tanımından otomatik getirildi; rapora özel değiştirilebilir."><div className="grid gap-3 md:grid-cols-2"><Field label="İşyeri Unvanı" value={data.workplace.title} onChange={(value) => updateWorkplace('title', value)} /><Field label="SGK Sicil No" value={data.workplace.sgkNumber} onChange={(value) => updateWorkplace('sgkNumber', value)} /><div className="md:col-span-2"><Field label="Adres" value={data.workplace.address} onChange={(value) => updateWorkplace('address', value)} /></div><Field label="Telefon" value={data.workplace.phone} onChange={(value) => updateWorkplace('phone', value)} /><Field label="Faks" value={data.workplace.fax} onChange={(value) => updateWorkplace('fax', value)} /><Field label="E-posta" value={data.workplace.email} onChange={(value) => updateWorkplace('email', value)} /></div></Card>
            <Card title="Çalışanın Kimlik ve İletişim Bilgileri"><div className="grid gap-3 md:grid-cols-3"><Field label="Adı Soyadı *" value={data.employee.fullName} onChange={(value) => updateEmployee('fullName', value)} /><Field label="T.C. Kimlik No *" value={data.employee.tc} onChange={(value) => updateEmployee('tc', value.replace(/\D/g, '').slice(0, 11))} /><Field label="Cinsiyet" value={data.employee.gender} onChange={(value) => updateEmployee('gender', value)} /><Field label="Doğum Yeri" value={data.employee.birthPlace} onChange={(value) => updateEmployee('birthPlace', value)} /><Field label="Doğum Tarihi" type="date" value={data.employee.birthDate} onChange={(value) => updateEmployee('birthDate', value)} /><Field label="Eğitim Durumu" value={data.employee.education} onChange={(value) => updateEmployee('education', value)} /><Field label="Medeni Durum" value={data.employee.maritalStatus} onChange={(value) => updateEmployee('maritalStatus', value)} /><Field label="Çocuk Sayısı" type="number" value={data.employee.childCount} onChange={(value) => updateEmployee('childCount', value)} /><Field label="Telefon" value={data.employee.phone} onChange={(value) => updateEmployee('phone', value)} /><Field label="E-posta" value={data.employee.email} onChange={(value) => updateEmployee('email', value)} /><div className="md:col-span-2"><Field label="Ev Adresi" value={data.employee.address} onChange={(value) => updateEmployee('address', value)} /></div><Field label="Mesleği" value={data.employee.occupation} onChange={(value) => updateEmployee('occupation', value)} /><Field label="Çalıştığı Bölüm" value={data.employee.department} onChange={(value) => updateEmployee('department', value)} /><div className="md:col-span-3"><Field label="Yaptığı İş (Ayrıntılı)" value={data.employee.jobDescription} onChange={(value) => updateEmployee('jobDescription', value)} /></div></div></Card></div>}

          {activeSection === 'history' && <div className="space-y-3"><Card title="Önceki Çalışma Geçmişi" subtitle="İş sağlığı değerlendirmesine esas önceki görevler"><div className="space-y-2">{data.workHistory.map((row, index) => <div key={row.id} className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 md:grid-cols-[24px_1fr_1fr_1fr_120px_120px_30px]"><span className="pt-2 text-[10px] font-bold text-slate-400">{index + 1}</span>{(['workplace','sector','job','startDate','endDate'] as const).map((key) => <input key={key} type={key.includes('Date') ? 'date' : 'text'} value={row[key]} onChange={(event) => setData((previous) => ({ ...previous, workHistory: previous.workHistory.map((item) => item.id === row.id ? { ...item, [key]: event.target.value } : item) }))} placeholder={{workplace:'Çalıştığı yer',sector:'İşkolu',job:'Yaptığı iş',startDate:'',endDate:''}[key]} className={inputClass} />)}<button type="button" onClick={() => setData((previous) => ({ ...previous, workHistory: previous.workHistory.filter((item) => item.id !== row.id) }))} className="text-slate-300 hover:text-red-500">×</button></div>)}<button type="button" onClick={() => setData((previous) => ({ ...previous, workHistory: [...previous.workHistory, { id: uid(), workplace: '', sector: '', job: '', startDate: '', endDate: '' }] }))} className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">+ Çalışma geçmişi satırı ekle</button></div></Card>
            <Card title="Özgeçmiş ve Bağışıklama"><div className="grid gap-3 md:grid-cols-2"><TextArea label="Özgeçmiş" value={data.personalHistory} onChange={(personalHistory) => setData((previous) => ({ ...previous, personalHistory }))} /><div className="space-y-3"><Field label="Kan Grubu" value={data.bloodGroup} onChange={(bloodGroup) => setData((previous) => ({ ...previous, bloodGroup }))} /><Field label="Konjenital / Kronik Hastalıklar" value={data.chronicDiseases} onChange={(chronicDiseases) => setData((previous) => ({ ...previous, chronicDiseases }))} /></div><Field label="Tetanoz" value={data.immunization.tetanus} onChange={(value) => setData((previous) => ({ ...previous, immunization: { ...previous.immunization, tetanus: value } }))} /><Field label="Hepatit" value={data.immunization.hepatitis} onChange={(value) => setData((previous) => ({ ...previous, immunization: { ...previous.immunization, hepatitis: value } }))} /><div className="md:col-span-2"><Field label="Diğer Bağışıklamalar" value={data.immunization.other} onChange={(value) => setData((previous) => ({ ...previous, immunization: { ...previous.immunization, other: value } }))} /></div></div></Card>
            <Card title="Soygeçmiş"><div className="grid gap-3 md:grid-cols-4">{([['mother','Anne'],['father','Baba'],['sibling','Kardeş'],['child','Çocuk']] as const).map(([key,label]) => <TextArea key={key} label={label} value={data.familyHistory[key]} onChange={(value) => setData((previous) => ({ ...previous, familyHistory: { ...previous.familyHistory, [key]: value } }))} />)}</div></Card></div>}

          {activeSection === 'anamnesis' && <div className="space-y-3"><Card title="Yakınmalar" subtitle="Her maddeyi Evet/Hayır olarak işaretleyin; gerekiyorsa açıklama ekleyin.">{renderQuestions(SYMPTOMS)}</Card><Card title="Geçirilen Hastalıklar">{renderQuestions(DISEASES)}</Card><Card title="Diğer Tıbbi Geçmiş"><div className="grid gap-3 md:grid-cols-2">{NARRATIVE_QUESTIONS.map(([key,label]) => <TextArea key={key} label={label} value={data.narrativeAnswers[key] ?? ''} onChange={(value) => setData((previous) => ({ ...previous, narrativeAnswers: { ...previous.narrativeAnswers, [key]: value } }))} />)}</div></Card></div>}

          {activeSection === 'habits' && <div className="grid gap-3 lg:grid-cols-2"><Card title="Sigara Kullanımı"><div className="space-y-3"><label><span className={labelClass}>Durumu</span><select value={data.smoking.status} onChange={(event) => setData((previous) => ({ ...previous, smoking: { ...previous.smoking, status: event.target.value } }))} className={inputClass}>{['Kullanmıyor','Kullanıyor','Bırakmış'].map((value) => <option key={value}>{value}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><Field label="Başlama Tarihi" type="date" value={data.smoking.startDate} onChange={(value) => setData((previous) => ({ ...previous, smoking: { ...previous.smoking, startDate: value } }))} /><Field label="Bitiş Tarihi" type="date" value={data.smoking.endDate} onChange={(value) => setData((previous) => ({ ...previous, smoking: { ...previous.smoking, endDate: value } }))} /></div><Field label="Günlük Adet" type="number" value={data.smoking.dailyAmount} onChange={(value) => setData((previous) => ({ ...previous, smoking: { ...previous.smoking, dailyAmount: value } }))} /></div></Card><Card title="Alkol Kullanımı"><div className="space-y-3"><label><span className={labelClass}>Durumu</span><select value={data.alcohol.status} onChange={(event) => setData((previous) => ({ ...previous, alcohol: { ...previous.alcohol, status: event.target.value } }))} className={inputClass}>{['Kullanmıyor','Kullanıyor','Bırakmış'].map((value) => <option key={value}>{value}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><Field label="Başlama Tarihi" type="date" value={data.alcohol.startDate} onChange={(value) => setData((previous) => ({ ...previous, alcohol: { ...previous.alcohol, startDate: value } }))} /><Field label="Bitiş Tarihi" type="date" value={data.alcohol.endDate} onChange={(value) => setData((previous) => ({ ...previous, alcohol: { ...previous.alcohol, endDate: value } }))} /></div><Field label="Kullanım Sıklığı" value={data.alcohol.frequency} onChange={(value) => setData((previous) => ({ ...previous, alcohol: { ...previous.alcohol, frequency: value } }))} /></div></Card></div>}

          {activeSection === 'examination' && <div className="space-y-3"><Card title="Vital Bulgular ve Ölçümler"><div className="grid gap-3 md:grid-cols-5"><Field label="Tansiyon" value={data.measurements.bloodPressure} onChange={(value) => setData((previous) => ({ ...previous, measurements: { ...previous.measurements, bloodPressure: value } }))} placeholder="120/80" /><Field label="Nabız" value={data.measurements.pulse} onChange={(value) => setData((previous) => ({ ...previous, measurements: { ...previous.measurements, pulse: value } }))} /><Field label="Boy (cm)" type="number" value={data.measurements.height} onChange={(value) => setData((previous) => ({ ...previous, measurements: { ...previous.measurements, height: value, bmi: calculateBmi(value, previous.measurements.weight) } }))} /><Field label="Kilo (kg)" type="number" value={data.measurements.weight} onChange={(value) => setData((previous) => ({ ...previous, measurements: { ...previous.measurements, weight: value, bmi: calculateBmi(previous.measurements.height, value) } }))} /><Field label="VKİ" value={data.measurements.bmi} onChange={(value) => setData((previous) => ({ ...previous, measurements: { ...previous.measurements, bmi: value } }))} /></div></Card><Card title="Sistem Muayeneleri"><div className="grid gap-3 md:grid-cols-2">{PHYSICAL_FIELDS.map(([key,label]) => <TextArea key={key} label={label} value={data.physicalExamination[key] ?? ''} onChange={(value) => setData((previous) => ({ ...previous, physicalExamination: { ...previous.physicalExamination, [key]: value } }))} placeholder="Muayene bulgusu" />)}</div></Card></div>}

          {activeSection === 'conclusion' && <div className="space-y-3">
            <Card title="Laboratuvar ve Tetkik Bulguları" subtitle={automaticValues.sourceCount > 0 ? `${automaticValues.sourceCount} sonuçlu tetkik hasta kayıtlarından otomatik aktarıldı; alanlar düzenlenebilir.` : 'Henüz aktarılabilecek sonuçlu tetkik bulunamadı.'}><div className="grid gap-3 md:grid-cols-2">{LAB_FIELDS.map(([key,label]) => <TextArea key={key} label={label} value={data.laboratoryFindings[key] ?? ''} onChange={(value) => setData((previous) => ({ ...previous, laboratoryFindings: { ...previous.laboratoryFindings, [key]: value } }))} />)}</div></Card>
            <Card title="Hekim Kanaati ve Sonuç"><div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label><span className={labelClass}>Hazır Kanaat</span><select value={selectedOpinionId} onChange={(event) => { const template = ek2Settings.opinionTemplates.find((item) => item.id === event.target.value); setSelectedOpinionId(event.target.value); if (template) setData((previous) => ({ ...previous, opinion: template.title })) }} className={inputClass}><option value="">Kanaat seçin</option>{ek2Settings.opinionTemplates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}</select></label>
                <label><span className={labelClass}>Hazır Çalışma Koşulu</span><select value="" disabled={!selectedOpinionId} onChange={(event) => { const condition = event.target.value; if (!condition) return; setData((previous) => ({ ...previous, conditions: [previous.conditions.trim(), condition].filter(Boolean).join('\n') })) }} className={inputClass}><option value="">Koşul ekleyin</option>{ek2Settings.opinionTemplates.find((item) => item.id === selectedOpinionId)?.conditions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}</select></label>
              </div>
              <TextArea label="Kanaat" rows={3} value={data.opinion} onChange={(opinion) => setData((previous) => ({ ...previous, opinion }))} />
              <TextArea label="Çalışma Koşulları / Kısıtlamalar" value={data.conditions} onChange={(conditions) => setData((previous) => ({ ...previous, conditions }))} placeholder="Varsa süre, kontrol tarihi, KKD veya görev kısıtı" />
              <div className="grid gap-3 md:grid-cols-2"><label><span className={labelClass}>Sonuç</span><select value={data.conclusion} onChange={(event) => setData((previous) => ({ ...previous, conclusion: event.target.value as Ek2Data['conclusion'] }))} className={inputClass}>{['Değerlendirme Bekliyor','Çalışmaya Uygundur','Şartlı Uygundur','Çalışmaya Uygun Değildir'].map((value) => <option key={value}>{value}</option>)}</select></label><label><span className={labelClass}>Doktor</span><select value={data.doctorId} onChange={(event) => { const doctor = doctors.find((item) => item.id === event.target.value); setData((previous) => ({ ...previous, doctorId: event.target.value, doctorName: doctor ? `${doctor.title} ${doctor.name}`.trim() : '' })) }} className={inputClass}><option value="">Doktor seçin</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.title} {doctor.name}</option>)}</select></label></div>
            </div></Card>
          </div>}
        </main>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-2.5"><div className={`flex items-center gap-2 text-[10px] ${validationMessage ? 'font-semibold text-red-600' : 'text-slate-500'}`}><CheckCircle2 className={`h-4 w-4 ${validationMessage ? 'text-red-500' : data.employee.tc.length === 11 ? 'text-emerald-500' : 'text-amber-500'}`} />{validationMessage || 'T.C. ve hasta adı zorunludur. Tamamlanan rapor sonuç listesine işlenir.'}</div><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Vazgeç</button><button type="button" onClick={() => save(false)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"><Save className="h-3.5 w-3.5" />Taslak Kaydet</button><button type="button" onClick={() => save(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"><ClipboardCheck className="h-3.5 w-3.5" />Raporu Tamamla</button></div></footer>
    </div>
  </Modal>
}
