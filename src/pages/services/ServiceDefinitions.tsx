import { useMemo, useState } from 'react'
import { Edit2, Folder, Plus, Save, Search, Settings2, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useServices, getGroupColor, DEFAULT_VAT_RATE } from '../../context/ServicesContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/PageHeader'
import { Select } from '../../components/ui/Select'
import type { ServiceCatalogItem } from '../../types'

const availableColors = ['blue', 'red', 'violet', 'amber', 'emerald', 'slate', 'pink', 'cyan']

const emptyForm: Omit<ServiceCatalogItem, 'id'> = {
  name: '',
  group: 'Biyokimya',
  price: 0,
  vatRate: DEFAULT_VAT_RATE,
  companies: [],
}

export function ServiceDefinitions() {
  const navigate = useNavigate()
  const { catalog, groups, addCatalogItem, updateCatalogItem, removeCatalogItem, addGroup, updateGroup, removeGroup } = useServices()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<ServiceCatalogItem, 'id'>>(emptyForm)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('Tümü')

  // Group form
  const [groupForm, setGroupForm] = useState({ name: '', color: 'blue' })
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)

  const groupNames = useMemo(() => groups.map((g) => g.name), [groups])

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase()
    return catalog.filter((c) => {
      const matchesSearch = !term || c.name.toLowerCase().includes(term)
      const matchesGroup = groupFilter === 'Tümü' || c.group === groupFilter
      return matchesSearch && matchesGroup
    })
  }, [catalog, search, groupFilter])

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    catalog.forEach((c) => {
      counts[c.group] = (counts[c.group] ?? 0) + 1
    })
    return counts
  }, [catalog])

  const startAdd = () => {
    setForm({ ...emptyForm, group: groupNames[0] ?? 'Diğer' })
    setEditingId(null)
    setIsModalOpen(true)
  }

  const startEdit = (item: ServiceCatalogItem) => {
    setForm({ name: item.name, group: item.group, price: item.price, vatRate: item.vatRate, companies: item.companies })
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
    if (editingId) {
      updateCatalogItem(editingId, form)
    } else {
      addCatalogItem(form)
    }
    closeModal()
  }

  const update = (field: keyof Omit<ServiceCatalogItem, 'id'>, value: string | number | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: 'Hizmet Sil',
      message: `"${name}" hizmetini silmek istediğinize emin misiniz?`,
    })
    if (ok) {
      removeCatalogItem(id)
      showToast('success', 'Hizmet silindi', `"${name}" hizmeti katalogdan silindi.`)
    }
  }

  const formTotal = form.price * (1 + form.vatRate / 100)

  // Group modal handlers
  const startAddGroup = () => {
    setGroupForm({ name: '', color: 'blue' })
    setEditingGroupId(null)
    setIsGroupModalOpen(true)
  }

  const startEditGroup = (id: number, name: string, color: string) => {
    setGroupForm({ name, color })
    setEditingGroupId(id)
    setIsGroupModalOpen(true)
  }

  const closeGroupModal = () => {
    setIsGroupModalOpen(false)
    setEditingGroupId(null)
    setGroupForm({ name: '', color: 'blue' })
  }

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupForm.name.trim()) return
    if (editingGroupId) {
      updateGroup(editingGroupId, { name: groupForm.name.trim(), color: groupForm.color })
    } else {
      addGroup(groupForm.name.trim(), groupForm.color)
    }
    closeGroupModal()
  }

  const handleGroupDelete = async (id: number, name: string) => {
    const count = groupCounts[name] ?? 0
    const message = count > 0
      ? `"${name}" grubunu silmek istediğinize emin misiniz? Bu gruptaki ${count} hizmet "Diğer" grubuna taşınacak.`
      : `"${name}" grubunu silmek istediğinize emin misiniz?`
    const ok = await confirm({
      title: 'Kategori Sil',
      message,
    })
    if (ok) {
      removeGroup(id)
      showToast('success', 'Kategori silindi', `"${name}" kategorisi silindi.${count > 0 ? ` ${count} hizmet "Diğer" grubuna taşındı.` : ''}`)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hizmet Tanımları"
        subtitle="Tetkik, test ve hizmet kataloğunu buradan yönetin."
        action={
          <div className="flex gap-2">
            <button
              onClick={startAddGroup}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              Kategori Yönet
            </button>
            <button
              onClick={startAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Yeni Hizmet
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400">Toplam Hizmet</p>
          <p className="text-2xl font-bold text-slate-800">{catalog.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400">Kategori</p>
          <p className="text-2xl font-bold text-slate-700">{groups.length}</p>
        </div>
        {groups.slice(0, 6).map((group) => {
          const colors = getGroupColor(group.color)
          return (
            <div key={group.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <p className="text-xs text-slate-400 truncate">{group.name}</p>
              </div>
              <p className="text-2xl font-bold text-slate-700">{groupCounts[group.name] ?? 0}</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Hizmet ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <Select
            size="sm"
            label=""
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            options={['Tümü', ...groupNames].map((g) => ({ value: g, label: g }))}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Hizmet Adı</th>
                <th className="px-6 py-4 font-medium">Grup</th>
                <th className="px-6 py-4 font-medium text-right">Fiyat</th>
                <th className="px-6 py-4 font-medium text-right">KDV</th>
                <th className="px-6 py-4 font-medium text-right">KDV Dahil</th>
                <th className="px-6 py-4 font-medium">Firmalar</th>
                <th className="px-6 py-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCatalog.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Hizmet bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredCatalog.map((item) => {
                  const total = item.price * (1 + item.vatRate / 100)
                  const group = groups.find((g) => g.name === item.group)
                  const colors = getGroupColor(group?.color ?? 'slate')
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                          {item.group}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 font-mono">
                        ₺{item.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">%{item.vatRate}</td>
                      <td className="px-6 py-4 text-right text-slate-800 font-medium font-mono">
                        ₺{total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {item.companies.length === 0 ? (
                          <span className="text-slate-400">Tümü</span>
                        ) : (
                          <span className="truncate max-w-[200px] block">{item.companies.join(', ')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(item)}
                            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-sm text-slate-500">
            Toplam: <span className="font-semibold text-slate-800">{filteredCatalog.length}</span> hizmet
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/ayarlar')}
          className="text-sm text-slate-600 hover:text-slate-800 font-medium"
        >
          ← Genel Ayarlar'a Dön
        </button>
        <button
          onClick={() => navigate('/ayarlar/paketler')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-auto"
        >
          Paket Tanımları →
        </button>
      </div>

      {/* Add/Edit Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Hizmet Düzenle' : 'Yeni Hizmet Ekle'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Input
                size="sm"
                label="Hizmet Adı"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Hizmet / test adı"
                required
              />
            </div>
            <Select
              size="sm"
              label="Grup"
              value={form.group}
              onChange={(e) => update('group', e.target.value)}
              options={groupNames.map((g) => ({ value: g, label: g }))}
            />
            <Input
              size="sm"
              label="Fiyat (₺)"
              type="number"
              step="0.01"
              min="0"
              value={String(form.price)}
              onChange={(e) => update('price', Number(e.target.value) || 0)}
              placeholder="0.00"
            />
            <Input
              size="sm"
              label="KDV (%)"
              type="number"
              min="0"
              value={String(form.vatRate)}
              onChange={(e) => update('vatRate', Number(e.target.value) || 0)}
              placeholder="10"
            />
            <div className="flex items-end">
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <p className="text-xs text-slate-500">KDV Dahil Toplam</p>
                <p className="text-lg font-bold text-blue-600">₺{formTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div>
            <Input
              size="sm"
              label="Bağlı Firmalar (virgülle ayırın)"
              value={form.companies.join(', ')}
              onChange={(e) =>
                update(
                  'companies',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="Boş bırakılırsa tüm firmalar için geçerli"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Group Management Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={closeGroupModal}
        title="Kategori Yönetimi"
        size="lg"
      >
        <div className="space-y-4">
          {/* Group list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Mevcut Kategoriler</h4>
              <span className="text-xs text-slate-400">{groups.length} kategori</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {groups.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Henüz kategori yok.</p>
              ) : (
                groups.map((group) => {
                  const colors = getGroupColor(group.color)
                  const count = groupCounts[group.name] ?? 0
                  return (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <span className={`w-3 h-3 rounded-full ${colors.dot} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{group.name}</p>
                        <p className="text-[10px] text-slate-400">{count} hizmet</p>
                      </div>
                      <button
                        onClick={() => startEditGroup(group.id, group.name, group.color)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleGroupDelete(group.id, group.name)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Add/Edit group form */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center gap-2">
              <Folder className="w-3.5 h-3.5" />
              {editingGroupId ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
            </h4>
            <form onSubmit={handleGroupSubmit} className="space-y-3">
              <Input
                size="sm"
                label="Kategori Adı"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="Örn: Mikrobiyoloji"
                required
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Renk</label>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => {
                    const colors = getGroupColor(color)
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setGroupForm({ ...groupForm, color })}
                        className={`w-8 h-8 rounded-lg ${colors.dot} transition-all ${
                          groupForm.color === color
                            ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        title={color}
                      />
                    )
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {editingGroupId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGroupId(null)
                      setGroupForm({ name: '', color: 'blue' })
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
                  >
                    Yeni Ekle
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeGroupModal}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {editingGroupId ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  )
}
