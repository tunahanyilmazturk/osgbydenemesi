import { Building2, Calendar, Edit2, FileText, Phone, Plus, User } from 'lucide-react'
import type { PatientDetail, Protocol } from '@/shared/types'
import { PatientAvatar } from '@/shared/components/ui/PatientAvatar'

interface PatientHeaderProps {
  patient: PatientDetail
  protocol: Protocol
  onProfileCard: () => void
  onEdit: () => void
  onAddService: () => void
}

export function PatientHeader({ patient, protocol, onProfileCard, onEdit, onAddService }: PatientHeaderProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center gap-4">
        <PatientAvatar gender={patient.gender} name={patient.name} photoSrc={patient.photo} size="lg" />
        <div>
          <h2 className="text-lg font-bold text-slate-800">{patient.name}</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              {protocol.company}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-500" />
              {patient.tc}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('tr-TR') : '-'}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-blue-500" />
              {patient.phone || '-'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onProfileCard}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <FileText className="w-3.5 h-3.5" />
          Profil Kartı
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Düzenle
        </button>
        <button
          onClick={onAddService}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
          title="Bu protokole hızlı hizmet/test ekle"
        >
          <Plus className="w-3.5 h-3.5" />
          Hizmet Ekle
        </button>
      </div>
    </div>
  )
}
