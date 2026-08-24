import { useState } from 'react'
import { Check, Eye, Pencil, Plus, Trash2, X } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { useToast } from '../../context/ToastContext'
import {
  type EyeTemplate,
  type EyeTemplateCategory,
  EYE_TEMPLATE_CATEGORIES,
  loadEyeTemplates,
  addEyeTemplate,
  updateEyeTemplate,
  deleteEyeTemplate,
} from '../../utils/eyeTemplates'

const COLOR_CLASSES: Record<string, { border: string; bg: string; header: string; badge: string; button: string }> = {
  blue: {
    border: 'border-blue-200',
    bg: 'bg-blue-50/50',
    header: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
    badge: 'bg-blue-100 text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  amber: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/50',
    header: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
    badge: 'bg-amber-100 text-amber-700',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
  emerald: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/50',
    header: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-700',
    button: 'bg-emerald-600 hover:bg-emerald-700',
  },
}

export function EyeExamTemplates() {
  const { showToast } = useToast()
  const [templates, setTemplates] = useState<EyeTemplate[]>(loadEyeTemplates)
  const [newTexts, setNewTexts] = useState<Record<EyeTemplateCategory, string>>({
    evaluation: '',
    diagnosis: '',
    resultText: '',
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const refresh = () => setTemplates(loadEyeTemplates())

  const handleAdd = (category: EyeTemplateCategory) => {
    const text = newTexts[category].trim()
    if (!text) return
    addEyeTemplate(category, text)
    setNewTexts((prev) => ({ ...prev, [category]: '' }))
    refresh()
    showToast('success', 'Şablon eklendi.')
  }

  const handleDelete = (id: string) => {
    deleteEyeTemplate(id)
    refresh()
    showToast('success', 'Şablon silindi.')
  }

  const handleStartEdit = (t: EyeTemplate) => {
    setEditingId(t.id)
    setEditText(t.text)
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    if (updateEyeTemplate(editingId, editText)) {
      showToast('success', 'Şablon güncellendi.')
    }
    setEditingId(null)
    setEditText('')
    refresh()
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  return (
    <div className="space-y-4 h-full flex flex-col min-h-0">
      <PageHeader
        title="Göz Muayenesi Şablonları"
        subtitle="Değerlendirme, tanı ve sonuç yorumu şablonlarını yönetin. Göz muayenesi modalında kullanılır."
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {EYE_TEMPLATE_CATEGORIES.map((cat) => {
            const colors = COLOR_CLASSES[cat.color]
            const items = templates.filter((t) => t.category === cat.key)

            return (
              <div key={cat.key} className={`rounded-2xl border-2 ${colors.border} ${colors.bg} overflow-hidden flex flex-col`}>
                {/* Başlık */}
                <div className={`flex items-center justify-between px-4 py-3 ${colors.header}`}>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <h3 className="text-sm font-bold tracking-wide">{cat.label}</h3>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/20">
                    {items.length}
                  </span>
                </div>

                {/* Şablon listesi */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 max-h-[400px]">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Eye className="w-7 h-7 text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400">Henüz şablon yok</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Aşağıdan ekleyebilirsiniz</p>
                    </div>
                  ) : (
                    items.map((t) => (
                      <div
                        key={t.id}
                        className="group bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-sm transition-shadow"
                      >
                        {editingId === t.id ? (
                          /* Düzenleme modu */
                          <div className="space-y-2">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs text-slate-700 border border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={handleSaveEdit}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                Kaydet
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                              >
                                <X className="w-3 h-3" />
                                İptal
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Görüntüleme modu */
                          <div className="flex items-start gap-2">
                            <p className="flex-1 text-xs text-slate-700 leading-relaxed">{t.text}</p>
                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStartEdit(t)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Düzenle"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Sil"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Yeni şablon ekleme */}
                <div className="p-3 border-t border-slate-200 bg-white">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newTexts[cat.key]}
                      onChange={(e) => setNewTexts((prev) => ({ ...prev, [cat.key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAdd(cat.key)
                        }
                      }}
                      placeholder="Yeni şablon yazın..."
                      className="flex-1 px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => handleAdd(cat.key)}
                      disabled={!newTexts[cat.key].trim()}
                      className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${colors.button}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ekle
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bilgi notu */}
        <div className="mt-4 bg-blue-50 rounded-xl p-3 flex items-start gap-2">
          <Eye className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-[11px] text-blue-700 leading-relaxed">
            <p className="font-semibold mb-0.5">Nasıl Kullanılır?</p>
            <p>
              Burada eklediğiniz şablonlar, göz muayenesi modalında ilgili alanın altında rozet olarak görünür.
              Tıklayarak hızlıca metin alanına ekleyebilirsiniz. Değerlendirme, Tanı ve Sonuç Yorumu alanları
              için ayrı şablonlar tanımlayabilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
