import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { useConfirm } from '../../context/ConfirmContext'
import type { ExternalLab } from '../../types'

const STORAGE_KEY = 'cetka-external-labs'

const defaultLabs: ExternalLab[] = [
  {
    id: 1,
    active: true,
    name: 'Çetka Tarama',
    institutionCode: '0',
    username: 'cetkatanama',
    webServiceAddress: 'http://185.97.119.102:8085/WebService/Dolphin.asmx',
    type: 'Kocaeli Sistem Lab (Dolphin)',
  },
  {
    id: 2,
    active: false,
    name: 'Gebze Sistem Lab',
    institutionCode: '02',
    username: 'CETKA',
    webServiceAddress: 'http://185.103.154.90/WebService/Dolphin.asmx',
    type: 'Gebze Sistem Lab (Dolphin)',
  },
  {
    id: 3,
    active: true,
    name: 'İZMİR RAPORLAMA',
    institutionCode: '87',
    username: 'cetka osgb',
    webServiceAddress: 'https://gesraporlama.infomed.com.tr/',
    type: 'OSGB Raporlama (InfoMED Service)',
  },
  {
    id: 4,
    active: true,
    name: 'Kocaeli Sistem LAB',
    institutionCode: '0',
    username: 'CETKA',
    webServiceAddress: 'http://185.97.119.102:8085/WebService/Dolphin.asmx',
    type: 'Kocaeli Sistem Lab (Dolphin)',
  },
  {
    id: 5,
    active: false,
    name: 'DR NEY',
    institutionCode: '78',
    username: 'cetka osgb',
    webServiceAddress: 'https://drneyraporlama.infomed.com.tr/',
    type: 'DR NEY (InfoMED Service)',
  },
]

function loadLabs(): ExternalLab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ExternalLab[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  return defaultLabs
}

function saveLabs(labs: ExternalLab[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labs))
  } catch {
    // Storage may be unavailable or full; keep the in-memory list usable.
  }
}

export function ExternalLabs() {
  const confirm = useConfirm()
  const [labs, setLabs] = useState<ExternalLab[]>(loadLabs)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLab, setEditingLab] = useState<ExternalLab | null>(null)

  const [form, setForm] = useState({
    active: true,
    name: '',
    institutionCode: '',
    username: '',
    webServiceAddress: '',
    type: '',
  })

  useEffect(() => {
    saveLabs(labs)
  }, [labs])

  const filteredLabs = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return labs
    return labs.filter(
      (lab) =>
        lab.name.toLowerCase().includes(term) ||
        lab.username.toLowerCase().includes(term) ||
        lab.type.toLowerCase().includes(term) ||
        lab.webServiceAddress.toLowerCase().includes(term)
    )
  }, [labs, search])

  const openNew = () => {
    setEditingLab(null)
    setForm({
      active: true,
      name: '',
      institutionCode: '',
      username: '',
      webServiceAddress: '',
      type: '',
    })
    setIsModalOpen(true)
  }

  const openEdit = (lab: ExternalLab) => {
    setEditingLab(lab)
    setForm({
      active: lab.active,
      name: lab.name,
      institutionCode: lab.institutionCode,
      username: lab.username,
      webServiceAddress: lab.webServiceAddress,
      type: lab.type,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => setIsModalOpen(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingLab) {
      setLabs((prev) =>
        prev.map((lab) => (lab.id === editingLab.id ? { ...lab, ...form } : lab))
      )
    } else {
      const id = Math.max(0, ...labs.map((l) => l.id)) + 1
      setLabs((prev) => [...prev, { id, ...form }])
    }
    closeModal()
  }

  const toggleActive = (id: number) => {
    setLabs((prev) => prev.map((lab) => (lab.id === id ? { ...lab, active: !lab.active } : lab)))
  }

  const handleDelete = async (lab: ExternalLab) => {
    const ok = await confirm({
      title: 'Dış Laboratuvar Sil',
      message: `"${lab.name}" dış laboratuvarını silmek istediğinize emin misiniz?`,
    })
    if (ok) {
      setLabs((prev) => prev.filter((l) => l.id !== lab.id))
    }
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <PageHeader
        title="Dış Laboratuvar Tanımları"
        subtitle="Dış laboratuvar bağlantılarını ve gönderim ayarlarını yönetin."
        action={
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Dış Laboratuvar
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-0">
        <div className="overflow-x-auto">
          <table className="table-fixed w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium w-12">#</th>
                <th className="px-3 py-2 font-medium w-16">Aktif</th>
                <th className="px-3 py-2 font-medium">Adı</th>
                <th className="px-3 py-2 font-medium w-24">Kurum Kodu</th>
                <th className="px-3 py-2 font-medium w-28">Kullanıcı Adı</th>
                <th className="px-3 py-2 font-medium">Web Servis Adresi</th>
                <th className="px-3 py-2 font-medium w-44">Türü</th>
                <th className="px-3 py-2 font-medium text-right w-24">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLabs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredLabs.map((lab) => (
                  <tr key={lab.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-slate-600">{lab.id}</td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={lab.active}
                        onChange={() => toggleActive(lab.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-800 font-medium truncate" title={lab.name}>
                      {lab.name}
                    </td>
                    <td className="px-3 py-2 text-slate-600 truncate">{lab.institutionCode}</td>
                    <td className="px-3 py-2 text-slate-600 truncate" title={lab.username}>
                      {lab.username}
                    </td>
                    <td className="px-3 py-2 text-slate-600 truncate" title={lab.webServiceAddress}>
                      {lab.webServiceAddress}
                    </td>
                    <td className="px-3 py-2 text-slate-600 truncate" title={lab.type}>
                      {lab.type}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(lab)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Düzenle"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(lab)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">
                {editingLab ? 'Dış Laboratuvar Düzenle' : 'Yeni Dış Laboratuvar'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="active" className="text-sm text-slate-700">Aktif</label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Adı</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Kurum Kodu</label>
                  <input
                    type="text"
                    value={form.institutionCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, institutionCode: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Kullanıcı Adı</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Web Servis Adresi</label>
                <input
                  type="text"
                  value={form.webServiceAddress}
                  onChange={(e) => setForm((prev) => ({ ...prev, webServiceAddress: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Türü</label>
                <input
                  type="text"
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
