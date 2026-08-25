import { useState } from 'react'
import { CheckCircle2, ShieldCheck, Syringe } from 'lucide-react'
import { Modal } from '@/shared/components/ui/Modal'
import { nowLocalDateTime } from '@/shared/lib/date'
import { useAuth } from '@/state/AuthContext'
import type { ProtocolService, TetanusVaccinationData } from '@/shared/types'

interface TetanusVaccinationModalProps {
  isOpen: boolean
  onClose: () => void
  service: ProtocolService | null
  patientName?: string
  patientTc?: string
  company?: string
  protocolNo?: string
  onSave: (data: string, resultText: string) => void
}

const inputClass = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500'

function createDefaultData(displayName = ''): TetanusVaccinationData {
  return {
    version: 1,
    applicationDate: nowLocalDateTime(),
    vaccineName: 'Tetanoz Aşısı',
    dose: '',
    doseNumber: 'Diğer',
    administrationRoute: 'Diğer',
    applicationSite: '',
    manufacturer: '',
    lotNumber: '',
    expiryDate: '',
    nextDoseDate: '',
    administeredBy: displayName,
    observation: '',
    adverseReaction: '',
    notes: '',
    updatedAt: nowLocalDateTime(),
  }
}

function readData(service: ProtocolService, displayName = ''): TetanusVaccinationData {
  const fallback = createDefaultData(displayName)
  if (!service.tetanusVaccinationData) return fallback
  try {
    return { ...fallback, ...JSON.parse(service.tetanusVaccinationData) as Partial<TetanusVaccinationData> }
  } catch {
    return fallback
  }
}

export function TetanusVaccinationModal({
  service,
  ...props
}: TetanusVaccinationModalProps) {
  if (!service) return null
  return <TetanusVaccinationModalContent key={`${service.id}-${service.tetanusVaccinationData ?? ''}`} {...props} service={service} />
}

function TetanusVaccinationModalContent({
  isOpen,
  onClose,
  service,
  patientName,
  patientTc,
  company,
  protocolNo,
  onSave,
}: Omit<TetanusVaccinationModalProps, 'service'> & { service: ProtocolService }) {
  const { currentUser } = useAuth()
  const [data, setData] = useState<TetanusVaccinationData>(() => readData(service, currentUser?.displayName))

  const update = <K extends keyof TetanusVaccinationData>(key: K, value: TetanusVaccinationData[K]) => {
    setData((previous) => ({ ...previous, [key]: value }))
  }

  const handleSave = () => {
    if (!data.applicationDate || !data.administeredBy.trim()) return
    const saved = { ...data, updatedAt: nowLocalDateTime() }
    onSave(JSON.stringify(saved), 'Tetanoz aşısı uygulandı')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tetanoz Aşı Uygulaması"
      subtitle={<span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">Koruyucu Sağlık Hizmeti</span>}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 p-4 text-white md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><ShieldCheck size={25} /></div>
          <div>
            <p className="text-sm font-bold">{patientName || 'Hasta bilgisi yok'}</p>
            <p className="mt-0.5 text-[11px] text-blue-50">T.C. {patientTc || '-'} · {company || 'Bireysel'}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 text-right">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-100">Protokol</p>
            <p className="text-xs font-bold">{protocolNo || '-'}</p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-700"><Syringe size={16} className="text-blue-600" /> Uygulama Bilgisi</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Uygulama Tarihi *"><input type="datetime-local" value={data.applicationDate} onChange={(event) => update('applicationDate', event.target.value)} className={inputClass} /></Field>
            <Field label="Uygulayan Sağlık Personeli *"><input value={data.administeredBy} onChange={(event) => update('administeredBy', event.target.value)} className={inputClass} /></Field>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="flex items-center gap-1.5 text-[10px] text-slate-500"><CheckCircle2 size={14} className="text-blue-500" /> Kaydettikten sonra hizmeti onaylayın; PDF onaylı kayıttan oluşturulur.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Vazgeç</button>
            <button type="button" onClick={handleSave} disabled={!data.applicationDate || !data.administeredBy.trim()} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Syringe size={14} /> Uygulamayı Kaydet</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className={labelClass}>{label}</span>{children}</label>
}
