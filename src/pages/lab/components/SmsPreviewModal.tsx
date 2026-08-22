import { CheckCircle2, MessageSquare, Send } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'

export interface SmsPreviewItem {
  patientName: string
  patientPhone: string
  protocolNo: string
  companyName: string
  message: string
  pdfUrl: string
}

interface SmsPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  smsList: SmsPreviewItem[]
  onConfirm: () => Promise<void>
}

export function SmsPreviewModal({ isOpen, onClose, smsList, onConfirm }: SmsPreviewModalProps) {
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [done, setDone] = useState(false)

  const handleSend = async () => {
    setSending(true)
    setSentCount(0)
    setFailedCount(0)
    await onConfirm()
    setSending(false)
    setDone(true)
  }

  const handleClose = () => {
    setDone(false)
    setSentCount(0)
    setFailedCount(0)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="SMS Gönderim Önizleme"
      size="md"
    >
      <div className="space-y-4">
        {/* Özet */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] bg-blue-50 rounded-lg p-3">
          <span className="flex items-center gap-1.5 text-blue-700 font-medium">
            <MessageSquare className="w-3.5 h-3.5" />
            {smsList.length} hasta için SMS hazırlanıyor
          </span>
        </div>

        {/* SMS listesi */}
        <div className="max-h-[350px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
          {smsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500">Gönderilecek SMS yok.</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Sonuçları onaylanan ve telefonu olan hastalar burada listelenir.
              </p>
            </div>
          ) : (
            smsList.map((sms, i) => (
              <div key={i} className="p-3 space-y-2">
                {/* Hasta bilgisi */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate">{sms.patientName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">#{sms.protocolNo}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">{sms.patientPhone}</span>
                </div>
                {/* Firma */}
                <span className="text-[10px] text-slate-400">{sms.companyName}</span>
                {/* Mesaj */}
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-[11px] text-slate-600 leading-relaxed">{sms.message}</p>
                </div>
                {/* PDF link */}
                <a
                  href={sms.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-600 hover:underline block truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {sms.pdfUrl}
                </a>
              </div>
            ))
          )}
        </div>

        {/* Sonuç (gönderim sonrası) */}
        {done && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div className="text-xs">
              <p className="font-semibold text-emerald-800">SMS gönderimi tamamlandı</p>
              <p className="text-emerald-600 mt-0.5">
                {sentCount} başarılı{failedCount > 0 ? `, ${failedCount} başarısız` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Alt butonlar */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] text-slate-400">
            {done
              ? 'Gönderim tamamlandı'
              : sending
                ? 'Gönderiliyor...'
                : `${smsList.length} SMS gönderilecek`}
          </p>
          <div className="flex items-center gap-2">
            {done ? (
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Kapat
              </button>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  disabled={sending}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-40"
                >
                  İptal
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || smsList.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'Gönderiliyor...' : `${smsList.length} SMS Gönder`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
