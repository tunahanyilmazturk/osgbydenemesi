import { FileText, Plus, StickyNote, Trash2 } from 'lucide-react'
import { Modal } from '@/shared/components/ui/Modal'

interface NoteModalState {
  serviceId: number
  serviceName: string
  note: string
}

interface NoteModalProps {
  noteModal: NoteModalState | null
  noteDraft: string
  showTemplateForm: boolean
  newTemplateName: string
  noteTemplates: string[]
  onNoteDraftChange: (value: string) => void
  onShowTemplateFormChange: (show: boolean) => void
  onNewTemplateNameChange: (value: string) => void
  onAddTemplate: () => void
  onRemoveTemplate: (tpl: string) => void
  onSaveTemplateFromDraft: () => void
  onDeleteNote: () => void
  onClose: () => void
  onSave: () => void
}

export function NoteModal({
  noteModal,
  noteDraft,
  showTemplateForm,
  newTemplateName,
  noteTemplates,
  onNoteDraftChange,
  onShowTemplateFormChange,
  onNewTemplateNameChange,
  onAddTemplate,
  onRemoveTemplate,
  onSaveTemplateFromDraft,
  onDeleteNote,
  onClose,
  onSave,
}: NoteModalProps) {
  return (
    <Modal
      isOpen={!!noteModal}
      onClose={onClose}
      title="Test Notu"
      subtitle={noteModal ? (
        <span className="text-xs font-medium text-slate-600 truncate">{noteModal.serviceName}</span>
      ) : undefined}
      size="lg"
    >
      {noteModal && (
        <div className="flex gap-3 h-[420px]">
          {/* Sol sidebar — Şablon yönetimi */}
          <div className="w-[260px] shrink-0 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-slate-700">Şablonlar</span>
                <span className="text-[10px] text-slate-400">({noteTemplates.length})</span>
              </div>
              <button
                onClick={() => onShowTemplateFormChange(!showTemplateForm)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Yeni Şablon Ekle"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Yeni şablon ekleme formu */}
            {showTemplateForm && (
              <div className="p-2 border-b border-slate-200 bg-blue-50">
                <textarea
                  value={newTemplateName}
                  onChange={(e) => onNewTemplateNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAddTemplate() }
                    if (e.key === 'Escape') { onShowTemplateFormChange(false); onNewTemplateNameChange('') }
                  }}
                  placeholder="Şablon metnini yazın... (Enter ile kaydet)"
                  autoFocus
                  rows={3}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                />
                <div className="flex gap-1 mt-1.5">
                  <button
                    onClick={onAddTemplate}
                    className="flex-1 px-2 py-1 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => { onShowTemplateFormChange(false); onNewTemplateNameChange('') }}
                    className="px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            )}

            {/* Şablon listesi */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
              {noteTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-3">
                  <StickyNote className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-[10px] text-slate-400">Henüz şablon yok.</p>
                  <p className="text-[10px] text-slate-400">"+" ile ekleyin.</p>
                </div>
              ) : (
                noteTemplates.map((tpl, i) => (
                  <div
                    key={tpl}
                    className="group flex items-start gap-1.5 px-2 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                    onClick={() => onNoteDraftChange(tpl)}
                  >
                    <span className="shrink-0 w-5 h-5 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center text-[9px] font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <p className="flex-1 text-[10px] text-slate-700 leading-snug line-clamp-2">{tpl}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveTemplate(tpl) }}
                      className="shrink-0 p-0.5 text-slate-300 hover:text-red-500 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Alt bilgi */}
            <div className="px-3 py-1.5 border-t border-slate-200 bg-white">
              <p className="text-[9px] text-slate-400 text-center">Şablonu seçmek için tıklayın</p>
            </div>
          </div>

          {/* Sağ taraf — Not içeriği */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Üst bilgi */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{noteModal.serviceName}</p>
                <p className="text-[10px] text-slate-500">Test notu düzenle</p>
              </div>
              {noteModal.note && (
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-md text-[10px] font-medium text-amber-700 shrink-0">
                  <StickyNote className="w-2.5 h-2.5" />
                  Mevcut not var
                </span>
              )}
            </div>

            {/* Not alanı */}
            <textarea
              value={noteDraft}
              onChange={(e) => onNoteDraftChange(e.target.value)}
              autoFocus
              placeholder="Notunuzu yazın veya soldaki şablonlardan birini seçin..."
              className="flex-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white resize-none leading-relaxed"
            />

            {/* Alt aksiyonlar */}
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-2">
                {noteDraft.trim() && !noteTemplates.includes(noteDraft.trim()) && (
                  <button
                    onClick={onSaveTemplateFromDraft}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Şablon olarak kaydet
                  </button>
                )}
                {noteModal.note && (
                  <button
                    onClick={onDeleteNote}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Notu Sil
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  onClick={onSave}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
