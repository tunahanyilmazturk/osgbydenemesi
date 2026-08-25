import { useMemo } from 'react'
import { Building2, Stethoscope } from 'lucide-react'
import type { Company, CompanyType } from '@/state/CompaniesContext'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { loadDoctors } from '@/shared/lib/doctors'

interface CompanyGeneralStepProps {
  form: Omit<Company, 'id'>
  update: (field: keyof Omit<Company, 'id'>, value: string | boolean) => void
  companyTypes: CompanyType[]
}

export function CompanyGeneralStep({ form, update, companyTypes }: CompanyGeneralStepProps) {
  const doctors = useMemo(() => loadDoctors(), [])
  return (
    <div className="h-full bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-y-auto">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
        <span className="w-1 h-4 bg-blue-50 rounded-full" />
        <Building2 className="w-4 h-4 text-blue-500" />
        Kurumsal Bilgiler
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Input
          size="sm"
          label="Firma Adı"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Firma adı"
          required
        />
        <Select
          size="sm"
          label="Firma Türü"
          value={form.companyType}
          onChange={(e) => update('companyType', e.target.value)}
          options={companyTypes.map((t) => ({ value: t, label: t }))}
        />
        <Input
          size="sm"
          label="SGK Sicil No"
          value={form.sgkNumber}
          onChange={(e) => update('sgkNumber', e.target.value)}
          placeholder="SGK sicil numarası"
        />
        <Input
          size="sm"
          label="Vergi No"
          value={form.taxNumber}
          onChange={(e) => update('taxNumber', e.target.value)}
          placeholder="Vergi numarası"
        />
        <Input
          size="sm"
          label="Vergi Dairesi"
          value={form.taxOffice}
          onChange={(e) => update('taxOffice', e.target.value)}
          placeholder="Vergi dairesi"
        />
        <Input
          size="sm"
          label="Sözleşme Tarihi"
          type="date"
          value={form.contractDate}
          onChange={(e) => update('contractDate', e.target.value)}
        />
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 md:col-span-2 lg:col-span-3">
          <div className="mb-2 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs font-bold text-slate-800">EK-2 İşyeri Hekimi Ataması</p>
              <p className="text-[10px] text-slate-500">Bu firmaya açılan yeni EK-2 formlarında seçili doktor otomatik gelir; form içinde değiştirilebilir.</p>
            </div>
          </div>
          <Select
            size="sm"
            label="Atanmış Doktor"
            value={form.ek2DoctorId ?? ''}
            onChange={(e) => update('ek2DoctorId', e.target.value)}
            options={[
              { value: '', label: 'Otomatik eşleşme / doktor seçilmedi' },
              ...doctors.map((doctor) => ({ value: doctor.id, label: `${doctor.title} ${doctor.name}`.trim() })),
            ]}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <Input
            size="sm"
            label="Adres"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Açık adres"
          />
        </div>
      </div>
    </div>
  )
}
