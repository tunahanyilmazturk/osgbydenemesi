import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Clock,
  Eye,
  Key,
  Globe,
  Smartphone,
  Monitor,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Power,
  History,
  Mail,
  Phone,
  Building2,
  Calendar,
} from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState } from '../../components/ui/EmptyState'
import { useWebResultUsers } from '../../context/WebResultUsersContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'
import type { WebResultUser, WebResultUserRole, WebResultUserStatus } from '../../types'

const roleLabels: Record<WebResultUserRole, string> = {
  firma_yetkilisi: 'Firma Yetkilisi',
  saglik_personeli: 'Sağlık Personeli',
  admin: 'Yönetici',
}

const roleColors: Record<WebResultUserRole, string> = {
  firma_yetkilisi: 'bg-blue-100 text-blue-700',
  saglik_personeli: 'bg-emerald-100 text-emerald-700',
  admin: 'bg-violet-100 text-violet-700',
}

const statusColors: Record<WebResultUserStatus, string> = {
  Aktif: 'bg-emerald-100 text-emerald-700',
  Pasif: 'bg-slate-200 text-slate-600',
  'Süresi Dolmuş': 'bg-red-100 text-red-700',
}

const statusIcons: Record<WebResultUserStatus, typeof UserCheck> = {
  Aktif: UserCheck,
  Pasif: UserX,
  'Süresi Dolmuş': Clock,
}

const deviceIcon = (device: string) => {
  if (/iphone|android|mobile/i.test(device)) return Smartphone
  if (/ipad|tablet/i.test(device)) return Monitor
  return Globe
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  let pwd = ''
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

const emptyForm = {
  username: '',
  password: '',
  fullName: '',
  email: '',
  phone: '',
  role: 'firma_yetkilisi' as WebResultUserRole,
  status: 'Aktif' as WebResultUserStatus,
  companyId: '' as string,
  companyName: '',
  expiresAt: '',
  canViewAllProtocols: true,
  canDownloadPdf: true,
  canViewPatientDetails: false,
  notes: '',
}

export function WebResultUsers() {
  const { users, addUser, updateUser, removeUser, toggleStatus } = useWebResultUsers()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('Tümü')
  const [statusFilter, setStatusFilter] = useState('Tümü')
  const [sortBy, setSortBy] = useState<'createdAt' | 'fullName' | 'lastLoginAt' | 'companyName'>('createdAt')
  const [page, setPage] = useState(1)
  const [itemsPerPage] = useState(8)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const [detailUser, setDetailUser] = useState<WebResultUser | null>(null)

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const filteredUsers = useMemo(() => {
    let result = users
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((u) =>
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.companyName ?? '').toLowerCase().includes(q)
      )
    }
    if (roleFilter !== 'Tümü') result = result.filter((u) => u.role === roleFilter)
    if (statusFilter !== 'Tümü') result = result.filter((u) => u.status === statusFilter)

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'fullName': return a.fullName.localeCompare(b.fullName, 'tr')
        case 'lastLoginAt':
          if (!a.lastLoginAt) return 1
          if (!b.lastLoginAt) return -1
          return new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime()
        case 'companyName':
          return (a.companyName ?? 'zzz').localeCompare(b.companyName ?? 'zzz', 'tr')
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
    return result
  }, [users, search, roleFilter, statusFilter, sortBy])

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const safePage = Math.min(page, Math.max(1, totalPages))
  const pagedUsers = filteredUsers.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage)

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === 'Aktif').length,
    passive: users.filter((u) => u.status === 'Pasif').length,
    expired: users.filter((u) => u.status === 'Süresi Dolmuş').length,
    todayLogins: users.filter((u) => {
      if (!u.lastLoginAt) return false
      const today = new Date().toDateString()
      return new Date(u.lastLoginAt).toDateString() === today
    }).length,
  }), [users])

  const openAddModal = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const openEditModal = (user: WebResultUser) => {
    setForm({
      username: user.username,
      password: user.password,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      companyId: user.companyId ? String(user.companyId) : '',
      companyName: user.companyName ?? '',
      expiresAt: user.expiresAt ? user.expiresAt.split('T')[0] : '',
      canViewAllProtocols: user.canViewAllProtocols,
      canDownloadPdf: user.canDownloadPdf,
      canViewPatientDetails: user.canViewPatientDetails,
      notes: user.notes ?? '',
    })
    setEditingId(user.id)
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username.trim() || !form.fullName.trim() || !form.password.trim()) {
      showToast('error', 'Eksik bilgi', 'Kullanıcı adı, ad soyad ve şifre zorunludur.')
      return
    }

    const duplicate = users.find(
      (u) => u.username.toLowerCase() === form.username.toLowerCase() && u.id !== editingId
    )
    if (duplicate) {
      showToast('error', 'Kullanıcı adı kullanımda', `"${form.username}" zaten mevcut.`)
      return
    }

    const data = {
      username: form.username.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      status: form.status,
      companyId: form.companyId ? Number(form.companyId) : undefined,
      companyName: form.companyName || undefined,
      expiresAt: form.expiresAt ? `${form.expiresAt}T23:59` : undefined,
      canViewAllProtocols: form.canViewAllProtocols,
      canDownloadPdf: form.canDownloadPdf,
      canViewPatientDetails: form.canViewPatientDetails,
      notes: form.notes.trim() || undefined,
    }

    if (editingId) {
      updateUser(editingId, data)
      showToast('success', 'Kullanıcı güncellendi', `"${data.fullName}" bilgileri kaydedildi.`)
    } else {
      addUser(data)
      showToast('success', 'Kullanıcı eklendi', `"${data.fullName}" web sonuç kullanıcısı olarak eklendi.`)
    }
    closeModal()
  }

  const handleDelete = async (user: WebResultUser) => {
    const ok = await confirm({
      title: 'Kullanıcıyı Sil',
      message: `"${user.fullName}" kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: 'Sil',
      confirmVariant: 'danger',
    })
    if (ok) {
      removeUser(user.id)
      showToast('success', 'Kullanıcı silindi', `"${user.fullName}" silindi.`)
    }
  }

  const handleToggleStatus = (user: WebResultUser) => {
    toggleStatus(user.id)
    const newStatus = user.status === 'Aktif' ? 'Pasif' : 'Aktif'
    showToast('info', 'Durum değişti', `"${user.fullName}" durumu: ${newStatus}`)
  }

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const clearFilters = () => {
    setSearch('')
    setRoleFilter('Tümü')
    setStatusFilter('Tümü')
    setPage(1)
  }

  const hasActiveFilters = search || roleFilter !== 'Tümü' || statusFilter !== 'Tümü'

  return (
    <div className="space-y-4">
      <PageHeader
        title="Web Sonuç Kullanıcıları"
        subtitle="Web üzerinden protokol sonuçlarını görüntüleyen kullanıcıları yönetin."
        action={
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Yeni Kullanıcı
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatBox icon={Users} label="Toplam" value={stats.total} color="text-blue-600" bg="bg-blue-50" />
        <StatBox icon={UserCheck} label="Aktif" value={stats.active} color="text-emerald-600" bg="bg-emerald-50" />
        <StatBox icon={UserX} label="Pasif" value={stats.passive} color="text-slate-600" bg="bg-slate-100" />
        <StatBox icon={Clock} label="Süresi Dolmuş" value={stats.expired} color="text-red-600" bg="bg-red-50" />
        <StatBox icon={Globe} label="Bugün Giriş" value={stats.todayLogins} color="text-violet-600" bg="bg-violet-50" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-5 relative">
            <label className="block font-semibold text-slate-700 mb-1 text-xs">Kullanıcı Ara</label>
            <Search className="absolute left-3 top-[calc(1.5rem+0.5rem)] -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Kullanıcı adı, ad soyad, e-posta veya firma..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div className="lg:col-span-3">
            <Select
              size="sm"
              label="Rol"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
              options={[
                { value: 'Tümü', label: 'Tümü' },
                { value: 'firma_yetkilisi', label: 'Firma Yetkilisi' },
                { value: 'saglik_personeli', label: 'Sağlık Personeli' },
                { value: 'admin', label: 'Yönetici' },
              ]}
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              size="sm"
              label="Durum"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              options={[
                { value: 'Tümü', label: 'Tümü' },
                { value: 'Aktif', label: 'Aktif' },
                { value: 'Pasif', label: 'Pasif' },
                { value: 'Süresi Dolmuş', label: 'Süresi Dolmuş' },
              ]}
            />
          </div>
          <div className="lg:col-span-2">
            <Select
              size="sm"
              label="Sırala"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              options={[
                { value: 'createdAt', label: 'Kayıt Tarihi' },
                { value: 'fullName', label: 'Ad Soyad' },
                { value: 'lastLoginAt', label: 'Son Giriş' },
                { value: 'companyName', label: 'Firma' },
              ]}
            />
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{filteredUsers.length}</span> kullanıcı bulundu
            </span>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
            >
              <Power className="w-3.5 h-3.5" />
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {pagedUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Kullanıcı bulunamadı"
            description={hasActiveFilters ? 'Filtreleri temizleyip tekrar deneyin.' : 'İlk web sonuç kullanıcısını ekleyin.'}
            actionLabel={hasActiveFilters ? undefined : 'Yeni Kullanıcı'}
            onAction={hasActiveFilters ? undefined : openAddModal}
          />
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600 text-xs uppercase tracking-wider">Kullanıcı</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 text-xs uppercase tracking-wider">Firma</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 text-xs uppercase tracking-wider">Rol</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 text-xs uppercase tracking-wider">Durum</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 text-xs uppercase tracking-wider">Son Giriş</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 text-xs uppercase tracking-wider">Yetkiler</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600 text-xs uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagedUsers.map((user) => {
                  const StatusIcon = statusIcons[user.status]
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-blue-700">
                              {user.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 truncate">{user.fullName}</div>
                            <div className="text-xs text-slate-400 truncate">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.companyName ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[140px]">{user.companyName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${roleColors[user.role]}`}>
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[user.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-600">{formatDate(user.lastLoginAt)}</div>
                        {user.lastLoginAt && (
                          <div className="text-[10px] text-slate-400">
                            {new Date(user.lastLoginAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {user.canViewAllProtocols && (
                            <span title="Tüm protokolleri görebilir" className="p-1 rounded-md bg-blue-50 text-blue-600">
                              <Eye className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {user.canDownloadPdf && (
                            <span title="PDF indirebilir" className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {user.canViewPatientDetails && (
                            <span title="Hasta detaylarını görebilir" className="p-1 rounded-md bg-violet-50 text-violet-600">
                              <Shield className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailUser(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Detay"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title={user.status === 'Aktif' ? 'Pasife Al' : 'Aktifleştir'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Kullanıcı Düzenle' : 'Yeni Web Sonuç Kullanıcısı'}
        subtitle={editingId ? `"${form.fullName}" bilgilerini güncelleyin` : 'Web üzerinden sonuç görüntülemek için yeni kullanıcı oluşturun'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Temel Bilgiler */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Temel Bilgiler</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                size="sm"
                label="Kullanıcı Adı *"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                placeholder="kullanici_adi"
              />
              <Input
                size="sm"
                label="Ad Soyad *"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                placeholder="Ad Soyad"
              />
              <Input
                size="sm"
                label="E-posta"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="ornek@firma.com"
              />
              <Input
                size="sm"
                label="Telefon"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="0555 123 45 67"
              />
            </div>
          </div>

          {/* Güvenlik */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Güvenlik</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Şifre *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      title={showPassword ? 'Gizle' : 'Göster'}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => update('password', generatePassword())}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
                    title="Rastgele şifre oluştur"
                  >
                    <Key className="w-3.5 h-3.5 inline mr-1" />
                    Oluştur
                  </button>
                </div>
              </div>
              <Input
                size="sm"
                label="Son Kullanma Tarihi"
                type="date"
                value={form.expiresAt}
                onChange={(e) => update('expiresAt', e.target.value)}
              />
            </div>
          </div>

          {/* Rol ve Firma */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rol ve Firma</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                size="sm"
                label="Rol"
                value={form.role}
                onChange={(e) => update('role', e.target.value as WebResultUserRole)}
                options={[
                  { value: 'firma_yetkilisi', label: 'Firma Yetkilisi' },
                  { value: 'saglik_personeli', label: 'Sağlık Personeli' },
                  { value: 'admin', label: 'Yönetici' },
                ]}
              />
              <Select
                size="sm"
                label="Durum"
                value={form.status}
                onChange={(e) => update('status', e.target.value as WebResultUserStatus)}
                options={[
                  { value: 'Aktif', label: 'Aktif' },
                  { value: 'Pasif', label: 'Pasif' },
                  { value: 'Süresi Dolmuş', label: 'Süresi Dolmuş' },
                ]}
              />
              <Input
                size="sm"
                label="Firma Adı"
                value={form.companyName}
                onChange={(e) => update('companyName', e.target.value)}
                placeholder="Firma adı (opsiyonel)"
              />
            </div>
          </div>

          {/* Yetkiler */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Yetkiler</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-colors">
                <input
                  type="checkbox"
                  checked={form.canViewAllProtocols}
                  onChange={(e) => update('canViewAllProtocols', e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-medium text-slate-700">Tüm Protokoller</div>
                  <div className="text-[10px] text-slate-400">Firmaya ait tüm protokolleri görebilir</div>
                </div>
              </label>
              <label className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-emerald-200 transition-colors">
                <input
                  type="checkbox"
                  checked={form.canDownloadPdf}
                  onChange={(e) => update('canDownloadPdf', e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-medium text-slate-700">PDF İndirme</div>
                  <div className="text-[10px] text-slate-400">Sonuçları PDF olarak indirebilir</div>
                </div>
              </label>
              <label className="flex items-center gap-2.5 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-violet-200 transition-colors">
                <input
                  type="checkbox"
                  checked={form.canViewPatientDetails}
                  onChange={(e) => update('canViewPatientDetails', e.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <div>
                  <div className="text-xs font-medium text-slate-700">Hasta Detayları</div>
                  <div className="text-[10px] text-slate-400">TC, telefon, adres gibi bilgileri görebilir</div>
                </div>
              </label>
            </div>
          </div>

          {/* Notlar */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notlar</h4>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Kullanıcı ile ilgili notlar, yetkilendirme detayları..."
              rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={!form.username.trim() || !form.fullName.trim() || !form.password.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserCheck className="w-4 h-4" />
              {editingId ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailUser}
        onClose={() => setDetailUser(null)}
        title="Kullanıcı Detayı"
        size="lg"
      >
        {detailUser && (
          <div className="space-y-5">
            {/* User Info */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-blue-700">
                  {detailUser.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-800">{detailUser.fullName}</h3>
                <p className="text-xs text-slate-400">@{detailUser.username}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${roleColors[detailUser.role]}`}>
                    {roleLabels[detailUser.role]}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[detailUser.status]}`}>
                    {detailUser.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(`${detailUser.username}\n${detailUser.password}`, detailUser.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-white transition-colors"
                title="Kullanıcı adı ve şifreyi kopyala"
              >
                {copiedId === detailUser.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === detailUser.id ? 'Kopyalandı' : 'Bilgileri Kopyala'}
              </button>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoRow icon={Mail} label="E-posta" value={detailUser.email || '—'} />
              <InfoRow icon={Phone} label="Telefon" value={detailUser.phone || '—'} />
              <InfoRow icon={Building2} label="Firma" value={detailUser.companyName || '—'} />
              <InfoRow icon={Calendar} label="Kayıt Tarihi" value={formatDate(detailUser.createdAt)} />
              <InfoRow icon={Clock} label="Son Giriş" value={formatDateTime(detailUser.lastLoginAt)} />
              <InfoRow icon={ShieldAlert} label="Son Kullanma" value={formatDate(detailUser.expiresAt)} />
            </div>

            {/* Permissions */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Yetkiler</h4>
              <div className="flex flex-wrap gap-2">
                <PermissionBadge active={detailUser.canViewAllProtocols} icon={Eye} label="Tüm Protokoller" />
                <PermissionBadge active={detailUser.canDownloadPdf} icon={ShieldCheck} label="PDF İndirme" />
                <PermissionBadge active={detailUser.canViewPatientDetails} icon={Shield} label="Hasta Detayları" />
              </div>
              {detailUser.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500">{detailUser.notes}</p>
                </div>
              )}
            </div>

            {/* Access Log */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Erişim Geçmişi</h4>
                <span className="text-[10px] text-slate-400">{detailUser.accessLog.length} kayıt</span>
              </div>
              {detailUser.accessLog.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Henüz giriş yapılmamış.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {detailUser.accessLog.map((log) => {
                    const DeviceIcon = deviceIcon(log.device)
                    return (
                      <div key={log.id} className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <DeviceIcon className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-slate-700">{log.device}</div>
                          <div className="text-[10px] text-slate-400">
                            {formatDateTime(log.loginAt)} · IP: {log.ip}
                          </div>
                        </div>
                        {log.viewedProtocols.length > 0 && (
                          <div className="text-[10px] text-slate-400 shrink-0">
                            {log.viewedProtocols.length} protokol görüntüledi
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => { openEditModal(detailUser); setDetailUser(null) }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Düzenle
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function StatBox({ icon: Icon, label, value, color, bg }: { icon: typeof Users; label: string; value: number; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-400 truncate">{label}</div>
        <div className="text-xl font-bold text-slate-800">{value}</div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-xs font-medium text-slate-700 truncate">{value}</div>
      </div>
    </div>
  )
}

function PermissionBadge({ active, icon: Icon, label }: { active: boolean; icon: typeof Eye; label: string }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
        <Icon className="w-3 h-3" />
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200 line-through">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
