import { useMemo, useState } from 'react'
import { Edit2, Plus, RotateCcw, Save, Search, Trash2, X, Check } from 'lucide-react'
import { useServices, defaultTubeTypes } from '../../context/ServicesContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/PageHeader'
import type { ServiceTubeType } from '../../types'
import { getTubeBarcodeShortName } from '../../utils/barcodeSettings'

const emptyForm: Omit<ServiceTubeType, 'id'> = {
  name: '',
  barcodeShortName: '',
  colorCode: '#3b82f6',
  description: '',
  isActive: true,
}

const presetColors = [
  { name: 'Sarı', hex: '#eab308' },
  { name: 'Kırmızı', hex: '#ef4444' },
  { name: 'Mor', hex: '#8b5cf6' },
  { name: 'Mavi', hex: '#3b82f6' },
  { name: 'Yeşil', hex: '#22c55e' },
  { name: 'Gri', hex: '#9ca3af' },
  { name: 'Siyah', hex: '#111827' },
  { name: 'Beyaz', hex: '#d1d5db' },
  { name: 'Turuncu', hex: '#f97316' },
  { name: 'Kahve', hex: '#a16207' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Pembe', hex: '#ec4899' },
]

export function ServiceTubeTypes() {
  const { tubeTypes, addTubeType, updateTubeType, removeTubeType, setTubeTypes } = useServices()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<ServiceTubeType, 'id'>>(emptyForm)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return tubeTypes
    return tubeTypes.filter((t) => t.name.toLowerCase().includes(term) || t.barcodeShortName?.toLowerCase().includes(term) || t.description.toLowerCase().includes(term))
  }, [tubeTypes, search])

  const openAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setIsModalOpen(true)
  }

  const handleResetDefaults = async () => {
    const ok = await confirm({
      title: 'Varsayılan Tüp Tiplerine Sıfırla',
      message: 'Tüm tüp tipi tanımları varsayılan profesyonel listeye sıfırlanacak. Devam etmek istiyor musunuz?',
    })
    if (ok) {
      setTubeTypes(defaultTubeTypes)
      showToast('success', 'Sıfırlandı', 'Tüp tipi tanımları varsayılana döndürüldü.')
    }
  }

  const openEdit = (item: ServiceTubeType) => {
    setForm({
      name: item.name,
      barcodeShortName: item.barcodeShortName ?? getTubeBarcodeShortName(item.name),
      colorCode: item.colorCode,
      description: item.description,
      isActive: item.isActive,
    })
    setEditingId(item.id)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editingId) {
      updateTubeType(editingId, form)
      showToast('success', 'Tüp tipi güncellendi', `"${form.name}" kaydedildi.`)
    } else {
      addTubeType(form)
      showToast('success', 'Tüp tipi eklendi', `"${form.name}" eklendi.`)
    }
    closeModal()
  }

  const handleDelete = async (item: ServiceTubeType) => {
    const ok = await confirm({
      title: 'Tüp Tipi Sil',
      message: `"${item.name}" tüp tipini silmek istediğinize emin misiniz?`,
    })
    if (ok) {
      removeTubeType(item.id)
      showToast('success', 'Tüp tipi silindi', `"${item.name}" silindi.`)
    }
  }

  const update = <K extends keyof Omit<ServiceTubeType, 'id'>>(field: K, value: Omit<ServiceTubeType, 'id'>[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hizmet Tüp Tipi Tanımları"
        subtitle="Numune tüp tiplerini tanımlayın ve laboratuvar süreçlerine bağlayın."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              title="Varsayılan profesyonel tüp tipi listesine sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
              Varsayılanlara Sıfırla
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Yeni Hizmet Tüp Tipi
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tüp tipi ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium w-16 text-center">#</th>
                <th className="px-6 py-4 font-medium">Tüp Tipi</th>
                <th className="px-6 py-4 font-medium">Barkodda Kısa Ad</th>
                <th className="px-6 py-4 font-medium">Açıklama</th>
                <th className="px-6 py-4 font-medium text-center">Durum</th>
                <th className="px-6 py-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <Search className="w-10 h-10 text-slate-300 mb-2" />
                      <p>Tüp tipi bulunamadı.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, index) => (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${!item.isActive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                    <td className="px-6 py-4 text-center text-slate-400 font-mono">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-100 shrink-0"
                          style={{ backgroundColor: item.colorCode }}
                        />
                        <span className="font-medium text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium" title="Barkodda kullanılacak kısa ad">
                        {item.barcodeShortName || getTubeBarcodeShortName(item.name)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate">{item.description || '—'}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {item.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
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
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-sm text-slate-500">
            Toplam: <span className="font-semibold text-slate-800">{filtered.length}</span> tüp tipi
          </span>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Tüp Tipi Düzenle' : 'Yeni Tüp Tipi Ekle'}
        subtitle="Numune tüpü tanımını girin ve kapak rengini belirleyin."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Üst: Önizleme + Ad */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Canlı önizleme */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Önizleme</label>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-4 flex flex-col items-center justify-center gap-3 h-full min-h-[140px]">
                <div
                  className="w-14 h-14 rounded-full border-4 border-white shadow-lg ring-2 ring-slate-200"
                  style={{ backgroundColor: form.colorCode }}
                />
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800 truncate max-w-[160px]">
                    {form.name || 'Tüp Tipi Adı'}
                  </p>
                  <p className="text-[10px] text-blue-600 font-medium mt-0.5">
                    Barkod: {form.barcodeShortName || getTubeBarcodeShortName(form.name || 'Tüp Tipi')}
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-medium border ${
                      form.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {form.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ad + Durum */}
            <div className="md:col-span-2 space-y-4">
              <Input
                size="sm"
                label="Tüp Tipi Adı"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Örn: Sarı Kapaklı Jel Separator Tüp (SST)"
                required
              />

              <Input
                size="sm"
                label="Barkodda Gözükecek Kısa Ad"
                value={form.barcodeShortName ?? ''}
                onChange={(e) => update('barcodeShortName', e.target.value)}
                placeholder="Örn: SST Sarı"
                maxLength={24}
              />
              <p className="text-[10px] text-slate-400 -mt-3">Barkodda test adının altında gösterilir. Boş bırakırsanız otomatik kısa ad kullanılır.</p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Durum</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => update('isActive', true)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      form.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {form.isActive && <Check className="w-4 h-4" />}
                    Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => update('isActive', false)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      !form.isActive
                        ? 'bg-slate-100 text-slate-700 border-slate-300 ring-1 ring-slate-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {!form.isActive && <Check className="w-4 h-4" />}
                    Pasif
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Kapak Rengi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Kapak Rengi</label>
            <div className="space-y-3">
              {/* Hazır renkler */}
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                {presetColors.map((color) => {
                  const isSelected = form.colorCode.toLowerCase() === color.hex.toLowerCase()
                  return (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => update('colorCode', color.hex)}
                      title={color.name}
                      className={`relative aspect-square rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-200 scale-105'
                          : 'border-slate-200 hover:border-slate-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {isSelected && (
                        <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow-md" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Özel renk seçici */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200 shrink-0"
                  style={{ backgroundColor: form.colorCode }}
                />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Özel renk seç</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.colorCode}
                      onChange={(e) => update('colorCode', e.target.value)}
                      className="w-12 h-8 cursor-pointer rounded-lg border border-slate-200"
                    />
                    <input
                      type="text"
                      value={form.colorCode}
                      onChange={(e) => update('colorCode', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-mono focus:outline-none focus:border-blue-500"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Açıklama <span className="text-slate-400 font-normal">(opsiyonel)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Tüp tipinin kullanım amacı, içerdiği antikoagülan veya hangi testler için kullanıldığı..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 resize-none"
            />
          </div>

          {/* Butonlar */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={!form.name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
