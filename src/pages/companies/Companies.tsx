import { useMemo, useState } from 'react'
import { Building2, Check, Edit2, Mail, MapPin, Phone, Plus, Search, Trash2, User, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCompanies, type CompanyType, type DangerClass, type PaymentType } from '@/state/CompaniesContext'
import { useConfirm } from '@/state/ConfirmContext'
import { PageHeader } from '@/shared/components/PageHeader'
import { Select } from '@/shared/components/ui/Select'

const companyTypes: CompanyType[] = ['Ana Firma', 'Alt İşveren', 'Müşteri', 'Tedarikçi']

const typeColors: Record<CompanyType, string> = {
  'Ana Firma': 'bg-blue-50 text-blue-700',
  'Alt İşveren': 'bg-amber-50 text-amber-700',
  'Müşteri': 'bg-emerald-50 text-emerald-700',
  'Tedarikçi': 'bg-violet-50 text-violet-700',
}

const dangerColors: Record<DangerClass, string> = {
  'Az Tehlikeli': 'bg-emerald-50 text-emerald-700',
  'Tehlikeli': 'bg-amber-50 text-amber-700',
  'Çok Tehlikeli': 'bg-red-50 text-red-700',
}

const paymentColors: Record<PaymentType, string> = {
  'Bireysel': 'bg-emerald-50 text-emerald-700',
  'Fatura': 'bg-amber-50 text-amber-700',
}

export function Companies() {
  const navigate = useNavigate()
  const { companies, deleteCompany, toggleActive } = useCompanies()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Tümü')
  const [statusFilter, setStatusFilter] = useState('Tümü')

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase()
    return companies.filter((c) => {
      const matchesSearch =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.taxNumber.includes(term) ||
        c.contactPerson.toLowerCase().includes(term) ||
        c.phone.includes(term)
      const matchesType = typeFilter === 'Tümü' || c.companyType === typeFilter
      const matchesStatus =
        statusFilter === 'Tümü' ||
        (statusFilter === 'Aktif' && c.active) ||
        (statusFilter === 'Pasif' && !c.active)
      return matchesSearch && matchesType && matchesStatus
    })
  }, [companies, search, typeFilter, statusFilter])

  const stats = useMemo(() => {
    const total = companies.length
    const active = companies.filter((c) => c.active).length
    const passive = total - active
    const byType = companyTypes.map((type) => ({
      type,
      count: companies.filter((c) => c.companyType === type).length,
    }))
    return { total, active, passive, byType }
  }, [companies])

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: 'Firma Sil',
      message: `"${name}" firmasını silmek istediğinize emin misiniz?`,
    })
    if (ok) {
      deleteCompany(id)
    }
  }

  return (
    <div className="viewport-page">
      <PageHeader
        title="Firma Tanımları"
        subtitle="Protokol ve raporlarda kullanılacak firmaları buradan yönetin."
        action={
          <button
            onClick={() => navigate('/ayarlar/firmalar/yeni')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Yeni Firma
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400">Toplam Firma</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400">Aktif</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-400">Pasif</p>
          <p className="text-2xl font-bold text-slate-500">{stats.passive}</p>
        </div>
        {stats.byType.slice(0, 5).map(({ type, count }) => (
          <div key={type} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400 truncate">{type}</p>
            <p className="text-2xl font-bold text-slate-700">{count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Firma ara (ad, vergi no, yetkili, telefon)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <Select
            size="sm"
            label=""
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={['Tümü', ...companyTypes].map((t) => ({ value: t, label: t }))}
          />
          <Select
            size="sm"
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={['Tümü', 'Aktif', 'Pasif'].map((t) => ({ value: t, label: t }))}
          />
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="surface-scroll">
          <table className="w-full text-left text-sm sticky-table-header">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Firma</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">Tehlike</th>
                <th className="px-4 py-3 font-medium">Ödeme</th>
                <th className="px-4 py-3 font-medium">Vergi No</th>
                <th className="px-4 py-3 font-medium">İletişim</th>
                <th className="px-4 py-3 font-medium">Yetkili</th>
                <th className="px-4 py-3 font-medium text-center">Test</th>
                <th className="px-4 py-3 font-medium">Sözleşme</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-slate-500">
                    {companies.length === 0 ? 'Henüz firma tanımlanmamış.' : 'Arama kriterlerine uygun firma bulunamadı.'}
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{company.name}</p>
                          {company.address && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin className="w-3 h-3" />
                              {company.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeColors[company.companyType]}`}>
                        {company.companyType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${dangerColors[company.dangerClass]}`}>
                        {company.dangerClass}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${paymentColors[company.paymentType]}`}>
                        {company.paymentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {company.taxNumber || '-'}
                      {company.taxOffice && <div className="text-slate-400">{company.taxOffice}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {company.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {company.phone}
                        </div>
                      )}
                      {company.email && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Mail className="w-3 h-3" />
                          {company.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {company.contactPerson ? (
                        <>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {company.contactPerson}
                          </div>
                          {company.contactPhone && (
                            <div className="flex items-center gap-1 text-slate-400">
                              <Phone className="w-3 h-3" />
                              {company.contactPhone}
                            </div>
                          )}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-1 rounded-full text-xs font-medium ${
                        company.companyServices.length > 0
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-50 text-slate-400'
                      }`}>
                        {company.companyServices.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {company.contractDate
                        ? new Date(company.contractDate).toLocaleDateString('tr-TR')
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(company.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          company.active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {company.active ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {company.active ? 'Aktif' : 'Pasif'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/ayarlar/firmalar/duzenle/${company.id}`)}
                          className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(company.id, company.name)}
                          className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-sm text-slate-500">
            Toplam: <span className="font-semibold text-slate-800">{filteredCompanies.length}</span> firma
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/ayarlar')}
          className="text-sm text-slate-600 hover:text-slate-800 font-medium"
        >
          ← Genel Ayarlar'a Dön
        </button>
        <button
          onClick={() => navigate('/ayarlar/hizmetler')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-auto"
        >
          Hizmet Tanımları →
        </button>
      </div>
    </div>
  )
}
