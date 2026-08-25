import { Building2 } from 'lucide-react'
import type { Company } from '@/state/CompaniesContext'
import type { ExamType } from '@/state/ExamTypesContext'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { CompanySelect } from '@/shared/components/ui/CompanySelect'

interface ProtocolForm {
  protocolDate: string
  status: string
  company: string
  examType: string
  department: string
  occupation: string
  description: string
}

interface ProtocolInfoStepProps {
  form: ProtocolForm
  update: (field: keyof ProtocolForm, value: string) => void
  examTypes: ExamType[]
  activeCompanies: Company[]
  selectedCompany: Company | undefined
  showProtocolNote: boolean
  dismissProtocolNote: (dontShowToday: boolean) => void
  onSubmit: (e: React.FormEvent) => void
  onNavigateCompanies: () => void
}

export function ProtocolInfoStep({
  form,
  update,
  examTypes,
  activeCompanies,
  selectedCompany,
  showProtocolNote,
  dismissProtocolNote,
  onSubmit,
  onNavigateCompanies,
}: ProtocolInfoStepProps) {
  return (
    <form id="protocol-form" onSubmit={onSubmit} className="h-full bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-4">
        <span className="w-1 h-4 bg-blue-50 rounded-full" />
        Protokol Bilgileri
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Input
          size="sm"
          label="Protokol Tarihi"
          type="datetime-local"
          value={form.protocolDate}
          onChange={(e) => update('protocolDate', e.target.value)}
          required
        />
        <Select
          size="sm"
          label="Durum"
          value={form.status}
          onChange={(e) => update('status', e.target.value)}
          options={[
            { value: 'Sonuç Bekleniyor', label: 'Sonuç Bekleniyor' },
            { value: 'Bekliyor', label: 'Bekliyor' },
            { value: 'Tamamlandı', label: 'Tamamlandı' },
          ]}
        />
        <Select
          size="sm"
          label="Muayene Türü"
          value={form.examType}
          onChange={(e) => update('examType', e.target.value)}
          options={examTypes.map((t) => ({ value: t.name, label: t.name }))}
        />
        <CompanySelect
          label="Firma"
          value={form.company}
          onChange={(value) => update('company', value)}
          companies={activeCompanies}
          placeholder="Firma ara veya seç..."
        />
        <Input
          size="sm"
          label="Çalıştığı Birim"
          value={form.department}
          onChange={(e) => update('department', e.target.value)}
          placeholder="Birim / departman"
        />
        <Input
          size="sm"
          label="Mesleği"
          value={form.occupation}
          onChange={(e) => update('occupation', e.target.value)}
          placeholder="Mesleği yazın"
        />
        <div className="flex items-end">
          <button
            type="button"
            onClick={onNavigateCompanies}
            className="flex items-center gap-2 w-full px-4 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <Building2 className="w-4 h-4" />
            Yeni Firma Ekle
          </button>
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <Input
            size="sm"
            label="Açıklama"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Ek açıklama veya not"
          />
        </div>
      </div>

      {showProtocolNote && selectedCompany && (
        <div className="mt-4 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-amber-800">{selectedCompany.name} — Protokol Notu</h3>
              </div>
              <p className="text-sm text-amber-700 mb-3">{selectedCompany.protocolNote}</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => dismissProtocolNote(false)}
                  className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Tamam, Devam Et
                </button>
                <button
                  type="button"
                  onClick={() => dismissProtocolNote(true)}
                  className="px-3 py-1.5 bg-white text-amber-700 text-xs font-medium rounded-lg border border-amber-300 hover:bg-amber-50 transition-colors"
                >
                  Bugün Tekrar Gösterme
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
