import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ALL_PERMISSIONS, getFirstAccessiblePath, getRoutePermission, normalizePermissions, PERMISSION_GROUPS, VIEW_PERMISSIONS, type PermissionKey } from '@/app/config/permissions'

export type MenuKey = '/' | '/hasta-kayit' | '/laboratuvar' | '/muhasebe' | '/istatistikler' | '/ayarlar'
export const ALL_MENUS: MenuKey[] = ['/', '/hasta-kayit', '/laboratuvar', '/muhasebe', '/istatistikler', '/ayarlar']
export const MENU_LABELS: Record<MenuKey, string> = {
  '/': 'Ana Sayfa', '/hasta-kayit': 'Hasta Kayıt Kabul', '/laboratuvar': 'Laboratuvar İşlemleri',
  '/muhasebe': 'Ön Muhasebe', '/istatistikler': 'İstatistikler', '/ayarlar': 'Genel Ayarlar',
}

export interface CustomRole {
  id: string
  name: string
  color: string
  permissions: PermissionKey[]
  allowedMenus: MenuKey[]
  canApproveAudiometry: boolean
  canApproveEyeExamination: boolean
  canManageUsers: boolean
  isSystem?: boolean
  createdAt: string
}

export interface AppUser {
  id: string
  username: string
  password: string
  displayName: string
  roleId: string
  stamp?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

interface SessionUser {
  id: string
  username: string
  displayName: string
  roleId: string
  roleName: string
  stamp?: string
  permissions: PermissionKey[]
  allowedMenus: MenuKey[]
  canApproveAudiometry: boolean
  canApproveEyeExamination: boolean
  canManageUsers: boolean
}

const USERS_KEY = 'cetka-users'
const ROLES_KEY = 'cetka-roles'
const SESSION_KEY = 'cetka-session'
const GROUP_MENU_MAP: Record<string, MenuKey> = {
  dashboard: '/', patients: '/hasta-kayit', laboratory: '/laboratuvar', accounting: '/muhasebe', statistics: '/istatistikler', settings: '/ayarlar',
}

function permissionsToMenus(permissions: PermissionKey[]): MenuKey[] {
  return PERMISSION_GROUPS.flatMap((group) => {
    const enabled = group.items.some((item) => item.permissions.some((permission) => permissions.includes(permission.key)))
    return enabled ? [GROUP_MENU_MAP[group.id]] : []
  }).filter((menu): menu is MenuKey => Boolean(menu))
}

function permissionsFromLegacyRole(role: Record<string, unknown>): PermissionKey[] {
  const rawMenus = Array.isArray(role.allowedMenus) ? role.allowedMenus as MenuKey[] : ALL_MENUS
  const menus = rawMenus.length ? rawMenus : ALL_MENUS
  const permissions = VIEW_PERMISSIONS.filter((permission) => {
    if (permission.startsWith('dashboard.')) return menus.includes('/')
    if (permission.startsWith('patients.') || permission.startsWith('protocols.')) return menus.includes('/hasta-kayit')
    if (permission.startsWith('lab.')) return menus.includes('/laboratuvar')
    if (permission.startsWith('accounting.')) return menus.includes('/muhasebe')
    if (permission.startsWith('statistics.')) return menus.includes('/istatistikler')
    if (permission.startsWith('settings.')) return menus.includes('/ayarlar')
    return false
  })
  if (role.canApproveAudiometry === true) permissions.push('examinations.audiometry.approve')
  if (role.canApproveEyeExamination === true) permissions.push('examinations.eye.approve')
  if (role.canManageUsers === true) permissions.push('settings.users.manage')
  return normalizePermissions(permissions)
}

function enrichRole(role: CustomRole): CustomRole {
  const isAdmin = role.id === 'role-admin' || role.name === 'Yönetici'
  const permissions = isAdmin ? ALL_PERMISSIONS : normalizePermissions(role.permissions)
  return {
    ...role,
    permissions,
    allowedMenus: permissionsToMenus(permissions),
    canApproveAudiometry: permissions.includes('examinations.audiometry.approve'),
    canApproveEyeExamination: permissions.includes('examinations.eye.approve'),
    canManageUsers: permissions.includes('settings.users.manage'),
  }
}

const DEFAULT_ROLES: CustomRole[] = [
  enrichRole({ id: 'role-admin', name: 'Yönetici', color: '#8b5cf6', permissions: ALL_PERMISSIONS, allowedMenus: ALL_MENUS, canApproveAudiometry: true, canApproveEyeExamination: true, canManageUsers: true, isSystem: true, createdAt: new Date().toISOString() }),
  enrichRole({ id: 'role-odyometrist', name: 'Odyometrist', color: '#2563eb', permissions: ['lab.results.view', 'lab.results.manage', 'lab.workspace.view', 'lab.workspace.manage', 'lab.quickApproval.view', 'lab.quickApproval.manage', 'examinations.audiometry.approve'], allowedMenus: ['/laboratuvar'], canApproveAudiometry: true, canApproveEyeExamination: false, canManageUsers: false, isSystem: true, createdAt: new Date().toISOString() }),
  enrichRole({ id: 'role-kullanici', name: 'Kullanıcı', color: '#64748b', permissions: VIEW_PERMISSIONS, allowedMenus: ALL_MENUS, canApproveAudiometry: false, canApproveEyeExamination: false, canManageUsers: false, isSystem: true, createdAt: new Date().toISOString() }),
]

const DEFAULT_USERS: AppUser[] = [
  { id: 'admin-default', username: 'admin', password: 'admin123', displayName: 'Yönetici', roleId: 'role-admin', isActive: true, createdAt: new Date().toISOString() },
  { id: 'odyo-demo', username: 'odyometrist', password: 'odyo123', displayName: 'Demo Odyometrist', roleId: 'role-odyometrist', isActive: true, createdAt: new Date().toISOString() },
]

function loadRoles(): CustomRole[] {
  try {
    const raw = localStorage.getItem(ROLES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Array<Record<string, unknown>>
      if (Array.isArray(parsed) && parsed.length) {
        const migrated = parsed.map((role) => enrichRole({
          ...role,
          permissions: Array.isArray(role.permissions) ? normalizePermissions(role.permissions as PermissionKey[]) : permissionsFromLegacyRole(role),
          canApproveAudiometry: role.canApproveAudiometry === true,
          canApproveEyeExamination: role.canApproveEyeExamination === true,
          canManageUsers: role.canManageUsers === true,
        } as unknown as CustomRole))
        localStorage.setItem(ROLES_KEY, JSON.stringify(migrated))
        return migrated
      }
    }
  } catch { /* bozuk kayıt varsayılanlarla yenilenir */ }
  localStorage.setItem(ROLES_KEY, JSON.stringify(DEFAULT_ROLES))
  return DEFAULT_ROLES
}

function saveRoles(roles: CustomRole[]) { localStorage.setItem(ROLES_KEY, JSON.stringify(roles)) }

function loadUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Array<Record<string, unknown>>
      if (Array.isArray(parsed) && parsed.length) {
        const migrated: AppUser[] = parsed.map((user) => {
          if (typeof user.roleId === 'string') return { ...user, isActive: user.isActive !== false, lastLoginAt: user.lastLoginAt as string | undefined } as unknown as AppUser
          const oldRole = user.role as string | undefined
          return { id: user.id as string, username: user.username as string, password: user.password as string, displayName: user.displayName as string, roleId: oldRole === 'admin' ? 'role-admin' : oldRole === 'odyometrist' ? 'role-odyometrist' : 'role-kullanici', stamp: user.stamp as string | undefined, isActive: user.isActive !== false, lastLoginAt: user.lastLoginAt as string | undefined, createdAt: user.createdAt as string }
        })
        const existing = new Set(migrated.map((user) => user.username.toLocaleLowerCase('tr-TR')))
        DEFAULT_USERS.forEach((user) => { if (!existing.has(user.username.toLocaleLowerCase('tr-TR'))) migrated.push(user) })
        localStorage.setItem(USERS_KEY, JSON.stringify(migrated))
        return migrated
      }
    }
  } catch { /* bozuk kayıt varsayılanlarla yenilenir */ }
  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS))
  return DEFAULT_USERS
}

function saveUsers(users: AppUser[]) { localStorage.setItem(USERS_KEY, JSON.stringify(users)) }

function sessionFromRole(user: Pick<AppUser, 'id' | 'username' | 'displayName' | 'roleId' | 'stamp'>, role: CustomRole): SessionUser {
  return { id: user.id, username: user.username, displayName: user.displayName, roleId: role.id, roleName: role.name, stamp: user.stamp, permissions: role.permissions, allowedMenus: role.allowedMenus, canApproveAudiometry: role.canApproveAudiometry, canApproveEyeExamination: role.canApproveEyeExamination, canManageUsers: role.canManageUsers }
}

function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const oldRole = parsed.role as string | undefined
      const roleId = (parsed.roleId as string | undefined) ?? (oldRole === 'admin' ? 'role-admin' : oldRole === 'odyometrist' ? 'role-odyometrist' : 'role-kullanici')
      const role = loadRoles().find((item) => item.id === roleId)
      if (role) {
        const session = sessionFromRole({ id: parsed.id as string, username: parsed.username as string, displayName: parsed.displayName as string, roleId, stamp: parsed.stamp as string | undefined }, role)
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        return session
      }
    }
  } catch { /* geçersiz oturum yok sayılır */ }
  if (localStorage.getItem('cetka-auth') === 'true') {
    const role = loadRoles().find((item) => item.id === 'role-admin') ?? DEFAULT_ROLES[0]
    return sessionFromRole(DEFAULT_USERS[0], role)
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
  hasPermission: (permission: PermissionKey) => boolean
  hasPageAccess: (path: string) => boolean
  hasMenuAccess: (path: string) => boolean
  getLandingPath: () => string
  canApproveAudiometry: boolean
  canApproveEyeExamination: boolean
  canManageUsers: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)
let idSequence = 0
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${++idSequence}`

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(loadUsers)
  const [roles, setRoles] = useState<CustomRole[]>(loadRoles)
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(loadSession)

  useEffect(() => saveUsers(users), [users])
  useEffect(() => saveRoles(roles), [roles])
  useEffect(() => saveSession(currentUser), [currentUser])

  const getRole = useCallback((roleId: string) => roles.find((role) => role.id === roleId), [roles])
  const login = useCallback((username: string, password: string): { ok: boolean; error?: string } => {
    const found = users.find((user) => user.username.toLocaleLowerCase('tr-TR') === username.trim().toLocaleLowerCase('tr-TR') && user.password === password)
    if (!found) return { ok: false, error: 'Kullanıcı adı veya parola hatalı.' }
    if (!found.isActive) return { ok: false, error: 'Hesabınız pasif durumda. Lütfen yönetici ile iletişime geçin.' }
    const role = roles.find((item) => item.id === found.roleId)
    if (!role) return { ok: false, error: 'Kullanıcı rolü bulunamadı. Yönetici ile iletişime geçin.' }
    const loginAt = new Date().toISOString()
    setUsers((previous) => previous.map((user) => user.id === found.id ? { ...user, lastLoginAt: loginAt } : user))
    setCurrentUser(sessionFromRole(found, role))
    return { ok: true }
  }, [roles, users])
  const logout = useCallback(() => setCurrentUser(null), [])

  const addUser = useCallback((user: Omit<AppUser, 'id' | 'createdAt'>): { ok: boolean; error?: string } => {
    if (!user.username.trim()) return { ok: false, error: 'Kullanıcı adı boş olamaz.' }
    if (!user.password.trim()) return { ok: false, error: 'Parola boş olamaz.' }
    if (users.some((item) => item.username.toLocaleLowerCase('tr-TR') === user.username.trim().toLocaleLowerCase('tr-TR'))) return { ok: false, error: 'Bu kullanıcı adı zaten kullanımda.' }
    setUsers((previous) => [...previous, { ...user, username: user.username.trim(), isActive: user.isActive !== false, id: generateId('user'), createdAt: new Date().toISOString() }])
    return { ok: true }
  }, [users])

  const updateUser = useCallback((id: string, patch: Partial<Omit<AppUser, 'id' | 'createdAt'>>) => {
    setUsers((previous) => previous.map((user) => user.id === id ? { ...user, ...patch } : user))
    setCurrentUser((session) => {
      if (!session || session.id !== id) return session
      const role = roles.find((item) => item.id === (patch.roleId ?? session.roleId))
      return role ? sessionFromRole({ ...session, ...patch, roleId: role.id }, role) : session
    })
  }, [roles])
  const deleteUser = useCallback((id: string) => {
    setUsers((previous) => previous.filter((user) => user.id !== id))
    setCurrentUser((session) => session?.id === id ? null : session)
  }, [])

  const addRole = useCallback((role: Omit<CustomRole, 'id' | 'createdAt' | 'isSystem'>): { ok: boolean; error?: string } => {
    if (!role.name.trim()) return { ok: false, error: 'Rol adı boş olamaz.' }
    if (roles.some((item) => item.name.toLocaleLowerCase('tr-TR') === role.name.trim().toLocaleLowerCase('tr-TR'))) return { ok: false, error: 'Bu rol adı zaten kullanımda.' }
    setRoles((previous) => [...previous, enrichRole({ ...role, name: role.name.trim(), id: generateId('role'), isSystem: false, createdAt: new Date().toISOString() })])
    return { ok: true }
  }, [roles])

  const updateRole = useCallback((id: string, patch: Partial<Omit<CustomRole, 'id' | 'createdAt' | 'isSystem'>>) => {
    setRoles((previous) => {
      const updated = previous.map((role) => role.id === id ? enrichRole({ ...role, ...patch }) : role)
      const updatedRole = updated.find((role) => role.id === id)
      if (updatedRole) setCurrentUser((session) => session?.roleId === id ? sessionFromRole(session, updatedRole) : session)
      return updated
    })
  }, [])

  const deleteRole = useCallback((id: string): { ok: boolean; error?: string } => {
    const role = roles.find((item) => item.id === id)
    if (role?.isSystem) return { ok: false, error: 'Sistem rolleri silinemez.' }
    if (users.some((user) => user.roleId === id)) return { ok: false, error: 'Bu role atanmış kullanıcılar var. Önce kullanıcıların rolünü değiştirin.' }
    setRoles((previous) => previous.filter((item) => item.id !== id))
    return { ok: true }
  }, [roles, users])

  const hasPermission = useCallback((permission: PermissionKey) => Boolean(currentUser?.permissions.includes(permission)), [currentUser])
  const hasPageAccess = useCallback((path: string) => {
    if (!currentUser) return false
    const required = getRoutePermission(path)
    return required ? currentUser.permissions.includes(required) : true
  }, [currentUser])
  const hasMenuAccess = useCallback((path: string) => {
    if (!currentUser) return false
    const modulePrefixes: Partial<Record<MenuKey, string[]>> = {
      '/': ['dashboard.'], '/hasta-kayit': ['patients.', 'protocols.'], '/laboratuvar': ['lab.', 'examinations.'],
      '/muhasebe': ['accounting.'], '/istatistikler': ['statistics.'], '/ayarlar': ['settings.'],
    }
    const prefixes = modulePrefixes[path as MenuKey]
    if (prefixes) return currentUser.permissions.some((permission) => prefixes.some((prefix) => permission.startsWith(prefix)))
    return hasPageAccess(path)
  }, [currentUser, hasPageAccess])
  const getLandingPath = useCallback(() => currentUser ? getFirstAccessiblePath(currentUser.permissions) : '/giris', [currentUser])
  const canApproveAudiometry = hasPermission('examinations.audiometry.approve')
  const canApproveEyeExamination = hasPermission('examinations.eye.approve')
  const canManageUsers = hasPermission('settings.users.manage')

  const value = useMemo<AuthContextType>(() => ({
    currentUser, users, roles, login, logout, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole, getRole,
    hasPermission, hasPageAccess, hasMenuAccess, getLandingPath, canApproveAudiometry, canApproveEyeExamination, canManageUsers,
  }), [currentUser, users, roles, login, logout, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole, getRole, hasPermission, hasPageAccess, hasMenuAccess, getLandingPath, canApproveAudiometry, canApproveEyeExamination, canManageUsers])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export type { PermissionKey }
