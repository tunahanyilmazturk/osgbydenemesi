import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Edit2, Folder, Plus, Save, Search, Settings2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useServices, getGroupColor, DEFAULT_VAT_RATE } from '../../context/ServicesContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/PageHeader'
import { Select } from '../../components/ui/Select'
import { defaultExternalLabs } from '../external-labs/mocks/externalLabsDefaults'
import type { ExternalLab, ServiceCatalogItem, ServiceGroup } from '../../types'

const availableColors = ['blue', 'red', 'violet', 'amber', 'emerald', 'slate', 'pink', 'cyan']

const emptyForm: Omit<ServiceCatalogItem, 'id'> = {
  code: 0,
  name: '',
  group: 'Biyokimya',
  price: 0,
  vatRate: DEFAULT_VAT_RATE,
  isActive: true,
  description: '',
  unit: '',
  referenceRange: '',
  labIds: [],
  tubeTypeId: null,
}

function loadExternalLabs(): ExternalLab[] {
  try {
    const raw = localStorage.getItem('cetka-external-labs')
    if (raw) {
      const parsed = JSON.parse(raw) as ExternalLab[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  return defaultExternalLabs
}

type SortField = 'code' | 'name' | 'group' | 'price' | 'vatRate' | 'total'
type SortOrder = 'asc' | 'desc'

function SortIcon({ field, activeField, activeOrder }: { field: SortField; activeField: SortField; activeOrder: SortOrder }) {
  if (activeField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
  return activeOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
}

export function ServiceDefinitions() {
  const navigate = useNavigate()
  const { catalog, groups, tubeTypes, addCatalogItem, updateCatalogItem, removeCatalogItem, addGroup, updateGroup, removeGroup } = useServices()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<ServiceCatalogItem, 'id'>>(emptyForm)

  // Filters
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('Tümü')
  const [statusFilter, setStatusFilter] = useState<'Tümü' | 'Aktif' | 'Pasif'>('Tümü')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Group form
  const [groupForm, setGroupForm] = useState({ name: '', color: 'blue', labIds: [] as number[], defaultTubeTypeId: null as number | null })
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [externalLabs, setExternalLabs] = useState<ExternalLab[]>(defaultExternalLabs)

  const groupNames = useMemo(() => groups.map((g) => g.name), [groups])

  useEffect(() => {
    const refresh = () => setExternalLabs(loadExternalLabs())
    refresh()
    window.addEventListener('focus', refresh)
    const interval = setInterval(refresh, 1000)
    return () => {
      window.removeEventListener('focus', refresh)
      clearInterval(interval)
    }
  }, [])

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase()
    const min = priceMin ? Number(priceMin) : null
    const max = priceMax ? Number(priceMax) : null

    let items = catalog.filter((c) => {
      const matchesSearch = !term || c.name.toLowerCase().includes(term) || String(c.code).toLowerCase().includes(term)
      const matchesGroup = groupFilter === 'Tümü' || c.group === groupFilter
      const matchesStatus = statusFilter === 'Tümü' || (statusFilter === 'Aktif' ? c.isActive : !c.isActive)
      const matchesPrice = (min === null || c.price >= min) && (max === null || c.price <= max)
      return matchesSearch && matchesGroup && matchesStatus && matchesPrice
    })

    items = [...items].sort((a, b) => {
      let aVal: number | string = ''
      let bVal: number | string = ''
      if (sortBy === 'code') {
        aVal = a.code
        bVal = b.code
      } else if (sortBy === 'name') {
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
      } else if (sortBy === 'group') {
        aVal = a.group.toLowerCase()
        bVal = b.group.toLowerCase()
      } else if (sortBy === 'price') {
        aVal = a.price
        bVal = b.price
      } else if (sortBy === 'vatRate') {
        aVal = a.vatRate
        bVal = b.vatRate
      } else if (sortBy === 'total') {
        aVal = a.price * (1 + a.vatRate / 100)
        bVal = b.price * (1 + b.vatRate / 100)
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal, 'tr-TR') : bVal.localeCompare(aVal, 'tr-TR')
      }
      return sortOrder === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
    })

    return items
  }, [catalog, search, groupFilter, statusFilter, priceMin, priceMax, sortBy, sortOrder])

  // Pagination: reset on filter/sort/pageSize change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, groupFilter, statusFilter, priceMin, priceMax, sortBy, sortOrder, itemsPerPage])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredCatalog.length / itemsPerPage)), [filteredCatalog.length, itemsPerPage])
  const safePage = Math.min(currentPage, totalPages)
  const paginatedCatalog = useMemo(
    () => filteredCatalog.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage),
    [filteredCatalog, safePage, itemsPerPage]
  )

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    catalog.forEach((c) => {
      if (c.isActive) counts[c.group] = (counts[c.group] ?? 0) + 1
    })
    return counts
  }, [catalog])

  const startAdd = () => {
    const firstGroup = groups.find((g) => g.name === (groupNames[0] ?? 'Diğer'))
    setForm({
      ...emptyForm,
      group: groupNames[0] ?? 'Diğer',
      tubeTypeId: firstGroup?.defaultTubeTypeId ?? null,
    })
    setEditingId(null)
    setIsModalOpen(true)
  }

  const startEdit = (item: ServiceCatalogItem) => {
    setForm({
      code: item.code,
      name: item.name,
      group: item.group,
      price: item.price,
      vatRate: item.vatRate,
      isActive: item.isActive,
      description: item.description,
      unit: item.unit,
      referenceRange: item.referenceRange,
      labIds: [...item.labIds],
      tubeTypeId: item.tubeTypeId,
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
    if (form.code <= 0 || !form.name.trim()) return
    if (editingId) {
      updateCatalogItem(editingId, form)
      showToast('success', 'Hizmet güncellendi', `"${form.name}" hizmeti kaydedildi.`)
    } else {
      addCatalogItem(form)
      showToast('success', 'Hizmet eklendi', `"${form.name}" hizmeti kataloğa eklendi.`)
    }
    closeModal()
  }

  const update = <K extends keyof Omit<ServiceCatalogItem, 'id'>>(field: K, value: Omit<ServiceCatalogItem, 'id'>[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleNameChange = (value: string) => {
    update('name', value)
  }

  const handleCodeChange = (value: string) => {
    update('code', Number(value) || 0)
  }

  const handleGroupChange = (groupName: string) => {
    const group = groups.find((g) => g.name === groupName)
    update('group', groupName)
    if (group?.defaultTubeTypeId && form.tubeTypeId === null) {
      update('tubeTypeId', group.defaultTubeTypeId)
    }
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

  const handleDuplicate = (item: ServiceCatalogItem) => {
    const maxCode = catalog.length > 0 ? Math.max(...catalog.map((c) => c.code)) : 0
    const newCode = maxCode + 1
    const newItem: Omit<ServiceCatalogItem, 'id'> = {
      code: newCode,
      name: `${item.name} (Kopya)`,
      group: item.group,
      price: item.price,
      vatRate: item.vatRate,
      isActive: item.isActive,
      description: item.description,
      unit: item.unit,
      referenceRange: item.referenceRange,
      labIds: [...item.labIds],
      tubeTypeId: item.tubeTypeId,
    }
    addCatalogItem(newItem)
    showToast('success', 'Hizmet kopyalandı', `"${item.name}" kopyası oluşturuldu.`)
  }

  const formTotal = form.price * (1 + form.vatRate / 100)

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const clearFilters = () => {
    setSearch('')
    setGroupFilter('Tümü')
    setStatusFilter('Tümü')
    setPriceMin('')
    setPriceMax('')
    setSortBy('name')
    setSortOrder('asc')
  }

  // Group modal handlers
  const randomColor = () => availableColors[Math.floor(Math.random() * availableColors.length)]

  const startAddGroup = () => {
    setGroupForm({ name: '', color: randomColor(), labIds: [], defaultTubeTypeId: null })
    setEditingGroupId(null)
    setIsGroupModalOpen(true)
  }

  const startEditGroup = (group: ServiceGroup) => {
    setGroupForm({ name: group.name, color: group.color, labIds: group.labIds ?? [], defaultTubeTypeId: group.defaultTubeTypeId ?? null })
    setEditingGroupId(group.id)
    setIsGroupModalOpen(true)
  }

  const closeGroupModal = () => {
    setIsGroupModalOpen(false)
    setEditingGroupId(null)
    setGroupForm({ name: '', color: 'blue', labIds: [], defaultTubeTypeId: null })
  }

  const toggleGroupLab = (labId: number) => {
    setGroupForm((prev) => {
      const has = prev.labIds.includes(labId)
      const labIds = has ? prev.labIds.filter((id) => id !== labId) : [...prev.labIds, labId]
      return { ...prev, labIds }
    })
  }

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupForm.name.trim()) return
    if (editingGroupId) {
      updateGroup(editingGroupId, { name: groupForm.name.trim(), color: groupForm.color, labIds: groupForm.labIds, defaultTubeTypeId: groupForm.defaultTubeTypeId })
      showToast('success', 'Kategori güncellendi', `"${groupForm.name.trim()}" kategorisi kaydedildi.`)
    } else {
      addGroup(groupForm.name.trim(), groupForm.color, groupForm.labIds, groupForm.defaultTubeTypeId)
      setGroupForm({ name: '', color: randomColor(), labIds: [], defaultTubeTypeId: null })
      showToast('success', 'Kategori eklendi', `"${groupForm.name.trim()}" kategorisi eklendi.`)
    }
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

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-4 relative">
            <label className="block font-semibold text-slate-700 mb-1 text-xs">Hizmet Ara</label>
            <Search className="absolute left-3 top-[calc(1.5rem+0.5rem)] -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Hizmet adı veya kod ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              size="sm"
              label="Grup"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              options={['Tümü', ...groupNames].map((g) => ({ value: g, label: g }))}
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              size="sm"
              label="Durum"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'Tümü' | 'Aktif' | 'Pasif')}
              options={[
                { value: 'Tümü', label: 'Tümü' },
                { value: 'Aktif', label: 'Aktif' },
                { value: 'Pasif', label: 'Pasif' },
              ]}
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block font-semibold text-slate-700 mb-1 text-xs">Min Fiyat</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block font-semibold text-slate-700 mb-1 text-xs">Max Fiyat</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="∞"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div className="lg:col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <Select
                size="sm"
                label="Sırala"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                options={[
                  { value: 'name', label: 'Hizmet Adı' },
                  { value: 'group', label: 'Grup' },
                  { value: 'price', label: 'Fiyat' },
                  { value: 'vatRate', label: 'KDV' },
                  { value: 'total', label: 'KDV Dahil' },
                ]}
              />
            </div>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
              title={sortOrder === 'asc' ? 'Artan' : 'Azalan'}
            >
              {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {(search || groupFilter !== 'Tümü' || statusFilter !== 'Tümü' || priceMin || priceMax) && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{filteredCatalog.length}</span> hizmet filtrelendi
            </span>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium w-24">
                  <button onClick={() => handleSort('code')} className="flex items-center gap-1.5 hover:text-slate-700">
                    Kod
                    <SortIcon activeField={sortBy} activeOrder={sortOrder} field="code" />
                  </button>
                </th>
                <th className="px-6 py-3 font-medium">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 hover:text-slate-700">
                    Hizmet Adı
                    <SortIcon activeField={sortBy} activeOrder={sortOrder} field="name" />
                  </button>
                </th>
                <th className="px-6 py-3 font-medium">
                  <button onClick={() => handleSort('group')} className="flex items-center gap-1.5 hover:text-slate-700">
                    Grup
                    <SortIcon activeField={sortBy} activeOrder={sortOrder} field="group" />
                  </button>
                </th>
                <th className="px-6 py-3 font-medium text-right">
                  <button onClick={() => handleSort('price')} className="flex items-center justify-end gap-1.5 hover:text-slate-700 w-full">
                    Fiyat
                    <SortIcon activeField={sortBy} activeOrder={sortOrder} field="price" />
                  </button>
                </th>
                <th className="px-6 py-3 font-medium text-right">
                  <button onClick={() => handleSort('vatRate')} className="flex items-center justify-end gap-1.5 hover:text-slate-700 w-full">
                    KDV
                    <SortIcon activeField={sortBy} activeOrder={sortOrder} field="vatRate" />
                  </button>
                </th>
                <th className="px-6 py-3 font-medium text-right">
                  <button onClick={() => handleSort('total')} className="flex items-center justify-end gap-1.5 hover:text-slate-700 w-full">
                    KDV Dahil
                    <SortIcon activeField={sortBy} activeOrder={sortOrder} field="total" />
                  </button>
                </th>
                <th className="px-6 py-3 font-medium text-center">Durum</th>
                <th className="px-6 py-3 font-medium">Tüp Tipi</th>
                <th className="px-6 py-3 font-medium">Dış Lab</th>
                <th className="px-6 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCatalog.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <Search className="w-10 h-10 text-slate-300 mb-2" />
                      <p>Filtreye uygun hizmet bulunamadı.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCatalog.map((item) => {
                  const total = item.price * (1 + item.vatRate / 100)
                  const group = groups.find((g) => g.name === item.group)
                  const colors = getGroupColor(group?.color ?? 'slate')
                  const effectiveTubeTypeId = item.tubeTypeId ?? group?.defaultTubeTypeId ?? null
                  const tubeType = effectiveTubeTypeId ? tubeTypes.find((t) => t.id === effectiveTubeTypeId) : null
                  const activeLabsForItem = externalLabs.filter((l) => item.labIds?.includes(l.id))
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${!item.isActive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-xs font-mono font-medium rounded-md">
                          {item.code || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{item.name}</div>
                        {item.description && <div className="text-xs text-slate-400 truncate max-w-[250px]">{item.description}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${colors.hex}15`, color: colors.hex }}
                        >
                          {item.group}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 font-mono">₺{item.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-slate-600">%{item.vatRate}</td>
                      <td className="px-6 py-4 text-right text-slate-800 font-medium font-mono">₺{total.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {item.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {tubeType ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-white ring-1 ring-slate-100 shrink-0"
                              style={{ backgroundColor: tubeType.colorCode }}
                            />
                            <span className="text-xs text-slate-700 truncate max-w-[120px]" title={tubeType.name}>
                              {tubeType.name}
                            </span>
                            {item.tubeTypeId === null && (
                              <span className="text-[10px] text-slate-400 truncate" title="Kategorinin varsayılan tüp tipi">
                                (varsayılansı)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {activeLabsForItem.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {activeLabsForItem.map((lab) => (
                              <span key={lab.id} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] truncate max-w-[100px]" title={lab.name}>
                                {lab.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDuplicate(item)}
                            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Kopyala"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
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
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-500">
              Toplam: <span className="font-semibold text-slate-800">{filteredCatalog.length}</span> hizmet
            </span>
            <div className="h-4 w-px bg-slate-200" />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Sayfa başına
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {filteredCatalog.length > 0
                ? `${(safePage - 1) * itemsPerPage + 1} - ${Math.min(safePage * itemsPerPage, filteredCatalog.length)} / ${filteredCatalog.length}`
                : '0 / 0'}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safePage <= 1}
                className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-slate-200 transition-colors"
                title="İlk sayfa"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-slate-200 transition-colors"
                title="Önceki sayfa"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 min-w-[80px] text-center">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-slate-200 transition-colors"
                title="Sonraki sayfa"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage >= totalPages}
                className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-slate-200 transition-colors"
                title="Son sayfa"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
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
        subtitle={editingId ? 'Hizmet bilgilerini güncelleyin.' : 'Yeni bir hizmet/test tanımı oluşturun.'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Temel Bilgiler */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Temel Bilgiler</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                size="sm"
                label="Test Kodu"
                type="number"
                min="1"
                value={form.code || ''}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Örn: 1001"
                required
              />
              <Input
                size="sm"
                label="Hizmet Adı"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Hizmet / test adı"
                required
              />
              <Select
                size="sm"
                label="Grup"
                value={form.group}
                onChange={(e) => handleGroupChange(e.target.value)}
                options={groupNames.map((g) => ({ value: g, label: g }))}
              />
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

          {/* Fiyatlandırma */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fiyatlandırma</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2">
                  <p className="text-xs text-slate-500">KDV Dahil Toplam</p>
                  <p className="text-lg font-bold text-blue-600">₺{formTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Açıklama */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Açıklama</h4>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Hizmet ile ilgili kısa açıklama, notlar veya yönlendirmeler..."
              rows={3}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 resize-none"
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
              disabled={form.code <= 0 || !form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        size="xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Group list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-700 uppercase">Mevcut Kategoriler</h4>
              <span className="text-xs text-slate-400">{groups.length} kategori</span>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {groups.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Henüz kategori yok.</p>
              ) : (
                groups.map((group) => {
                  const colors = getGroupColor(group.color)
                  const count = groupCounts[group.name] ?? 0
                  return (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: colors.hex || group.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{group.name}</p>
                        <p className="text-[10px] text-slate-400">{count} hizmet</p>
                      </div>
                      <button
                        onClick={() => startEditGroup(group)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleGroupDelete(group.id, group.name)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Add/Edit group form */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5">
            <h4 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
              <Folder className="w-4 h-4" />
              {editingGroupId ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
            </h4>
            <form onSubmit={handleGroupSubmit} className="space-y-4">
              <Input
                size="sm"
                label="Kategori Adı"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="Örn: Mikrobiyoloji"
                required
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">Renk</label>
                  <button
                    type="button"
                    onClick={() => setGroupForm({ ...groupForm, color: randomColor() })}
                    className="text-[10px] px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors"
                    title="Rastgele renk seç"
                  >
                    Rastgele
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {availableColors.map((color) => {
                    const colors = getGroupColor(color)
                    const isSelected = groupForm.color === color
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setGroupForm({ ...groupForm, color })}
                        className={`w-9 h-9 rounded-xl transition-all border-2 ${
                          isSelected
                            ? 'border-slate-800 scale-110 shadow-md'
                            : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: colors.hex }}
                        title={color}
                      />
                    )
                  })}
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                  <div
                    className="w-10 h-10 rounded-lg border border-slate-200 shrink-0"
                    style={{ backgroundColor: groupForm.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                      Özel Renk Seç
                    </label>
                    <input
                      type="color"
                      value={groupForm.color.startsWith('#') ? groupForm.color : getGroupColor(groupForm.color).hex}
                      onChange={(e) => setGroupForm({ ...groupForm, color: e.target.value })}
                      className="w-full h-8 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <Select
                size="sm"
                label="Varsayılan Tüp Tipi"
                value={groupForm.defaultTubeTypeId === null ? '' : String(groupForm.defaultTubeTypeId)}
                onChange={(e) => setGroupForm({ ...groupForm, defaultTubeTypeId: e.target.value ? Number(e.target.value) : null })}
                options={[
                  { value: '', label: 'Varsayılan tüp tipi seçiniz' },
                  ...tubeTypes
                    .filter((t) => t.isActive)
                    .map((t) => ({ value: String(t.id), label: t.name })),
                ]}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  İzin Verilen Dış Laboratuvarlar
                </label>
                {externalLabs.length === 0 ? (
                  <p className="text-xs text-slate-500">Tanımlı dış laboratuvar bulunamadı.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-3 bg-white rounded-xl border border-slate-200">
                    {externalLabs.map((lab) => (
                      <label
                        key={lab.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={groupForm.labIds.includes(lab.id)}
                          onChange={() => toggleGroupLab(lab.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-700 truncate" title={lab.name}>
                          {lab.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {editingGroupId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGroupId(null)
                      setGroupForm({ name: '', color: randomColor(), labIds: [], defaultTubeTypeId: null })
                    }}
                    className="px-3 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
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
