import { Save } from 'lucide-react'
import { Modal } from '@/shared/components/ui/Modal'
import { Input } from '@/shared/components/ui/Input'
import type { PatientDetail } from '@/shared/types'
import type { Company } from '@/state/CompaniesContext'
import { CompanySelect } from '@/shared/components/ui/CompanySelect'
import { Select } from '@/shared/components/ui/Select'

interface PatientEditModalProps {
  isOpen: boolean
  onClose: () => void
  patient: PatientDetail | undefined
  patientForm: Partial<PatientDetail>
  onPatientFormChange: (form: Partial<PatientDetail>) => void
  onSave: (patientId: number, form: Partial<PatientDetail>) => void
  companies: Company[]
}

export function PatientEditModal({
  isOpen,
  onClose,
  patient,
  patientForm,
  onPatientFormChange,
  onSave,
  companies,
}: PatientEditModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hasta Bilgilerini Düzenle"
      size="lg"
    >
      {patient && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave(patient.id, patientForm)
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Ad Soyad"
              value={patientForm.name ?? ''}
              onChange={(e) => onPatientFormChange({ ...patientForm, name: e.target.value })}
              required
            />
            <Input
              label="TC Kimlik No"
              value={patientForm.tc ?? ''}
              inputMode="numeric"
              pattern="[0-9]{11}"
              maxLength={11}
              onChange={(e) => onPatientFormChange({ ...patientForm, tc: e.target.value.replace(/\D/g, '').slice(0, 11) })}
              required
            />
            <Input
              label="Telefon"
              value={patientForm.phone ?? ''}
              onChange={(e) => onPatientFormChange({ ...patientForm, phone: e.target.value })}
            />
            <Input
              label="E-posta"
              type="email"
              value={patientForm.email ?? ''}
              onChange={(e) => onPatientFormChange({ ...patientForm, email: e.target.value })}
            />
            <Input
              label="Doğum Tarihi"
              type="date"
              value={patientForm.birthDate ?? ''}
              onChange={(e) => onPatientFormChange({ ...patientForm, birthDate: e.target.value })}
            />
            <Select
              label="Cinsiyet"
              value={patientForm.gender ?? 'Erkek'}
              onChange={(e) => onPatientFormChange({ ...patientForm, gender: e.target.value })}
              options={[{ value: 'Erkek', label: 'Erkek' }, { value: 'Kadın', label: 'Kadın' }]}
            />
            <CompanySelect
              label="Firma"
              value={patientForm.company ?? ''}
              onChange={(company) => onPatientFormChange({ ...patientForm, company })}
              companies={companies.filter((company) => company.active)}
            />
            <Input
              label="Adres"
              value={patientForm.address ?? ''}
              onChange={(e) => onPatientFormChange({ ...patientForm, address: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Kaydet
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
