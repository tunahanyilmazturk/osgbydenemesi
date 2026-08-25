import { useMemo, useState } from 'react'
import { Building2, Check, Pencil, Plus, Search, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { useConfirm } from '@/state/ConfirmContext'
import { useToast } from '@/state/ToastContext'
import {
  loadInstitutionStamps,
  saveInstitutionStamps,
  type InstitutionStamp,
} from '@/shared/lib/institutionStamps'

interface InstitutionStampsTabProps {
  testTypes: string[]
}

interface StampDraft {
  name: string
  image: string
  testTypes: string[]
}

const EMPTY_DRAFT: StampDraft = { name: '', image: '', testTypes: [] }

export function InstitutionStampsTab({ testTypes }: InstitutionStampsTabProps) {
  const [stamps, setStamps] = useState<InstitutionStamp[]>(loadInstitutionStamps())
  const [draft, setDraft] = useState<StampDraft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const confirmDialog = useConfirm()
  const { showToast } = useToast()

  const filteredTests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR')
    return query ? testTypes.filter((name) => name.toLocaleLowerCase('tr-TR').includes(query)) : testTypes
  }, [search, testTypes])

  const persist = (next: InstitutionStamp[]) => {
    if (!saveInstitutionStamps(next)) {
      showToast('error', 'Kurum kaşeleri kaydedilemedi', 'Tarayıcı depolama alanını kontrol edin.')
      return false
    }
    setStamps(next)
    return true
  }

  const openNew = () => {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setSearch('')
    setError('')
    setShowForm(true)
  }

  const openEdit = (stamp: InstitutionStamp) => {
    setDraft({ name: stamp.name, image: stamp.image, testTypes: [...stamp.testTypes] })
    setEditingId(stamp.id)
    setSearch('')
    setError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setError('')
  }

  const handleImage = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Lütfen PNG, JPG veya WEBP biçiminde bir görsel seçin.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('Kaşe görseli en fazla 3 MB olabilir.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setDraft((previous) => ({ ...previous, image: String(reader.result) }))
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const toggleTest = (testType: string) => {
    setDraft((previous) => ({
      ...previous,
      testTypes: previous.testTypes.includes(testType)
        ? previous.testTypes.filter((item) => item !== testType)
        : [...previous.testTypes, testType],
    }))
  }

  const handleSave = () => {
    if (!draft.name.trim()) return setError('Kurum kaşesi adı zorunludur.')
    if (!draft.image) return setError('Kaşe görseli yükleyin.')
    if (draft.testTypes.length === 0) return setError('En az bir hizmet veya test seçin.')

    const id = editingId ?? `institution_stamp_${Date.now()}`
    const updatedAt = new Date().toISOString()
    const withoutConflicts = stamps.map((stamp) => (
      stamp.id === id
        ? stamp
        : { ...stamp, testTypes: stamp.testTypes.filter((test) => !draft.testTypes.includes(test)) }
    ))
    const nextStamp: InstitutionStamp = { id, name: draft.name.trim(), image: draft.image, testTypes: [...draft.testTypes], updatedAt }
    const next = editingId
      ? withoutConflicts.map((stamp) => stamp.id === editingId ? nextStamp : stamp)
      : [...withoutConflicts, nextStamp]
    if (!persist(next)) return
    closeForm()
    showToast('success', editingId ? 'Kurum kaşesi güncellendi' : 'Kurum kaşesi eklendi', `${draft.testTypes.length} hizmet/test ile eşleştirildi.`)
  }

  const handleDelete = async (stamp: InstitutionStamp) => {
    const approved = await confirmDialog({
      title: 'Kurum Kaşesini Sil',
      message: `${stamp.name} ve tüm test eşleşmeleri silinsin mi?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      confirmVariant: 'danger',
    })
    if (!approved) return
    if (persist(stamps.filter((item) => item.id !== stamp.id))) showToast('success', 'Kurum kaşesi silindi')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><Building2 size={20} /></div>
          <div><p className="text-sm font-bold text-slate-800">Test bazlı kurum kaşeleri</p><p className="text-[11px] text-slate-500">Bir test aynı anda yalnızca bir kurum kaşesiyle eşleşebilir.</p></div>
        </div>
        <button type="button" onClick={openNew} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"><Plus size={14} /> Yeni Kurum Kaşesi</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        {stamps.length === 0 ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center text-center"><div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100"><ShieldCheck className="text-slate-400" size={28} /></div><p className="text-sm font-bold text-slate-700">Kurum kaşesi tanımlanmadı</p><p className="mt-1 max-w-sm text-xs text-slate-400">Kaşeyi yükleyip kullanılacağı hizmetleri seçtiğinizde yalnızca o raporlarda görüntülenir.</p></div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stamps.map((stamp) => <article key={stamp.id} className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:shadow-sm"><div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-800">{stamp.name}</h3><p className="text-[10px] text-slate-400">{stamp.testTypes.length} hizmet/test eşleşmesi</p></div><div className="flex gap-1"><button type="button" onClick={() => openEdit(stamp)} title="Düzenle" className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={14} /></button><button type="button" onClick={() => void handleDelete(stamp)} title="Sil" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button></div></div><div className="mb-3 flex h-24 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2"><img src={stamp.image} alt={`${stamp.name} kurum kaşesi`} className="max-h-full max-w-full object-contain" /></div><div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto">{stamp.testTypes.map((test) => <span key={test} className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-700">{test}</span>)}</div></article>)}
          </div>
        )}
      </div>

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-label="Kurum Kaşesi Tanımı" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-4"><div><h3 className="text-base font-bold text-slate-800">{editingId ? 'Kurum Kaşesini Düzenle' : 'Yeni Kurum Kaşesi'}</h3><p className="text-xs text-slate-400">Kaşe görselini ve kullanılacağı testleri belirleyin.</p></div><button type="button" onClick={closeForm} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div><div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-6 md:grid-cols-[260px_1fr]"><div className="space-y-4"><label className="block"><span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Kaşe Adı *</span><input value={draft.name} onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))} placeholder="Örn. Çet-Ka OSGB Kurum Kaşesi" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-400" /></label><div><span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Kaşe Görseli *</span><label className="relative flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-3 hover:border-blue-300">{draft.image ? <img src={draft.image} alt="Kurum kaşesi önizleme" className="max-h-full max-w-full object-contain" /> : <div className="text-center text-slate-400"><Upload className="mx-auto mb-2" size={24} /><p className="text-xs font-semibold">Görsel yükle</p><p className="text-[9px]">PNG, JPG veya WEBP · En fazla 3 MB</p></div>}<input type="file" accept="image/png,image/jpeg,image/webp" className="absolute inset-0 opacity-0" onChange={(event) => handleImage(event.target.files?.[0] ?? null)} /></label></div></div><div className="flex min-h-0 flex-col"><div className="mb-2 flex items-center justify-between"><div><p className="text-xs font-bold text-slate-700">Kullanılacağı Hizmetler / Testler *</p><p className="text-[10px] text-slate-400">Seçilen test başka kaşeden otomatik ayrılır.</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{draft.testTypes.length} seçili</span></div><label className="relative mb-2 block"><Search className="absolute left-3 top-2.5 text-slate-400" size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hizmet veya test ara..." className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-400" /></label><div className="min-h-52 flex-1 overflow-y-auto rounded-xl border border-slate-200 p-2">{filteredTests.map((test) => { const checked = draft.testTypes.includes(test); return <button key={test} type="button" onClick={() => toggleTest(test)} className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition ${checked ? 'bg-blue-50 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-50'}`}><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 bg-white'}`}>{checked && <Check size={11} />}</span><span>{test}</span></button> })}</div></div></div>{error && <div className="mx-6 mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}<div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><button type="button" onClick={closeForm} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">İptal</button><button type="button" onClick={handleSave} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">Kaşeyi Kaydet</button></div></div></div>}
    </div>
  )
}
