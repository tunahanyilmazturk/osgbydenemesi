import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { ConfirmModal } from '@/shared/components/ui/ConfirmModal'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/ui/Modal'
import { loadFromStorage, saveToStorage } from '@/shared/lib/storage'
import { useToast } from '@/state/ToastContext'

export interface SimpleDefinition {
  id: string
  code: string
  name: string
  description: string
  isActive: boolean
}

interface SimpleDefinitionManagerProps {
  storageKey: string
  itemLabel: string
  defaults: SimpleDefinition[]
}

const emptyForm = { code: '', name: '', description: '', isActive: true }

export function SimpleDefinitionManager({ storageKey, itemLabel, defaults }: SimpleDefinitionManagerProps) {
  const { showToast } = useToast()
  const [items, setItems] = useState<SimpleDefinition[]>(() => loadFromStorage(storageKey, defaults))
  const [query, setQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filteredItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('tr-TR')
    if (!term) return items
    return items.filter((item) =>
      [item.code, item.name, item.description].some((value) =>
        value.toLocaleLowerCase('tr-TR').includes(term)
      )
    )
  }, [items, query])

  const updateItems = (next: SimpleDefinition[]) => {
    setItems(next)
    saveToStorage(storageKey, next)
  }

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const openEdit = (item: SimpleDefinition) => {
    setEditingId(item.id)
    setForm({ code: item.code, name: item.name, description: item.description, isActive: item.isActive })
    setIsModalOpen(true)
  }

  const handleSave = () => {
    const code = form.code.trim()
    const name = form.name.trim()
    if (!code || !name) {
      showToast('warning', 'Eksik bilgi', 'Kod ve ad alanları zorunludur.')
      return
    }
    const duplicate = items.some(
      (item) => item.id !== editingId && item.code.toLocaleLowerCase('tr-TR') === code.toLocaleLowerCase('tr-TR')
    )
    if (duplicate) {
      showToast('warning', 'Kod zaten kullanılıyor', 'Her tanım için benzersiz bir kod girin.')
      return
    }

    const next = editingId
      ? items.map((item) => item.id === editingId ? { ...item, ...form, code, name, description: form.description.trim() } : item)
      : [{ ...form, code, name, description: form.description.trim(), id: crypto.randomUUID() }, ...items]
    updateItems(next)
    setIsModalOpen(false)
    showToast('success', editingId ? `${itemLabel} güncellendi` : `${itemLabel} eklendi`)
  }

  const handleDelete = () => {
    if (!deleteId) return
    updateItems(items.filter((item) => item.id !== deleteId))
    setDeleteId(null)
    showToast('success', `${itemLabel} silindi`)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Tanımlarda ara</span>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kod, ad veya açıklama ara..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
          />
        </label>
        <button type="button" onClick={openNew} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Yeni {itemLabel}
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="min-h-64"><EmptyState title={query ? 'Aramayla eşleşen tanım yok' : `Henüz ${itemLabel.toLocaleLowerCase('tr-TR')} yok`} description={query ? 'Arama ifadesini değiştirin.' : 'İlk kaydı ekleyerek başlayın.'} actionLabel={!query ? `Yeni ${itemLabel}` : undefined} onAction={!query ? openNew : undefined} /></div>
      ) : (
        <div className="surface-scroll">
          <table className="w-full text-sm sticky-table-header">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr><th className="text-left px-4 py-3">Kod</th><th className="text-left px-4 py-3">Ad</th><th className="text-left px-4 py-3">Açıklama</th><th className="text-left px-4 py-3">Durum</th><th className="text-right px-4 py-3">İşlemler</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.code}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-md">{item.description || '—'}</td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.isActive ? 'Aktif' : 'Pasif'}</span></td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    <button type="button" onClick={() => openEdit(item)} aria-label={`${item.name} tanımını düzenle`} className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setDeleteId(item.id)} aria-label={`${item.name} tanımını sil`} className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? `${itemLabel} Düzenle` : `Yeni ${itemLabel}`}>
        <div className="space-y-4">
          <Input label="Kod *" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} autoFocus />
          <Input label="Ad *" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <label className="block text-sm font-semibold text-slate-700">Açıklama
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-normal focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500" />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="w-4 h-4 accent-blue-600" /> Aktif olarak kullan</label>
          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">İptal</button>
            <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Kaydet</button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={`${itemLabel} silinsin mi?`} message="Bu tanım kalıcı olarak kaldırılacak." />
    </div>
  )
}
