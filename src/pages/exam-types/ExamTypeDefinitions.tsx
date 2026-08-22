import { useMemo, useState } from 'react'
import { Plus, Save, Search, X } from 'lucide-react'
import { useExamTypes } from '../../context/ExamTypesContext'
import { PageHeader } from '../../components/PageHeader'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

export function ExamTypeDefinitions() {
  const { examTypes, addExamType, updateExamType, removeExamType, toggleMobileHealth } = useExamTypes()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [search, setSearch] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newMobile, setNewMobile] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editMobile, setEditMobile] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return examTypes.filter(
      (et) =>
        et.name.toLowerCase().includes(term) ||
        et.code.toLowerCase().includes(term)
    )
  }, [examTypes, search])

  const handleAdd = () => {
    const code = newCode.trim().toUpperCase()
    const name = newName.trim()
    if (!code || !name) {
      showToast('warning', 'Kod ve ad zorunludur')
      return
    }
    if (examTypes.some((et) => et.code.toLowerCase() === code.toLowerCase())) {
      showToast('warning', 'Bu kod zaten mevcut')
      return
    }
    addExamType({ code, name, mobileHealth: newMobile })
    setNewCode('')
    setNewName('')
    setNewMobile(false)
    showToast('success', 'Muayene türü eklendi')
  }

  const startEdit = (et: typeof examTypes[0]) => {
    setEditingId(et.id)
    setEditCode(et.code)
    setEditName(et.name)
    setEditMobile(et.mobileHealth)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditCode('')
    setEditName('')
    setEditMobile(false)
  }

  const handleUpdate = (id: number) => {
    const code = editCode.trim().toUpperCase()
    const name = editName.trim()
    if (!code || !name) {
      showToast('warning', 'Kod ve ad zorunludur')
      return
    }
    if (examTypes.some((et) => et.id !== id && et.code.toLowerCase() === code.toLowerCase())) {
      showToast('warning', 'Bu kod zaten mevcut')
      return
    }
    updateExamType(id, { code, name, mobileHealth: editMobile })
    setEditingId(null)
    showToast('success', 'Muayene türü güncellendi')
  }

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: 'Muayene Türü Sil',
      message: `"${name}" muayene türünü silmek istediğinize emin misiniz?`,
    })
    if (ok) {
      removeExamType(id)
      showToast('info', 'Muayene türü silindi')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Muayene Türü Tanımları"
        subtitle="Protokol oluştururken kullanılacak muayene türlerini tanımlayın."
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Kod"
              className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Muayene türü adı"
              className="w-56 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={newMobile}
                onChange={(e) => setNewMobile(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              Mobil Sağlık T.
            </label>
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Yeni Muayene Türü
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Kodu</th>
              <th className="px-4 py-3 font-medium">Adı</th>
              <th className="px-4 py-3 font-medium text-center">Mobil Sağlık T.</th>
              <th className="px-4 py-3 font-medium text-right">**</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((et) => (
              <tr key={et.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-600 font-mono">{et.id}</td>
                <td className="px-4 py-3 text-slate-800">
                  {editingId === et.id ? (
                    <input
                      type="text"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <span className="font-mono font-medium">{et.code}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-800">
                  {editingId === et.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full max-w-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <span className="font-medium">{et.name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {editingId === et.id ? (
                    <input
                      type="checkbox"
                      checked={editMobile}
                      onChange={(e) => setEditMobile(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  ) : (
                    <input
                      type="checkbox"
                      checked={et.mobileHealth}
                      onChange={() => toggleMobileHealth(et.id)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editingId === et.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleUpdate(et.id)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                        title="Kaydet"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                        title="İptal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(et)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(et.id, et.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Sil"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  Arama kriterine uygun muayene türü bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
