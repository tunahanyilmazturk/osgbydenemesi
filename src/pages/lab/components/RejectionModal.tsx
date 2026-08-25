import { Modal } from '@/shared/components/ui/Modal'

interface RejectionModalProps {
  isOpen: boolean
  serviceName: string | undefined
  rejectionDraft: string
  onRejectionDraftChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

export function RejectionModal({
  isOpen,
  serviceName,
  rejectionDraft,
  onRejectionDraftChange,
  onClose,
  onConfirm,
}: RejectionModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Numune Red Nedeni"
      subtitle={serviceName ? <span className="text-xs font-medium text-slate-600 truncate">{serviceName}</span> : undefined}
      size="md"
    >
      <div className="space-y-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs text-red-800 font-medium">Bu test numune red olarak işaretlenecek.</p>
          <p className="text-[11px] text-red-700 mt-1">Doktor açıklaması N.Red Nedenleri ekranında kalıcı olarak takip edilecektir.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Red Nedeni ve Doktor Açıklaması *</label>
          <textarea
            value={rejectionDraft}
            onChange={(e) => onRejectionDraftChange(e.target.value)}
            rows={5}
            autoFocus
            placeholder="Örn: Numune hemolizli, yeniden numune alınması gerekiyor..."
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-500/10 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!rejectionDraft.trim()}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Numuneyi Reddet
          </button>
        </div>
      </div>
    </Modal>
  )
}
