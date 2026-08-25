import { useMemo, useState } from 'react'
import { CheckCircle2, ClipboardList, FileHeart, Filter, ImagePlus, Plus, RotateCcw, Save, Search, Settings2, Stamp, Stethoscope, Trash2, X } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { normalizeServiceName } from '@/shared/lib/specialServices'
import {
  EK2_TRANSFER_TARGETS,
  DEFAULT_EK2_OPINIONS,
  DEFAULT_EK2_SETTINGS,
  EK2_DISEASES,
  EK2_NARRATIVE_FIELDS,
  EK2_PHYSICAL_FIELDS,
  EK2_SYMPTOMS,
  inferDefaultEk2Target,
  loadEk2Settings,
  saveEk2Settings,
  type Ek2OpinionTemplate,
  type Ek2Settings,
  type Ek2Stamp,
  type Ek2TransferTarget,
} from '@/features/examinations/ek2/lib/ek2Settings'
import { useAuth } from '@/state/AuthContext'
import { useServices } from '@/state/ServicesContext'
import { useToast } from '@/state/ToastContext'

const targetStyles: Record<Ek2TransferTarget, string> = {
  none: 'bg-slate-100 text-slate-600', bloodGroup: 'bg-red-50 text-red-700', tetanus: 'bg-blue-50 text-blue-700',
  blood: 'bg-rose-50 text-rose-700', urine: 'bg-amber-50 text-amber-700', radiology: 'bg-violet-50 text-violet-700',
  audiometry: 'bg-cyan-50 text-cyan-700', sft: 'bg-sky-50 text-sky-700', eye: 'bg-indigo-50 text-indigo-700',
  psychological: 'bg-fuchsia-50 text-fuchsia-700', other: 'bg-slate-100 text-slate-700',
}

export function Ek2ReportDefinitions() {
  const { catalog } = useServices()
  const { hasPermission } = useAuth()
  const { showToast } = useToast()
  const canManage = hasPermission('settings.ek2.manage')
  const services = useMemo(() => catalog.filter((item) => !normalizeServiceName(item.name).includes('ek 2')), [catalog])
  const storedSettings = useMemo(() => loadEk2Settings(), [])
  const [mappings, setMappings] = useState<Record<number, Ek2TransferTarget>>(() => Object.fromEntries(
    services.map((service) => {
      const saved = storedSettings.mappings.find((item) => item.serviceCode === service.code)
        ?? storedSettings.mappings.find((item) => normalizeServiceName(item.serviceName) === normalizeServiceName(service.name))
      return [service.id, saved?.target ?? inferDefaultEk2Target(service)]
    }),
  ))
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [targetFilter, setTargetFilter] = useState<'all' | Ek2TransferTarget>('all')
  const [activeTab, setActiveTab] = useState<'transfer' | 'defaults' | 'opinions' | 'stamps'>('transfer')

  const groups = useMemo(() => [...new Set(services.map((service) => service.group))].sort((a, b) => a.localeCompare(b, 'tr')), [services])
  const filteredServices = useMemo(() => {
    const query = normalizeServiceName(search)
    return services.filter((service) => {
      const matchesSearch = !query || normalizeServiceName(`${service.code} ${service.name} ${service.group}`).includes(query)
      return matchesSearch
        && (groupFilter === 'all' || service.group === groupFilter)
        && (targetFilter === 'all' || mappings[service.id] === targetFilter)
    })
  }, [groupFilter, mappings, search, services, targetFilter])

  const assignedCount = services.filter((service) => mappings[service.id] !== 'none').length
  const targetCounts = useMemo(() => Object.fromEntries(EK2_TRANSFER_TARGETS.map((target) => [
    target.value,
    services.filter((service) => mappings[service.id] === target.value).length,
  ])) as Record<Ek2TransferTarget, number>, [mappings, services])

  const handleSave = () => {
    saveEk2Settings({ ...loadEk2Settings(), mappings: services.map((service) => ({ serviceCode: service.code, serviceName: service.name, target: mappings[service.id] ?? 'none' })) })
    showToast('success', 'Ek-2 ayarları kaydedildi', 'Yeni açılan Ek-2 formlarında bu eşleştirmeler kullanılacak.')
  }

  const handleReset = () => {
    const defaults = Object.fromEntries(services.map((service) => [service.id, inferDefaultEk2Target(service)])) as Record<number, Ek2TransferTarget>
    setMappings(defaults)
    saveEk2Settings({ ...loadEk2Settings(), mappings: services.map((service) => ({ serviceCode: service.code, serviceName: service.name, target: defaults[service.id] })) })
    showToast('info', 'Varsayılan eşleştirmeler geri yüklendi')
  }

  return (
    <div className="viewport-page">
      <PageHeader
        title="Ek-2 Ayarları"
        subtitle="Test aktarımı, otomatik alanlar, kanaatler ve EK-2 PDF kaşelerini yönetin."
        action={canManage && activeTab === 'transfer' ? <div className="flex gap-2"><button type="button" onClick={handleReset} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Varsayılanlar</button><button type="button" onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"><Save className="h-4 w-4" />Ayarları Kaydet</button></div> : undefined}
      />

      <div className="flex shrink-0 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <TabButton active={activeTab === 'transfer'} onClick={() => setActiveTab('transfer')} icon={<Settings2 className="h-4 w-4" />} label="Test Aktarımı" />
        <TabButton active={activeTab === 'defaults'} onClick={() => setActiveTab('defaults')} icon={<Stethoscope className="h-4 w-4" />} label="Otomatik Form Alanları" />
        <TabButton active={activeTab === 'opinions'} onClick={() => setActiveTab('opinions')} icon={<ClipboardList className="h-4 w-4" />} label="Kanaat ve Koşullar" />
        <TabButton active={activeTab === 'stamps'} onClick={() => setActiveTab('stamps')} icon={<Stamp className="h-4 w-4" />} label="PDF Kaşeleri" />
      </div>

      {activeTab === 'transfer' && <>
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label="Hizmet" value={services.length} icon={<Settings2 className="h-4 w-4" />} />
        <SummaryCard label="Aktarılan" value={assignedCount} icon={<CheckCircle2 className="h-4 w-4" />} />
        <SummaryCard label="Aktarılmayan" value={services.length - assignedCount} icon={<Filter className="h-4 w-4" />} />
        <SummaryCard label="Hedef Alan" value={EK2_TRANSFER_TARGETS.filter((target) => target.value !== 'none' && targetCounts[target.value] > 0).length} icon={<FileHeart className="h-4 w-4" />} />
      </div>

      <div className="surface-panel flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="grid shrink-0 gap-2 border-b border-slate-100 p-3 md:grid-cols-[minmax(220px,1fr)_180px_210px]">
            <label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hizmet adı veya kodu ara..." className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" /></label>
            <select aria-label="Hizmet grubu" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"><option value="all">Tüm hizmet grupları</option>{groups.map((group) => <option key={group} value={group}>{group}</option>)}</select>
            <select aria-label="Aktarım alanı filtresi" value={targetFilter} onChange={(event) => setTargetFilter(event.target.value as 'all' | Ek2TransferTarget)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"><option value="all">Tüm aktarım alanları</option>{EK2_TRANSFER_TARGETS.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}</select>
          </div>

          <div className="surface-scroll">
            <table className="w-full table-fixed text-left">
              <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] font-bold uppercase tracking-wide text-slate-500 backdrop-blur-sm"><tr><th className="w-24 px-4 py-2.5">Kod</th><th className="px-4 py-2.5">Hizmet / Test</th><th className="w-36 px-4 py-2.5">Grup</th><th className="w-64 px-4 py-2.5">Ek-2 Aktarım Alanı</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((service) => {
                  const target = mappings[service.id] ?? 'none'
                  return <tr key={service.id} className="hover:bg-blue-50/30"><td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{service.code}</td><td className="px-4 py-2.5"><p className="truncate text-xs font-semibold text-slate-800" title={service.name}>{service.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{service.description || 'Açıklama bulunmuyor'}</p></td><td className="px-4 py-2.5"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{service.group}</span></td><td className="px-4 py-2.5"><select aria-label={`${service.name} aktarım alanı`} disabled={!canManage} value={target} onChange={(event) => setMappings((previous) => ({ ...previous, [service.id]: event.target.value as Ek2TransferTarget }))} className={`w-full rounded-lg border-0 px-2.5 py-1.5 text-[11px] font-semibold outline-none ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-70 ${targetStyles[target]}`}>{EK2_TRANSFER_TARGETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td></tr>
                })}
                {filteredServices.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-xs text-slate-400">Filtrelere uygun hizmet bulunamadı.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[10px] text-slate-500">{filteredServices.length} hizmet gösteriliyor · Ayarlar yalnızca ilgili protokolde sonuçlanmış testlere uygulanır.</div>
        </div>

        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-slate-100 bg-slate-50/60 p-4 xl:block">
          <div className="mb-3"><h2 className="text-xs font-bold text-slate-800">Aktarım Özeti</h2><p className="mt-1 text-[10px] leading-4 text-slate-500">Eski sistemdeki hizmet grupları, mevcut Ek-2 formundaki gerçek alanlarla eşleştirildi.</p></div>
          <div className="space-y-1.5">{EK2_TRANSFER_TARGETS.map((target) => <button type="button" key={target.value} onClick={() => setTargetFilter(target.value)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white p-2.5 text-left hover:border-blue-200"><span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-slate-700">{target.label}</span><span className="mt-0.5 block text-[9px] leading-3 text-slate-400">{target.description}</span></span><span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${targetStyles[target.value]}`}>{targetCounts[target.value]}</span></button>)}</div>
        </aside>
      </div>
      </>}
      {activeTab === 'defaults' && <DefaultsTab canManage={canManage} />}
      {activeTab === 'opinions' && <OpinionsTab canManage={canManage} />}
      {activeTab === 'stamps' && <StampsTab canManage={canManage} />}
    </div>
  )
}

function resizeStampImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Görsel okunamadı.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Görsel biçimi desteklenmiyor.'))
      image.onload = () => {
        const maxWidth = 1200
        const maxHeight = 600
        const ratio = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
        const context = canvas.getContext('2d')
        if (!context) return reject(new Error('Görsel işlenemedi.'))
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

function StampsTab({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast()
  const [stamps, setStamps] = useState<Ek2Stamp[]>(() => loadEk2Settings().stamps)

  const upload = async (file: File | null) => {
    if (!file) return
    if (stamps.length >= 5) {
      showToast('warning', 'Kaşe sınırına ulaşıldı', 'EK-2 PDF için en fazla 5 kurum kaşesi yüklenebilir.')
      return
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showToast('warning', 'Geçersiz dosya', 'PNG, JPG veya WEBP biçiminde bir görsel seçin.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      showToast('warning', 'Dosya çok büyük', 'Kaşe görseli 4 MB sınırını aşmamalıdır.')
      return
    }
    try {
      const image = await resizeStampImage(file)
      setStamps((previous) => [...previous, { id: `ek2-stamp-${Date.now()}`, name: file.name.replace(/\.[^.]+$/, ''), image }].slice(0, 5))
    } catch (error) {
      showToast('error', 'Kaşe yüklenemedi', error instanceof Error ? error.message : 'Görsel işlenemedi.')
    }
  }

  const save = () => {
    saveEk2Settings({ ...loadEk2Settings(), stamps })
    showToast('success', 'EK-2 kaşeleri kaydedildi', `${stamps.length} kurum kaşesi iki sayfalık PDF düzenine bağlandı.`)
  }

  return <div className="surface-scroll space-y-3 pr-1">
    <section className="surface-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-sm font-bold text-slate-800">EK-2 PDF Kurum Kaşeleri</h2><p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">Buraya yüklenen kaşeler EK-2 PDF çıktısının onay bölümünde gösterilir. Doktor kaşesi seçilen doktorun kaydından ayrıca ve sabit olarak alınır.</p></div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-right"><p className="text-[10px] font-semibold text-blue-700">Kullanılan kapasite</p><p className="text-lg font-extrabold text-blue-800">{stamps.length}<span className="text-xs text-blue-500"> / 5</span></p></div>
      </div>
    </section>

    <section className="surface-panel p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stamps.map((stamp, index) => <article key={stamp.id} className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2"><span className="rounded-lg bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">KAŞE {index + 1}</span>{canManage && <button type="button" onClick={() => setStamps((previous) => previous.filter((item) => item.id !== stamp.id))} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`${stamp.name} kaşesini kaldır`}><X className="h-4 w-4" /></button>}</div>
          <div className="flex h-32 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3"><img src={stamp.image} alt={`${stamp.name} kaşesi`} className="max-h-full max-w-full object-contain" /></div>
          <input disabled={!canManage} value={stamp.name} onChange={(event) => setStamps((previous) => previous.map((item) => item.id === stamp.id ? { ...item, name: event.target.value } : item))} className="mt-2 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-100" aria-label={`${index + 1}. kaşe adı`} />
        </article>)}

        {canManage && stamps.length < 5 && <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 text-center transition hover:border-blue-400 hover:bg-blue-50">
          <ImagePlus className="mb-3 h-8 w-8 text-blue-500" /><span className="text-xs font-bold text-blue-800">Yeni Kaşe Yükle</span><span className="mt-1 text-[9px] leading-4 text-blue-500">PNG, JPG veya WEBP<br />En fazla 4 MB</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { void upload(event.target.files?.[0] ?? null); event.target.value = '' }} />
        </label>}
      </div>
      {stamps.length === 0 && !canManage && <div className="py-14 text-center text-xs text-slate-400">Henüz EK-2 kurum kaşesi tanımlanmadı.</div>}
    </section>

    {canManage && <div className="sticky bottom-0 flex justify-end rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm"><button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"><Save className="h-4 w-4" />Kaşeleri Kaydet</button></div>}
  </div>
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">{icon}</div><div><p className="text-[10px] font-medium text-slate-400">{label}</p><p className="text-sm font-extrabold text-slate-800">{value}</p></div></div>
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:flex-none ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-700'}`}>{icon}<span className="hidden sm:inline">{label}</span></button>
}

const fieldClass = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-100 disabled:text-slate-500'

function DefaultsTab({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast()
  const [form, setForm] = useState<Ek2Settings>(() => loadEk2Settings())

  const save = () => {
    saveEk2Settings({ ...loadEk2Settings(), ...form, mappings: loadEk2Settings().mappings, opinionTemplates: loadEk2Settings().opinionTemplates })
    showToast('success', 'Otomatik form alanları kaydedildi', 'Yeni Ek-2 formları ve normal bulgu doldurma işlemi bu değerleri kullanacak.')
  }
  const reset = () => {
    setForm((previous) => ({
      ...previous,
      autoFillPhysicalExamination: DEFAULT_EK2_SETTINGS.autoFillPhysicalExamination,
      anamnesisDefaults: DEFAULT_EK2_SETTINGS.anamnesisDefaults,
      narrativeDefaults: DEFAULT_EK2_SETTINGS.narrativeDefaults,
      physicalExaminationDefaults: DEFAULT_EK2_SETTINGS.physicalExaminationDefaults,
      defaultOpinion: DEFAULT_EK2_SETTINGS.defaultOpinion,
      defaultConditions: DEFAULT_EK2_SETTINGS.defaultConditions,
      defaultConclusion: DEFAULT_EK2_SETTINGS.defaultConclusion,
    }))
  }
  const updateAnswer = (key: string, field: 'answer' | 'note', value: string) => setForm((previous) => ({
    ...previous,
    anamnesisDefaults: { ...previous.anamnesisDefaults, [key]: { ...previous.anamnesisDefaults[key], [field]: value } },
  }))

  return <div className="surface-scroll space-y-3 pr-1">
    <section className="surface-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-800">Otomatik Doldurma Davranışı</h2><p className="mt-1 text-[10px] text-slate-500">Yeni açılan formların ve “Normal bulgularla doldur” işleminin başlangıç değerleri.</p></div><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2"><span className="text-xs font-semibold text-blue-800">Fiziki muayene otomatik doldurulsun</span><input type="checkbox" disabled={!canManage} checked={form.autoFillPhysicalExamination} onChange={(event) => setForm((previous) => ({ ...previous, autoFillPhysicalExamination: event.target.checked }))} className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500" /></label></div>
    </section>

    <section className="surface-panel p-4"><SectionTitle title="Tıbbi Anamnez Varsayılanları" subtitle="Yakınma ve hastalık soruları açıldığında kullanılacak yanıt ve açıklamalar." />
      <div className="grid gap-4 xl:grid-cols-2"><QuestionDefaults title="Yakınmalar" fields={EK2_SYMPTOMS} values={form.anamnesisDefaults} disabled={!canManage} onChange={updateAnswer} /><QuestionDefaults title="Geçirilen Hastalıklar" fields={EK2_DISEASES} values={form.anamnesisDefaults} disabled={!canManage} onChange={updateAnswer} /></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{EK2_NARRATIVE_FIELDS.map(([key, label]) => <label key={key}><span className="mb-1 block text-[10px] font-semibold text-slate-500">{label}</span><input disabled={!canManage} value={form.narrativeDefaults[key] ?? ''} onChange={(event) => setForm((previous) => ({ ...previous, narrativeDefaults: { ...previous.narrativeDefaults, [key]: event.target.value } }))} placeholder="Varsayılan yanıt" className={fieldClass} /></label>)}</div>
    </section>

    <section className="surface-panel p-4"><SectionTitle title="Fiziki Muayene Varsayılanları" subtitle="Eski sistemdeki duyu organları ve sistem muayenesi tanımları." /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{EK2_PHYSICAL_FIELDS.map(([key, label]) => <label key={key}><span className="mb-1 block text-[10px] font-semibold text-slate-500">{label}</span><input disabled={!canManage || !form.autoFillPhysicalExamination} value={form.physicalExaminationDefaults[key] ?? ''} onChange={(event) => setForm((previous) => ({ ...previous, physicalExaminationDefaults: { ...previous.physicalExaminationDefaults, [key]: event.target.value } }))} className={fieldClass} /></label>)}</div></section>

    <section className="surface-panel p-4"><SectionTitle title="Varsayılan Kanaat ve Sonuç" subtitle="Yeni Ek-2 raporu oluşturulduğunda başlangıçta gösterilecek değerler." /><div className="grid gap-3 lg:grid-cols-2"><label><span className="mb-1 block text-[10px] font-semibold text-slate-500">Kanaat</span><textarea disabled={!canManage} rows={3} value={form.defaultOpinion} onChange={(event) => setForm((previous) => ({ ...previous, defaultOpinion: event.target.value }))} className={`${fieldClass} resize-none`} /></label><label><span className="mb-1 block text-[10px] font-semibold text-slate-500">Çalışma Koşulları / Kısıtlamalar</span><textarea disabled={!canManage} rows={3} value={form.defaultConditions} onChange={(event) => setForm((previous) => ({ ...previous, defaultConditions: event.target.value }))} className={`${fieldClass} resize-none`} /></label><label><span className="mb-1 block text-[10px] font-semibold text-slate-500">Sonuç</span><select disabled={!canManage} value={form.defaultConclusion} onChange={(event) => setForm((previous) => ({ ...previous, defaultConclusion: event.target.value as Ek2Settings['defaultConclusion'] }))} className={fieldClass}>{['Değerlendirme Bekliyor','Çalışmaya Uygundur','Şartlı Uygundur','Çalışmaya Uygun Değildir'].map((value) => <option key={value}>{value}</option>)}</select></label></div></section>

    {canManage && <div className="sticky bottom-0 flex justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm"><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Varsayılanlara Dön</button><button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"><Save className="h-4 w-4" />Alanları Kaydet</button></div>}
  </div>
}

function QuestionDefaults({ title, fields, values, disabled, onChange }: { title: string; fields: ReadonlyArray<readonly [string, string]>; values: Ek2Settings['anamnesisDefaults']; disabled: boolean; onChange: (key: string, field: 'answer' | 'note', value: string) => void }) {
  return <div className="overflow-hidden rounded-xl border border-slate-200"><div className="bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700">{title}</div><div className="divide-y divide-slate-100">{fields.map(([key, label]) => <div key={key} className="grid gap-2 p-2.5 sm:grid-cols-[minmax(150px,1fr)_90px_minmax(120px,1fr)] sm:items-center"><span className="text-[10px] font-medium text-slate-600">{label}</span><select disabled={disabled} value={values[key]?.answer ?? ''} onChange={(event) => onChange(key, 'answer', event.target.value)} className={fieldClass}><option value="">Boş</option><option value="Hayır">Hayır</option><option value="Evet">Evet</option></select><input disabled={disabled} value={values[key]?.note ?? ''} onChange={(event) => onChange(key, 'note', event.target.value)} placeholder="Açıklama" className={fieldClass} /></div>)}</div></div>
}

function OpinionsTab({ canManage }: { canManage: boolean }) {
  const { showToast } = useToast()
  const [templates, setTemplates] = useState<Ek2OpinionTemplate[]>(() => loadEk2Settings().opinionTemplates)
  const [selectedId, setSelectedId] = useState(() => loadEk2Settings().opinionTemplates[0]?.id ?? '')
  const selected = templates.find((item) => item.id === selectedId)
  const updateSelected = (patch: Partial<Ek2OpinionTemplate>) => setTemplates((previous) => previous.map((item) => item.id === selectedId ? { ...item, ...patch } : item))
  const addOpinion = () => { const id = `opinion-${Date.now()}`; setTemplates((previous) => [...previous, { id, title: 'Yeni Kanaat', conditions: [] }]); setSelectedId(id) }
  const removeOpinion = () => {
    if (!selected || !window.confirm('Bu kanaat ve bağlı koşullar silinsin mi?')) return
    const next = templates.filter((item) => item.id !== selected.id)
    setTemplates(next); setSelectedId(next[0]?.id ?? '')
  }
  const save = () => { saveEk2Settings({ ...loadEk2Settings(), opinionTemplates: templates }); showToast('success', 'Kanaat ve koşullar kaydedildi') }
  const reset = () => { setTemplates(DEFAULT_EK2_OPINIONS); setSelectedId(DEFAULT_EK2_OPINIONS[0]?.id ?? '') }

  return <div className="surface-panel flex min-h-0 flex-1 overflow-hidden">
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-100 bg-slate-50/70"><div className="flex items-center justify-between border-b border-slate-100 p-3"><div><h2 className="text-xs font-bold text-slate-800">Kanaat Şablonları</h2><p className="mt-0.5 text-[9px] text-slate-400">{templates.length} tanım</p></div>{canManage && <button type="button" onClick={addOpinion} className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700" aria-label="Yeni kanaat ekle"><Plus className="h-4 w-4" /></button>}</div><div className="surface-scroll space-y-1 p-2">{templates.map((template) => <button type="button" key={template.id} onClick={() => setSelectedId(template.id)} className={`w-full rounded-xl border p-3 text-left ${selectedId === template.id ? 'border-blue-200 bg-blue-50' : 'border-transparent bg-white hover:border-slate-200'}`}><p className="line-clamp-2 text-[11px] font-semibold text-slate-700">{template.title}</p><p className="mt-1 text-[9px] text-slate-400">{template.conditions.length} çalışma koşulu</p></button>)}</div></aside>
    <main className="min-w-0 flex-1 overflow-y-auto p-4">{selected ? <div className="mx-auto max-w-4xl space-y-4"><div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-800">Kanaat ve Bağlı Koşullar</h2><p className="mt-1 text-[10px] text-slate-500">Ek-2 formunda hazır seçim olarak gösterilecek metinleri düzenleyin.</p></div>{canManage && <button type="button" onClick={removeOpinion} className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-600 hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" />Kanaati Sil</button>}</div><label><span className="mb-1 block text-[10px] font-semibold text-slate-500">Kanaat Metni</span><textarea disabled={!canManage} rows={3} value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} className={`${fieldClass} resize-none`} /></label><section className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"><div className="mb-2 flex items-center justify-between"><div><h3 className="text-xs font-bold text-slate-700">Çalışma Koşulları</h3><p className="mt-0.5 text-[9px] text-slate-400">Bu kanaat seçildiğinde kullanılabilecek koşullar.</p></div>{canManage && <button type="button" onClick={() => updateSelected({ conditions: [...selected.conditions, 'Yeni çalışma koşulu'] })} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-blue-700"><Plus className="h-3.5 w-3.5" />Koşul Ekle</button>}</div><div className="space-y-2">{selected.conditions.map((condition, index) => <div key={`${selected.id}-${index}`} className="flex gap-2"><span className="flex h-8 w-7 shrink-0 items-center justify-center text-[10px] font-bold text-slate-400">{index + 1}</span><input disabled={!canManage} value={condition} onChange={(event) => updateSelected({ conditions: selected.conditions.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} className={fieldClass} />{canManage && <button type="button" onClick={() => updateSelected({ conditions: selected.conditions.filter((_, itemIndex) => itemIndex !== index) })} className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500" aria-label={`${index + 1}. koşulu sil`}><Trash2 className="h-4 w-4" /></button>}</div>)}{selected.conditions.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-[10px] text-slate-400">Bu kanaate bağlı çalışma koşulu bulunmuyor.</p>}</div></section>{canManage && <div className="sticky bottom-0 flex justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm"><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><RotateCcw className="h-4 w-4" />Eski Sistem Varsayılanları</button><button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"><Save className="h-4 w-4" />Kanaatleri Kaydet</button></div>}</div> : <div className="flex h-full items-center justify-center text-xs text-slate-400">Kanaat tanımı bulunmuyor.</div>}</main>
  </div>
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="mb-3 border-b border-slate-100 pb-3"><h2 className="text-sm font-bold text-slate-800">{title}</h2><p className="mt-1 text-[10px] text-slate-500">{subtitle}</p></div>
}
