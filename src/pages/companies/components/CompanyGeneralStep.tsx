import { Building2 } from 'lucide-react'
import type { Company, CompanyType } from '@/state/CompaniesContext'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'

interface CompanyGeneralStepProps {
  form: Omit<Company, 'id'>
  update: (field: keyof Omit<Company, 'id'>, value: string | boolean) => void
  companyTypes: CompanyType[]
}

export function CompanyGeneralStep({ form, update, companyTypes }: CompanyGeneralStepProps) {
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
