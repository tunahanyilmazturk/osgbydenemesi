import { useMemo, useRef, useState } from 'react'
import {
  Save, Trash2, UserPlus, X, Shield, ShieldPlus, Search, Eye, EyeOff,
  Power, PowerOff, Users as UsersIcon, UserCheck, UserX, Stethoscope,
} from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import {
  useAuth,
  type AppUser,
  type CustomRole,
  type MenuKey,
  ALL_MENUS,
  MENU_LABELS,
} from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

const ROLE_COLOR_CLASSES: Record<string, string> = {
  '#8b5cf6': 'bg-purple-100 text-purple-700 border-purple-200',
  '#2563eb': 'bg-blue-100 text-blue-700 border-blue-200',
  '#64748b': 'bg-slate-100 text-slate-700 border-slate-200',
  '#dc2626': 'bg-red-100 text-red-700 border-red-200',
  '#16a34a': 'bg-green-100 text-green-700 border-green-200',
  '#ea580c': 'bg-orange-100 text-orange-700 border-orange-200',
  '#0891b2': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  '#c026d3': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
}

function getRoleColorClass(color: string): string {
  return ROLE_COLOR_CLASSES[color] || 'bg-slate-100 text-slate-700 border-slate-200'
}

const ROLE_COLORS = ['#8b5cf6', '#2563eb', '#64748b', '#dc2626', '#16a34a', '#ea580c', '#0891b2', '#c026d3']

type TabType = 'users' | 'roles'
type FilterType = 'all' | 'active' | 'passive'

interface EditUserState {
  id: string | null
  displayName: string
  roleId: string
  password: string
  showPassword: boolean
  stamp?: string
}

const EMPTY_EDIT_USER: EditUserState = {
  id: null, displayName: '', roleId: '', password: '', showPassword: false, stamp: undefined,
}

interface EditRoleState {
  id: string | null
  name: string
  color: string
  allowedMenus: MenuKey[]
  canApproveAudiometry: boolean
  canApproveEyeExamination: boolean
  canManageUsers: boolean
}

const EMPTY_EDIT_ROLE: EditRoleState = {
  id: null, name: '', color: '#2563eb', allowedMenus: [],
  canApproveAudiometry: false, canApproveEyeExamination: false, canManageUsers: false,
}

function formatDate(iso?: string): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

export function Users() {
  const {
    users, roles, currentUser,
    addUser, updateUser, deleteUser,
    addRole, updateRole, deleteRole, getRole,
  } = useAuth()
  const { showToast } = useToast()
  const confirmDialog = useConfirm()

  const [tab, setTab] = useState<TabType>('users')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  // --- Kullanıcı ekleme ---
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '', displayName: '', password: '', roleId: '', stamp: '', showPassword: false,
  })
  const [addUserError, setAddUserError] = useState('')
  const [editUser, setEditUser] = useState<EditUserState>(EMPTY_EDIT_USER)
  const userFileRef = useRef<HTMLInputElement | null>(null)
  const editUserFileRef = useRef<HTMLInputElement | null>(null)

  // --- Rol ekleme ---
  const [showAddRole, setShowAddRole] = useState(false)
  const [newRole, setNewRole] = useState<Omit<CustomRole, 'id' | 'createdAt' | 'isSystem'>>({
    name: '', color: '#2563eb', allowedMenus: [],
    canApproveAudiometry: false, canApproveEyeExamination: false, canManageUsers: false,
  })
  const [addRoleError, setAddRoleError] = useState('')
  const [editRole, setEditRole] = useState<EditRoleState>(EMPTY_EDIT_ROLE)

  const handleFileToBase64 = (file: File | null): Promise<string> =>
    new Promise((resolve) => {
      if (!file) return resolve('')
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })

  // --- İstatistikler ---
  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive !== false).length
    const passive = users.filter((u) => u.isActive === false).length
    return { total: users.length, active, passive }
  }, [users])

  // --- Filtrelenmiş kullanıcı listesi ---
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filter === 'active' && u.isActive === false) return false
      if (filter === 'passive' && u.isActive !== false) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [users, filter, search])

  // --- Kullanıcı işlemleri ---
  const handleAddUser = () => {
    setAddUserError('')
    if (!newUser.username.trim() || !newUser.password.trim()) {
      setAddUserError('Kullanıcı adı ve parola zorunludur.')
      return
    }
    if (!newUser.roleId) {
      setAddUserError('Rol seçimi zorunludur.')
      return
    }
    const result = addUser({
      username: newUser.username,
      password: newUser.password,
      displayName: newUser.displayName || newUser.username,
      roleId: newUser.roleId,
      stamp: newUser.stamp || undefined,
      isActive: true,
    })
    if (!result.ok) {
      setAddUserError(result.error || 'Kullanıcı eklenemedi.')
      return
    }
    setNewUser({ username: '', displayName: '', password: '', roleId: '', stamp: '', showPassword: false })
    setShowAddUser(false)
    showToast('success', 'Kullanıcı eklendi.')
  }

  const handleSaveEditUser = () => {
    if (!editUser.id) return
    if (!editUser.displayName.trim()) {
      showToast('warning', 'Uyarı', 'Ad Soyad boş olamaz.')
      return
    }
    if (!editUser.roleId) {
      showToast('warning', 'Uyarı', 'Rol seçimi zorunludur.')
      return
    }
    const patch: Partial<Omit<AppUser, 'id' | 'createdAt'>> = {
      displayName: editUser.displayName.trim(),
      roleId: editUser.roleId,
    }
    if (editUser.password) patch.password = editUser.password
    if (editUser.stamp !== undefined) patch.stamp = editUser.stamp
    updateUser(editUser.id, patch)
    setEditUser(EMPTY_EDIT_USER)
    showToast('success', 'Kullanıcı güncellendi.')
  }

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === currentUser?.id) {
      showToast('warning', 'Uyarı', 'Kendi hesabınızı silemezsiniz.')
      return
    }
    const ok = await confirmDialog({
      title: 'Kullanıcı Sil',
      message: `${name} kullanıcısını silmek istediğinize emin misiniz?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      confirmVariant: 'danger',
    })
    if (ok) {
      deleteUser(id)
      showToast('success', 'Kullanıcı silindi.')
    }
  }

  const handleToggleActive = (u: AppUser) => {
    if (u.id === currentUser?.id) {
      showToast('warning', 'Uyarı', 'Kendi hesabınızı pasifleştiremezsiniz.')
      return
    }
    const newActive = u.isActive !== false ? false : true
    updateUser(u.id, { isActive: newActive })
    showToast('info', newActive ? 'Kullanıcı aktifleştirildi' : 'Kullanıcı pasifleştirildi')
  }

  // --- Rol işlemleri ---
  const handleAddRole = () => {
    setAddRoleError('')
    if (!newRole.name.trim()) {
      setAddRoleError('Rol adı boş olamaz.')
      return
    }
    const result = addRole(newRole)
    if (!result.ok) {
      setAddRoleError(result.error || 'Rol eklenemedi.')
      return
    }
    setNewRole({
      name: '', color: '#2563eb', allowedMenus: [],
      canApproveAudiometry: false, canApproveEyeExamination: false, canManageUsers: false,
    })
    setShowAddRole(false)
    showToast('success', 'Rol eklendi.')
  }

  const handleSaveEditRole = () => {
    if (!editRole.id) return
    updateRole(editRole.id, {
      name: editRole.name,
      color: editRole.color,
      allowedMenus: editRole.allowedMenus,
      canApproveAudiometry: editRole.canApproveAudiometry,
      canApproveEyeExamination: editRole.canApproveEyeExamination,
      canManageUsers: editRole.canManageUsers,
    })
    setEditRole(EMPTY_EDIT_ROLE)
    showToast('success', 'Rol güncellendi.')
  }

  const handleDeleteRole = async (id: string, name: string) => {
    const ok = await confirmDialog({
      title: 'Rol Sil',
      message: `"${name}" rolünü silmek istediğinize emin misiniz?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      confirmVariant: 'danger',
    })
    if (!ok) return
    const result = deleteRole(id)
    if (!result.ok) {
      showToast('error', 'Rol silinemedi', result.error)
    } else {
      showToast('success', 'Rol silindi.')
    }
  }

  const toggleMenuInList = (menu: MenuKey, list: MenuKey[], setter: (menus: MenuKey[]) => void) => {
    const set = new Set(list)
    if (set.has(menu)) set.delete(menu)
    else set.add(menu)
    setter(Array.from(set))
  }

  const newUserRole = roles.find((r) => r.id === newUser.roleId)

  const renderMenuCheckboxes = (
    menus: MenuKey[],
    onToggle: (m: MenuKey) => void,
  ) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
      {ALL_MENUS.map((m) => (
        <label key={m} className="flex items-center gap-1.5 text-[11px] text-slate-700">
          <input
            type="checkbox"
            checked={menus.includes(m)}
            onChange={() => onToggle(m)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          {MENU_LABELS[m]}
        </label>
      ))}
    </div>
  )

  const renderPermissions = (
    canAudiometry: boolean,
    canEye: boolean,
    canManage: boolean,
    onChange: (field: 'canApproveAudiometry' | 'canApproveEyeExamination' | 'canManageUsers', val: boolean) => void,
  ) => (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={canAudiometry}
          onChange={(e) => onChange('canApproveAudiometry', e.target.checked)}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
        İşitme Testi (Odyometri) Onaylayabilir
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={canEye}
          onChange={(e) => onChange('canApproveEyeExamination', e.target.checked)}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <Eye className="w-3.5 h-3.5 text-blue-500" />
        Göz Muayenesi (Oftalmoloji) Onaylayabilir
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={canManage}
          onChange={(e) => onChange('canManageUsers', e.target.checked)}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <Shield className="w-3.5 h-3.5 text-purple-500" />
        Kullanıcı Yönetimi Yapabilir
      </label>
    </div>
  )

  return (
    <div className="space-y-4 h-full flex flex-col min-h-0">
      <PageHeader
        title="Kullanıcı Yönetimi"
        subtitle="Sistem kullanıcılarını, rollerini ve yetkilerini yönetin."
        action={
          tab === 'users' ? (
            <button
              onClick={() => setShowAddUser((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Yeni Kullanıcı
            </button>
          ) : (
            <button
              onClick={() => setShowAddRole((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ShieldPlus className="w-3.5 h-3.5" />
              Yeni Rol
            </button>
          )
        }
      />

      {/* İstatistik kartları */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <UsersIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Toplam Kullanıcı</p>
            <p className="text-lg font-bold text-slate-800">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Aktif</p>
            <p className="text-lg font-bold text-green-700">{stats.active}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <UserX className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Pasif</p>
            <p className="text-lg font-bold text-slate-600">{stats.passive}</p>
          </div>
        </div>
      </div>

      {/* Tab seçici */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1">
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              tab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Kullanıcılar ({users.length})
          </button>
          <button
            onClick={() => setTab('roles')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              tab === 'roles' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Roller ({roles.length})
          </button>
        </div>

        {/* Arama ve filtre (sadece kullanıcılar tab) */}
        {tab === 'users' && (
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kullanıcı ara..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
              {([
                { key: 'all', label: 'Tümü' },
                { key: 'active', label: 'Aktif' },
                { key: 'passive', label: 'Pasif' },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filter === f.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============ KULLANICILAR TAB ============ */}
      {tab === 'users' && (
        <>
          {showAddUser && (
            <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Yeni Kullanıcı</h3>
                <button onClick={() => setShowAddUser(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Kullanıcı Adı *</label>
                  <input
                    value={newUser.username}
                    onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    placeholder="ornek: odyometrist1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ad Soyad</label>
                  <input
                    value={newUser.displayName}
                    onChange={(e) => setNewUser((p) => ({ ...p, displayName: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    placeholder="örn: Ahmet Yılmaz"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Parola *</label>
                  <div className="relative">
                    <input
                      type={newUser.showPassword ? 'text' : 'password'}
                      value={newUser.password}
                      onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                      className="w-full px-2.5 py-1.5 pr-9 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setNewUser((p) => ({ ...p, showPassword: !p.showPassword }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {newUser.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Rol *</label>
                  <select
                    value={newUser.roleId}
                    onChange={(e) => setNewUser((p) => ({ ...p, roleId: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Rol seçin...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Kaşe — tüm kullanıcılar için */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Kaşe / İmza (PNG/JPG) {(newUserRole?.canApproveAudiometry || newUserRole?.canApproveEyeExamination) && '— önerilir'}
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative h-20 w-40 bg-slate-50 rounded-lg border border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                    {newUser.stamp ? (
                      <img src={newUser.stamp} alt="kaşe" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Kaşe yükle</span>
                    )}
                    <input
                      ref={userFileRef}
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const stamp = await handleFileToBase64(e.target.files?.[0] ?? null)
                        if (stamp) setNewUser((p) => ({ ...p, stamp }))
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  {newUser.stamp && (
                    <button onClick={() => setNewUser((p) => ({ ...p, stamp: '' }))} className="text-xs text-red-600 hover:underline">
                      Kaldır
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Bu kaşe, onaylanan PDF raporlarda (göz/odyometri) imza alanında gösterilir.
                </p>
              </div>

              {addUserError && <p className="text-xs text-red-600">{addUserError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleAddUser}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-3.5 h-3.5" />
                  Kaydet
                </button>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-2.5 font-medium">Kullanıcı</th>
                  <th className="px-4 py-2.5 font-medium">Ad Soyad</th>
                  <th className="px-4 py-2.5 font-medium">Rol</th>
                  <th className="px-4 py-2.5 font-medium">Durum</th>
                  <th className="px-4 py-2.5 font-medium">Kaşe</th>
                  <th className="px-4 py-2.5 font-medium">Son Giriş</th>
                  <th className="px-4 py-2.5 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      {search ? 'Aramanızla eşleşen kullanıcı bulunamadı.' : 'Kullanıcı yok.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                  const role = getRole(u.roleId)
                  const isPassive = u.isActive === false
                  return (
                    <tr key={u.id} className={`hover:bg-slate-50 ${isPassive ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isPassive ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {(u.displayName || u.username).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              {u.username}
                              {u.id === currentUser?.id && <span className="text-[10px] text-blue-600">(siz)</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {editUser.id === u.id ? (
                          <input
                            value={editUser.displayName}
                            onChange={(e) => setEditUser((p) => ({ ...p, displayName: e.target.value }))}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                          />
                        ) : (
                          u.displayName
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {editUser.id === u.id ? (
                          <select
                            value={editUser.roleId}
                            onChange={(e) => setEditUser((p) => ({ ...p, roleId: e.target.value }))}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        ) : role ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium ${getRoleColorClass(role.color)}`}>
                            {role.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Rol yok</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {isPassive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <PowerOff className="w-3 h-3" /> Pasif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-green-600">
                            <Power className="w-3 h-3" /> Aktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {editUser.id === u.id ? (
                          <div className="flex items-center gap-2">
                            <div className="relative h-10 w-20 bg-slate-50 rounded border border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                              {editUser.stamp ? (
                                <img src={editUser.stamp} alt="kaşe" className="h-full w-full object-contain" />
                              ) : (
                                <span className="text-[9px] text-slate-400">yok</span>
                              )}
                              <input
                                ref={editUserFileRef}
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const stamp = await handleFileToBase64(e.target.files?.[0] ?? null)
                                  if (stamp) setEditUser((p) => ({ ...p, stamp }))
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </div>
                            {editUser.stamp && (
                              <button onClick={() => setEditUser((p) => ({ ...p, stamp: '' }))} className="text-[10px] text-red-600 hover:underline">
                                Kaldır
                              </button>
                            )}
                          </div>
                        ) : u.stamp ? (
                          <img src={u.stamp} alt="kaşe" className="h-10 w-20 object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-400">Yok</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-slate-500">
                        {formatDate(u.lastLoginAt)}
                      </td>
                      <td className="px-4 py-2.5 text-right space-x-2">
                        {editUser.id === u.id ? (
                          <>
                            <div className="relative inline-block">
                              <input
                                type={editUser.showPassword ? 'text' : 'password'}
                                value={editUser.password}
                                onChange={(e) => setEditUser((p) => ({ ...p, password: e.target.value }))}
                                placeholder="yeni parola"
                                className="w-28 pl-2 pr-7 py-1 bg-slate-50 border border-slate-200 rounded text-[10px]"
                              />
                              <button
                                type="button"
                                onClick={() => setEditUser((p) => ({ ...p, showPassword: !p.showPassword }))}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                title={editUser.showPassword ? 'Gizle' : 'Göster'}
                              >
                                {editUser.showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                            <button onClick={handleSaveEditUser} className="text-blue-600 hover:underline">Kaydet</button>
                            <button onClick={() => setEditUser(EMPTY_EDIT_USER)} className="text-slate-500 hover:underline">İptal</button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditUser({
                                id: u.id, displayName: u.displayName, roleId: u.roleId,
                                password: '', showPassword: false, stamp: u.stamp,
                              })}
                              className="text-blue-600 hover:underline"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={isPassive ? 'text-green-600 hover:underline' : 'text-orange-600 hover:underline'}
                              title={isPassive ? 'Aktifleştir' : 'Pasifleştir'}
                            >
                              {isPassive ? 'Aktifleştir' : 'Pasifleştir'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.displayName || u.username)}
                              className="text-red-600 hover:underline inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Sil
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ============ ROLLER TAB ============ */}
      {tab === 'roles' && (
        <>
          {showAddRole && (
            <div className="bg-white rounded-2xl border border-purple-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Yeni Rol</h3>
                <button onClick={() => setShowAddRole(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Rol Adı *</label>
                  <input
                    value={newRole.name}
                    onChange={(e) => setNewRole((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                    placeholder="örn: Laboratuvar Sorumlusu"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Renk</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {ROLE_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewRole((p) => ({ ...p, color: c }))}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${newRole.color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Görebileceği Menüler</label>
                {renderMenuCheckboxes(newRole.allowedMenus, (m) => {
                  setNewRole((p) => {
                    const set = new Set(p.allowedMenus)
                    if (set.has(m)) set.delete(m)
                    else set.add(m)
                    return { ...p, allowedMenus: Array.from(set) }
                  })
                })}
                <p className="text-[10px] text-slate-500 mt-1">Hiçbiri seçilmezse tüm menüler görünür.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Yetkiler</label>
                {renderPermissions(
                  newRole.canApproveAudiometry,
                  newRole.canApproveEyeExamination,
                  newRole.canManageUsers,
                  (field, val) => setNewRole((p) => ({ ...p, [field]: val })),
                )}
              </div>

              {addRoleError && <p className="text-xs text-red-600">{addRoleError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleAddRole}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  <Save className="w-3.5 h-3.5" />
                  Rol Oluştur
                </button>
                <button
                  onClick={() => setShowAddRole(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-y-auto">
            {roles.map((r) => {
              const isEditing = editRole.id === r.id
              const userCount = users.filter((u) => u.roleId === r.id).length
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: r.color }} />
                      {isEditing ? (
                        <input
                          value={editRole.name}
                          onChange={(e) => setEditRole((p) => ({ ...p, name: e.target.value }))}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm font-semibold"
                        />
                      ) : (
                        <h3 className="text-sm font-semibold text-slate-800">{r.name}</h3>
                      )}
                      {r.isSystem && <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">Sistem</span>}
                      <span className="text-[10px] text-slate-400">{userCount} kullanıcı</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={handleSaveEditRole} className="text-blue-600 hover:underline text-xs">Kaydet</button>
                          <button onClick={() => setEditRole(EMPTY_EDIT_ROLE)} className="text-slate-500 hover:underline text-xs">İptal</button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditRole({
                              id: r.id, name: r.name, color: r.color, allowedMenus: r.allowedMenus,
                              canApproveAudiometry: r.canApproveAudiometry,
                              canApproveEyeExamination: r.canApproveEyeExamination,
                              canManageUsers: r.canManageUsers,
                            })}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Düzenle
                          </button>
                          {!r.isSystem && (
                            <button
                              onClick={() => handleDeleteRole(r.id, r.name)}
                              className="text-red-600 hover:underline inline-flex items-center gap-1 text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                              Sil
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Renk seçici (edit modunda) */}
                  {isEditing && (
                    <div className="flex gap-1.5 flex-wrap">
                      {ROLE_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditRole((p) => ({ ...p, color: c }))}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${editRole.color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Menüler */}
                  <div>
                    <p className="text-[10px] font-medium text-slate-500 mb-1">MENÜLER</p>
                    {isEditing ? (
                      renderMenuCheckboxes(editRole.allowedMenus, (m) => toggleMenuInList(m, editRole.allowedMenus, (menus) => setEditRole((p) => ({ ...p, allowedMenus: menus }))))
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.allowedMenus.length === 0 ? (
                          <span className="text-[10px] text-slate-400">Tüm menüler</span>
                        ) : (
                          r.allowedMenus.map((m) => (
                            <span key={m} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {MENU_LABELS[m]}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Yetkiler */}
                  <div>
                    <p className="text-[10px] font-medium text-slate-500 mb-1">YETKİLER</p>
                    <div className="space-y-1">
                      {isEditing ? (
                        renderPermissions(
                          editRole.canApproveAudiometry,
                          editRole.canApproveEyeExamination,
                          editRole.canManageUsers,
                          (field, val) => setEditRole((p) => ({ ...p, [field]: val })),
                        )
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className={`w-2 h-2 rounded-full ${r.canApproveAudiometry ? 'bg-green-50' : 'bg-slate-300'}`} />
                            <span className={r.canApproveAudiometry ? 'text-slate-700' : 'text-slate-400'}>İşitme Testi Onayı</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className={`w-2 h-2 rounded-full ${r.canApproveEyeExamination ? 'bg-green-50' : 'bg-slate-300'}`} />
                            <span className={r.canApproveEyeExamination ? 'text-slate-700' : 'text-slate-400'}>Göz Muayenesi Onayı</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className={`w-2 h-2 rounded-full ${r.canManageUsers ? 'bg-green-50' : 'bg-slate-300'}`} />
                            <span className={r.canManageUsers ? 'text-slate-700' : 'text-slate-400'}>Kullanıcı Yönetimi</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-slate-700 space-y-1">
        <p><strong>Bilgi:</strong> Roller menüler ve yetkiler gruplandırır. Kullanıcılara rol atayarak yetki verirsiniz.</p>
        <p>• <strong>Menüler</strong>: Kullanıcının sidebar'da görebileceği sayfaları belirler.</p>
        <p>• <strong>İşitme Testi Onayı</strong>: Odyometri sonuçlarını onaylama ve PDF'de kaşe gösterme yetkisi.</p>
        <p>• <strong>Göz Muayenesi Onayı</strong>: Göz muayenesi sonuçlarını onaylama ve PDF'de kaşe gösterme yetkisi.</p>
        <p>• <strong>Kullanıcı Yönetimi</strong>: Bu sayfaya erişim ve kullanıcı/rol yönetme yetkisi.</p>
        <p>• <strong>Aktif/Pasif</strong>: Pasif kullanıcılar giriş yapamaz, ancak verisi korunur.</p>
      </div>
    </div>
  )
}
