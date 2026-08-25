import type { KeyboardEvent, MouseEvent } from 'react'
import { Check, CheckCircle2 } from 'lucide-react'
import type { PatientDetail, Protocol } from '@/shared/types'
import { CopyButton } from '@/shared/components/ui/CopyButton'
import { PatientAvatar } from '@/shared/components/ui/PatientAvatar'

interface ProtocolStats {
  pending: number
  approved: number
  total: number
}

interface ProtocolCardProps {
  protocol: Protocol
  patient: PatientDetail | undefined
  isSelected: boolean
  isMultiSelected: boolean
  stats: ProtocolStats
  currentTimestamp: number
  onClick: (event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => void
}

export function ProtocolCard({ protocol, patient, isSelected, isMultiSelected, stats, currentTimestamp, onClick }: ProtocolCardProps) {
  const allApproved = stats.total > 0 && stats.approved === stats.total
  const protocolDate = new Date(protocol.protocolDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const age = patient?.birthDate
    ? Math.floor((currentTimestamp - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick(event)
        }
      }}
      className={`w-full text-left p-2.5 rounded-xl border transition-all relative ${
        isMultiSelected
          ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400/30'
          : isSelected
          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {/* Çoklu seçim göstergesi */}
      {isMultiSelected && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      {/* Üst satır: Hasta Adı + Tarih */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {patient && <PatientAvatar gender={patient.gender} name={patient.name} photoSrc={patient.photo} size="xs" />}
          <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
            {patient?.name ?? 'Bilinmeyen Hasta'}
          </span>
          <CopyButton text={patient?.name ?? ''} successLabel="Hasta Adı" />
        </div>
        <span className="text-[10px] text-slate-400 shrink-0">{protocolDate}</span>
      </div>
      {/* Orta: Protokol No + TC + yaş/cinsiyet */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[11px] font-mono ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
            #{protocol.protocolNo}
          </span>
          <CopyButton text={protocol.protocolNo} successLabel="Protokol No" />
        </div>
        {patient?.tc && (
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[10px] text-slate-400 font-mono truncate">{patient.tc}</span>
            <CopyButton text={patient.tc} successLabel="TC Kimlik No" />
          </div>
        )}
        {patient?.gender && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
            patient.gender === 'Kadın'
              ? 'bg-rose-100 text-rose-700'
              : 'bg-indigo-100 text-indigo-700'
          }`}>
            {patient.gender}
          </span>
        )}
        {age !== null && (
          <span className="text-[10px] text-slate-400 shrink-0">{age} yaş</span>
        )}
      </div>
      {/* Alt: Firma + durum rozetleri */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="text-[10px] text-slate-500 truncate">{protocol.company}</span>
          <CopyButton text={protocol.company} successLabel="Firma Adı" />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {stats.total > 0 && (
            <>
              {stats.pending > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {stats.pending} bekleyen
                </span>
              )}
              {stats.approved > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  {stats.approved} onaylı
                </span>
              )}
              {allApproved && (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
