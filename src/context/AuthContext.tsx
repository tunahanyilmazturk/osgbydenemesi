import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Menü ana kategorileri (path prefix)
export type MenuKey = '/' | '/hasta-kayit' | '/laboratuvar' | '/muhasebe' | '/istatistikler' | '/ayarlar'

export const ALL_MENUS: MenuKey[] = ['/', '/hasta-kayit', '/laboratuvar', '/muhasebe', '/istatistikler', '/ayarlar']

export const MENU_LABELS: Record<MenuKey, string> = {
  '/': 'Ana Sayfa',
  '/hasta-kayit': 'Hasta Kayıt Kabul',
  '/laboratuvar': 'Laboratuvar İşlemleri',
  '/muhasebe': 'Ön Muhasebe',
  '/istatistikler': 'İstatistikler',
  '/ayarlar': 'Genel Ayarlar',
}

export interface CustomRole {
  id: string
  name: string
  color: string // tailwind renk sınıfı için hex
  allowedMenus: MenuKey[]
  canApproveAudiometry: boolean
  canApproveEyeExamination: boolean
  canManageUsers: boolean
  isSystem?: boolean // silinemeyen sistem rolü
  createdAt: string
}

export interface AppUser {
  id: string
  username: string
  password: string
  displayName: string
  roleId: string
  stamp?: string // base64 PNG kaşe imzası
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

const USERS_KEY = 'cetka-users'
const ROLES_KEY = 'cetka-roles'
const SESSION_KEY = 'cetka-session'

const DEFAULT_ROLES: CustomRole[] = [
  {
    id: 'role-admin',
    name: 'Yönetici',
    color: '#8b5cf6',
    allowedMenus: ALL_MENUS,
    canApproveAudiometry: true,
    canApproveEyeExamination: true,
    canManageUsers: true,
    isSystem: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'role-odyometrist',
    name: 'Odyometrist',
    color: '#2563eb',
    allowedMenus: ['/laboratuvar'],
    canApproveAudiometry: true,
    canApproveEyeExamination: false,
    canManageUsers: false,
    isSystem: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'role-kullanici',
    name: 'Kullanıcı',
    color: '#64748b',
    allowedMenus: ALL_MENUS,
    canApproveAudiometry: false,
    canApproveEyeExamination: false,
    canManageUsers: false,
    isSystem: true,
    createdAt: new Date().toISOString(),
  },
]

const DEFAULT_USERS: AppUser[] = [
  {
    id: 'admin-default',
    username: 'admin',
    password: 'admin123',
    displayName: 'Yönetici',
    roleId: 'role-admin',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'odyo-demo',
    username: 'odyometrist',
    password: 'odyo123',
    displayName: 'Demo Odyometrist',
    roleId: 'role-odyometrist',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
]

function loadRoles(): CustomRole[] {
  try {
    const raw = localStorage.getItem(ROLES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Array<Record<string, unknown>>
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migration: canApproveEyeExamination alanı eksikse, admin rolüne true diğerlerine false ata
        const migrated = parsed.map((r) => ({
          ...r,
          canApproveEyeExamination:
            typeof r.canApproveEyeExamination === 'boolean'
              ? r.canApproveEyeExamination
              : r.id === 'role-admin' || r.name === 'Yönetici',
          canApproveAudiometry:
            typeof r.canApproveAudiometry === 'boolean'
              ? r.canApproveAudiometry
              : r.id === 'role-admin' || r.name === 'Yönetici',
          canManageUsers:
            typeof r.canManageUsers === 'boolean'
              ? r.canManageUsers
              : r.id === 'role-admin' || r.name === 'Yönetici',
        })) as unknown as CustomRole[]
        // Admin rolü her zaman tüm yetkilere sahip olsun
        const ensured = migrated.map((r) =>
          r.id === 'role-admin' || r.name === 'Yönetici'
            ? { ...r, canApproveAudiometry: true, canApproveEyeExamination: true, canManageUsers: true, allowedMenus: ALL_MENUS }
            : r
        )
        localStorage.setItem(ROLES_KEY, JSON.stringify(ensured))
        return ensured
      }
    }
  } catch {
    // ignore
  }
  localStorage.setItem(ROLES_KEY, JSON.stringify(DEFAULT_ROLES))
  return DEFAULT_ROLES
}

function saveRoles(roles: CustomRole[]) {
  localStorage.setItem(ROLES_KEY, JSON.stringify(roles))
}

function loadUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Array<Record<string, unknown>>
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Eski format migration: role -> roleId, allowedMenus -> role'e taşındı
        const migrated: AppUser[] = parsed.map((u) => {
          // Eğer zaten roleId varsa yeni format
          if (u.roleId && typeof u.roleId === 'string') {
            return {
              ...u,
              isActive: u.isActive !== false,
              lastLoginAt: u.lastLoginAt as string | undefined,
            } as unknown as AppUser
          }
          // Eski format: role alanı var
          const oldRole = u.role as string | undefined
          const roleId =
            oldRole === 'admin' ? 'role-admin' :
            oldRole === 'odyometrist' ? 'role-odyometrist' :
            'role-kullanici'
          return {
            id: u.id as string,
            username: u.username as string,
            password: u.password as string,
            displayName: u.displayName as string,
            roleId,
            stamp: u.stamp as string | undefined,
            isActive: u.isActive !== false,
            lastLoginAt: u.lastLoginAt as string | undefined,
            createdAt: u.createdAt as string,
          }
        })
        // Demo kullanıcıların varlığını garanti et
        const existingUsernames = new Set(migrated.map((u) => u.username.toLowerCase()))
        for (const def of DEFAULT_USERS) {
          if (!existingUsernames.has(def.username.toLowerCase())) {
            migrated.push(def)
          }
        }
        localStorage.setItem(USERS_KEY, JSON.stringify(migrated))
        return migrated
      }
    }
  } catch {
    // ignore
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS))
  return DEFAULT_USERS
}

function saveUsers(users: AppUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

interface SessionUser {
  id: string
  username: string
  displayName: string
  roleId: string
  roleName: string
  stamp?: string
  allowedMenus: MenuKey[]
  canApproveAudiometry: boolean
  canApproveEyeExamination: boolean
  canManageUsers: boolean
}

function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      // Eski format migration: role -> roleId
      if (parsed && !parsed.roleId && parsed.role) {
        const oldRole = parsed.role as string
        const roleId =
          oldRole === 'admin' ? 'role-admin' :
          oldRole === 'odyometrist' ? 'role-odyometrist' :
          'role-kullanici'
        const roles = loadRoles()
        const role = roles.find((r) => r.id === roleId) ?? roles[0]
        const session: SessionUser = {
          id: parsed.id as string,
          username: parsed.username as string,
          displayName: parsed.displayName as string,
          roleId: role.id,
          roleName: role.name,
          stamp: parsed.stamp as string | undefined,
          allowedMenus: role.allowedMenus.length ? role.allowedMenus : ALL_MENUS,
          canApproveAudiometry: role.canApproveAudiometry,
          canApproveEyeExamination: role.canApproveEyeExamination,
          canManageUsers: role.canManageUsers,
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        return session
      }
      if (parsed && parsed.roleId) {
        // Eski session'da allowedMenus/yetki alanları eksikse role'den tamamla
        const roles = loadRoles()
        const role = roles.find((r) => r.id === parsed.roleId)
        const session: SessionUser = {
          id: parsed.id as string,
          username: parsed.username as string,
          displayName: parsed.displayName as string,
          roleId: parsed.roleId as string,
          roleName: (parsed.roleName as string) || role?.name || 'Kullanıcı',
          stamp: parsed.stamp as string | undefined,
          allowedMenus: Array.isArray(parsed.allowedMenus) && parsed.allowedMenus.length
            ? (parsed.allowedMenus as MenuKey[])
            : role?.allowedMenus?.length ? role.allowedMenus : ALL_MENUS,
          canApproveAudiometry: typeof parsed.canApproveAudiometry === 'boolean'
            ? parsed.canApproveAudiometry
            : !!role?.canApproveAudiometry,
          canApproveEyeExamination: typeof parsed.canApproveEyeExamination === 'boolean'
            ? parsed.canApproveEyeExamination
            : !!role?.canApproveEyeExamination,
          canManageUsers: typeof parsed.canManageUsers === 'boolean'
            ? parsed.canManageUsers
            : !!role?.canManageUsers,
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        return session
      }
    }
  } catch {
    // ignore
  }
  if (localStorage.getItem('cetka-auth') === 'true') {
    const roles = loadRoles()
    const adminRole = roles.find((r) => r.id === 'role-admin') ?? roles[0]
    return {
      id: 'admin-default',
      username: 'admin',
      displayName: 'Yönetici',
      roleId: adminRole.id,
      roleName: adminRole.name,
      allowedMenus: adminRole.allowedMenus,
      canApproveAudiometry: adminRole.canApproveAudiometry,
      canApproveEyeExamination: adminRole.canApproveEyeExamination,
      canManageUsers: adminRole.canManageUsers,
    }
  }
  return null
}

function saveSession(session: SessionUser | null) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    localStorage.setItem('cetka-auth', 'true')
  } else {
    localStorage.removeItem(SESSION_KEY)
    localStorage.setItem('cetka-auth', 'false')
  }
}

interface AuthContextType {
  currentUser: SessionUser | null
  users: AppUser[]
  roles: CustomRole[]
  login: (username: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
  addUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => { ok: boolean; error?: string }
  updateUser: (id: string, patch: Partial<Omit<AppUser, 'id' | 'createdAt'>>) => void
  deleteUser: (id: string) => void
  addRole: (role: Omit<CustomRole, 'id' | 'createdAt' | 'isSystem'>) => { ok: boolean; error?: string }
  updateRole: (id: string, patch: Partial<Omit<CustomRole, 'id' | 'createdAt' | 'isSystem'>>) => void
  deleteRole: (id: string) => { ok: boolean; error?: string }
  getRole: (roleId: string) => CustomRole | undefined
  hasMenuAccess: (path: string) => boolean
  canApproveAudiometry: boolean
  canApproveEyeExamination: boolean
  canManageUsers: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

let idSeq = 0
function genId(prefix: string) {
  idSeq += 1
  return `${prefix}-${Date.now()}-${idSeq}`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(loadUsers)
  const [roles, setRoles] = useState<CustomRole[]>(loadRoles)
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(loadSession)

  useEffect(() => {
    saveUsers(users)
  }, [users])

  useEffect(() => {
    saveRoles(roles)
  }, [roles])

  useEffect(() => {
    saveSession(currentUser)
  }, [currentUser])

  const getRole = useCallback(
    (roleId: string): CustomRole | undefined => {
      return roles.find((r) => r.id === roleId)
    },
    [roles],
  )

  const login = useCallback(
    (username: string, password: string): { ok: boolean; error?: string } => {
      const found = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password)
      if (!found) return { ok: false, error: 'Kullanıcı adı veya parola hatalı.' }
      if (found.isActive === false) return { ok: false, error: 'Hesabınız pasif durumda. Lütfen yönetici ile iletişime geçin.' }
      const role = roles.find((r) => r.id === found.roleId)
      if (!role) return { ok: false, error: 'Kullanıcı rolü bulunamadı. Yönetici ile iletişime geçin.' }
      // Son giriş tarihini güncelle
      const loginAt = new Date().toISOString()
      setUsers((prev) => prev.map((u) => (u.id === found.id ? { ...u, lastLoginAt: loginAt } : u)))
      setCurrentUser({
        id: found.id,
        username: found.username,
        displayName: found.displayName,
        roleId: role.id,
        roleName: role.name,
        stamp: found.stamp,
        allowedMenus: role.allowedMenus.length ? role.allowedMenus : ALL_MENUS,
        canApproveAudiometry: role.canApproveAudiometry,
        canApproveEyeExamination: role.canApproveEyeExamination,
        canManageUsers: role.canManageUsers,
      })
      return { ok: true }
    },
    [users, roles],
  )

  const logout = useCallback(() => setCurrentUser(null), [])

  const addUser = useCallback(
    (user: Omit<AppUser, 'id' | 'createdAt'>): { ok: boolean; error?: string } => {
      if (!user.username.trim()) return { ok: false, error: 'Kullanıcı adı boş olamaz.' }
      if (!user.password.trim()) return { ok: false, error: 'Parola boş olamaz.' }
      if (users.some((u) => u.username.toLowerCase() === user.username.trim().toLowerCase())) {
        return { ok: false, error: 'Bu kullanıcı adı zaten kullanımda.' }
      }
      const newUser: AppUser = {
        ...user,
        username: user.username.trim(),
        isActive: user.isActive !== false,
        id: genId('user'),
        createdAt: new Date().toISOString(),
      }
      setUsers((prev) => [...prev, newUser])
      return { ok: true }
    },
    [users],
  )

  const updateUser = useCallback(
    (id: string, patch: Partial<Omit<AppUser, 'id' | 'createdAt'>>) => {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)))
      setCurrentUser((prev) => {
        if (!prev || prev.id !== id) return prev
        const updated = { ...prev, ...patch }
        // rol değiştiyse session'daki yetkileri de güncelle
        if (patch.roleId) {
          const role = roles.find((r) => r.id === patch.roleId)
          if (role) {
            updated.roleId = role.id
            updated.roleName = role.name
            updated.allowedMenus = role.allowedMenus.length ? role.allowedMenus : ALL_MENUS
            updated.canApproveAudiometry = role.canApproveAudiometry
            updated.canApproveEyeExamination = role.canApproveEyeExamination
            updated.canManageUsers = role.canManageUsers
          }
        }
        return updated
      })
    },
    [roles],
  )

  const deleteUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id))
    // Silinen kullanıcı mevcut session ise logout yap
    setCurrentUser((prev) => (prev?.id === id ? null : prev))
  }, [])

  const addRole = useCallback(
    (role: Omit<CustomRole, 'id' | 'createdAt' | 'isSystem'>): { ok: boolean; error?: string } => {
      if (!role.name.trim()) return { ok: false, error: 'Rol adı boş olamaz.' }
      if (roles.some((r) => r.name.toLowerCase() === role.name.trim().toLowerCase())) {
        return { ok: false, error: 'Bu rol adı zaten kullanımda.' }
      }
      const newRole: CustomRole = {
        ...role,
        name: role.name.trim(),
        id: genId('role'),
        isSystem: false,
        createdAt: new Date().toISOString(),
      }
      setRoles((prev) => [...prev, newRole])
      return { ok: true }
    },
    [roles],
  )

  const updateRole = useCallback(
    (id: string, patch: Partial<Omit<CustomRole, 'id' | 'createdAt' | 'isSystem'>>) => {
      setRoles((prev) => {
        const updated = prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
        // Eğer mevcut kullanıcının rolü güncellendiyse session'ı da güncelle
        setCurrentUser((session) => {
          if (!session || session.roleId !== id) return session
          const updatedRole = updated.find((r) => r.id === id)
          if (!updatedRole) return session
          return {
            ...session,
            roleName: updatedRole.name,
            allowedMenus: updatedRole.allowedMenus.length ? updatedRole.allowedMenus : ALL_MENUS,
            canApproveAudiometry: updatedRole.canApproveAudiometry,
            canApproveEyeExamination: updatedRole.canApproveEyeExamination,
            canManageUsers: updatedRole.canManageUsers,
          }
        })
        return updated
      })
    },
    [],
  )

  const deleteRole = useCallback(
    (id: string): { ok: boolean; error?: string } => {
      const role = roles.find((r) => r.id === id)
      if (role?.isSystem) return { ok: false, error: 'Sistem rolleri silinemez.' }
      if (users.some((u) => u.roleId === id)) {
        return { ok: false, error: 'Bu role atanmış kullanıcılar var. Önce kullanıcıların rolünü değiştirin.' }
      }
      setRoles((prev) => prev.filter((r) => r.id !== id))
      return { ok: true }
    },
    [roles, users],
  )

  const hasMenuAccess = useCallback(
    (path: string): boolean => {
      if (!currentUser) return false
      const menus = currentUser.allowedMenus && currentUser.allowedMenus.length ? currentUser.allowedMenus : ALL_MENUS
      return menus.some((m) => path === m || path.startsWith(m + '/'))
    },
    [currentUser],
  )

  const canApproveAudiometry = useMemo(() => !!currentUser?.canApproveAudiometry, [currentUser])
  const canApproveEyeExamination = useMemo(() => !!currentUser?.canApproveEyeExamination, [currentUser])
  const canManageUsers = useMemo(() => !!currentUser?.canManageUsers, [currentUser])

  const value = useMemo<AuthContextType>(
    () => ({
      currentUser,
      users,
      roles,
      login,
      logout,
      addUser,
      updateUser,
      deleteUser,
      addRole,
      updateRole,
      deleteRole,
      getRole,
      hasMenuAccess,
      canApproveAudiometry,
      canApproveEyeExamination,
      canManageUsers,
    }),
    [currentUser, users, roles, login, logout, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole, getRole, hasMenuAccess, canApproveAudiometry, canApproveEyeExamination, canManageUsers],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
