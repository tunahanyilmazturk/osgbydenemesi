import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Maximize,
  Menu,
  Search,
  Settings,
  Users,
  Wallet,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'

const INSTITUTION_KEY = 'cetka-institution'

function loadInstitutionName(): string {
  try {
    const raw = localStorage.getItem(INSTITUTION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { name?: string; smsTitle?: string }
      if (parsed.name) return parsed.name
      if (parsed.smsTitle) return parsed.smsTitle
    }
  } catch {
    // ignore
  }
  return 'Çet-Ka OSGB'
}

interface LayoutProps {
  children: React.ReactNode
  onLogout: () => void
}

interface MenuItem {
  path: string
  label: string
  icon: React.ReactNode
  children?: { path: string; label: string }[]
}

const staticMenuItems: MenuItem[] = [
  {
    path: '/',
    label: 'Ana Sayfa',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    path: '/hasta-kayit',
    label: 'Hasta Kayıt Kabul',
    icon: <Users className="w-4 h-4" />,
    children: [
      { path: '/hasta-kayit', label: 'Hasta Listesi' },
      { path: '/hasta-kayit/yeni', label: 'Yeni Hasta' },
    ],
  },
  {
    path: '/laboratuvar',
    label: 'Laboratuvar İşlemleri',
    icon: <FlaskConical className="w-4 h-4" />,
    children: [
      { path: '/laboratuvar', label: 'Sonuç İşlemleri' },
      { path: '/laboratuvar/laboratuvar', label: 'Laboratuvar' },
      { path: '/laboratuvar/hizli-onay', label: 'Hızlı Onay' },
      { path: '/laboratuvar/dis-lab-gonderim', label: 'Dış Lab Gönderim' },
      { path: '/laboratuvar/dis-lab-izlem', label: 'Dış Lab İzlem' },
      { path: '/laboratuvar/nred-nedenleri', label: 'N.Red Nedenleri' },
    ],
  },
  {
    path: '/muhasebe',
    label: 'Ön Muhasebe',
    icon: <Wallet className="w-4 h-4" />,
    children: [
      { path: '/muhasebe/kasa-raporu', label: 'Kasa Raporu' },
      { path: '/muhasebe/transfer', label: 'Kasa Transfer' },
      { path: '/muhasebe/hareketler', label: 'Kasa Hareketleri' },
      { path: '/muhasebe/borclular', label: 'Borçlu Hastalar' },
      { path: '/muhasebe/fatura-icmal', label: 'Fatura İcmal' },
    ],
  },
  {
    path: '/istatistikler',
    label: 'İstatistikler',
    icon: <Activity className="w-4 h-4" />,
    children: [{ path: '/istatistikler', label: 'Gün Sonu Raporu' }],
  },
  {
    path: '/ayarlar',
    label: 'Genel Ayarlar',
    icon: <Settings className="w-4 h-4" />,
    children: [
      { path: '/ayarlar', label: 'Kurum Bilgileri' },
      { path: '/ayarlar/sms', label: 'SMS Ayarları' },
      { path: '/ayarlar/barkod', label: 'Barkod Ayarları' },
      { path: '/ayarlar/goz-muayenesi-sablonlari', label: 'Göz Muayenesi Şablonları' },
      { path: '/ayarlar/doktorlar', label: 'Doktor Tanımları' },
      { path: '/ayarlar/hizmet-tup-tipleri', label: 'Hizmet Tüp Tipi Tanımları' },
      { path: '/ayarlar/hizmetler', label: 'Hizmet Tanımları' },
      { path: '/ayarlar/paketler', label: 'Hizmet Paketleri' },
      { path: '/ayarlar/firmalar', label: 'Firma Tanımları' },
      { path: '/ayarlar/osgb', label: 'OSGB Tanımları' },
      { path: '/ayarlar/muayene-turleri', label: 'Muayene Türü Tanımları' },
      { path: '/ayarlar/dis-laboratuvarlar', label: 'Dış Laboratuvar Tanımları' },
      { path: '/ayarlar/kasalar', label: 'Kasa Tanımları' },
      { path: '/ayarlar/web-sonuc-kullanicilari', label: 'Web Sonuç Kullanıcıları' },
      { path: '/ayarlar/ek2-rapor-tanimlari', label: 'Ek2 Rapor Tanımları' },
      { path: '/ayarlar/kullanicilar', label: 'Kullanıcı Yönetimi' },
    ],
  },
]

const pathToTitle: Record<string, string> = {
  '/': 'Ana Sayfa',
  '/hasta-kayit': 'Hasta Kayıt Kabul',
  '/hasta-kayit/yeni': 'Yeni Hasta Kaydı',
  '/laboratuvar': 'Sonuç İşlemleri',
  '/laboratuvar/laboratuvar': 'Laboratuvar',
  '/laboratuvar/hizli-onay': 'Hızlı Onay',
  '/laboratuvar/dis-lab-gonderim': 'Dış Lab Gönderim',
  '/laboratuvar/dis-lab-gonderim/yeni': 'Dış Laboratuvar',
  '/laboratuvar/dis-lab-izlem': 'Dış Lab İzlem',
  '/laboratuvar/nred-nedenleri': 'N.Red Nedenleri',
  '/muhasebe': 'Ön Muhasebe',
  '/muhasebe/kasa-raporu': 'Kasa Raporu',
  '/muhasebe/transfer': 'Kasa Transfer',
  '/muhasebe/hareketler': 'Kasa Hareketleri',
  '/muhasebe/borclular': 'Borçlu Hastalar',
  '/muhasebe/fatura-icmal': 'Fatura İcmal',
  '/istatistikler': 'İstatistikler',
  '/ayarlar': 'Kurum Bilgileri',
  '/ayarlar/sms': 'SMS Ayarları',
  '/ayarlar/barkod': 'Barkod Ayarları',
  '/ayarlar/goz-muayenesi-sablonlari': 'Göz Muayenesi Şablonları',
  '/ayarlar/doktorlar': 'Doktor Tanımları',
  '/ayarlar/hizmet-tup-tipleri': 'Hizmet Tüp Tipi Tanımları',
  '/ayarlar/hizmetler': 'Hizmet Tanımları',
  '/ayarlar/paketler': 'Hizmet Paketleri',
  '/ayarlar/firmalar': 'Firma Tanımları',
  '/ayarlar/firmalar/yeni': 'Yeni Firma',
  '/ayarlar/osgb': 'OSGB Tanımları',
  '/ayarlar/muayene-turleri': 'Muayene Türü Tanımları',
  '/ayarlar/dis-laboratuvarlar': 'Dış Laboratuvar Tanımları',
  '/ayarlar/kasalar': 'Kasa Tanımları',
  '/ayarlar/web-sonuc-kullanicilari': 'Web Sonuç Kullanıcıları',
  '/ayarlar/ek2-rapor-tanimlari': 'Ek2 Rapor Tanımları',
  '/ayarlar/kullanicilar': 'Kullanıcı Yönetimi',
  '/ayarlar/paketler/yeni': 'Yeni Paket',
}

// Dinamik route'lar için ek başlık eşlemeleri
function getDynamicTitle(pathname: string): string | null {
  if (pathname.match(/\/ayarlar\/firmalar\/duzenle\//)) return 'Firma Düzenle'
  if (pathname.match(/\/ayarlar\/paketler\/duzenle\//)) return 'Paket Düzenle'
  return null
}

function getPageTitle(pathname: string) {
  if (pathname.includes('/protokol/') && pathname.endsWith('/yeni')) {
    return 'Yeni Protokol'
  }
  if (pathname.match(/\/protokol\/\d+\/\d+$/)) {
    return 'Protokol Detay'
  }
  if (pathname.startsWith('/hasta-kayit/protokol/')) {
    return 'Protokol Kartı'
  }
  const dynamic = getDynamicTitle(pathname)
  if (dynamic) return dynamic
  return pathToTitle[pathname] ?? 'HanTech OSGB'
}

function normalize(s: string) {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/\u0130/g, 'i')
    .replace(/\u0131/g, 'i')
    .replace(/\u015e/g, 's')
    .replace(/\u00e7/g, 'c')
    .replace(/\u00f6/g, 'o')
    .replace(/\u00fc/g, 'u')
    .replace(/\u011f/g, 'g')
    .replace(/[^a-z0-9]/g, '')
}

export function Layout({ children, onLogout }: LayoutProps) {
  const location = useLocation()
  const { currentUser, hasMenuAccess } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/hasta-kayit'])
  const [searchQuery, setSearchQuery] = useState('')
  const [recentPaths, setRecentPaths] = useState<string[]>([])

  // Rol bazlı menü filtreleme
  const menuItems = useMemo(() => {
    return staticMenuItems
      .filter((item) => hasMenuAccess(item.path))
      .map((item) => ({
        ...item,
        children: item.children?.filter((child) => hasMenuAccess(child.path)),
      }))
      .filter((item) => !item.children || item.children.length > 0)
  }, [hasMenuAccess])

  const currentTitle = getPageTitle(location.pathname)

  // Son ziyaret edilen sayfaları takip et
  useEffect(() => {
    setRecentPaths((prev) => {
      const next = prev.filter((p) => p !== location.pathname)
      return [location.pathname, ...next].slice(0, 5)
    })
  }, [location.pathname])

  // Aktif menüye göre alt menüleri otomatik aç
  useEffect(() => {
    const activeMenu = menuItems.find((item) =>
      item.children?.some((child) => location.pathname.startsWith(child.path))
    )
    if (activeMenu && !expandedMenus.includes(activeMenu.path)) {
      setExpandedMenus((prev) => [...prev, activeMenu.path])
    }
  }, [location.pathname, menuItems])

  const filteredMenuItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems
    const q = normalize(searchQuery)
    return menuItems
      .map((item) => {
        const matchesParent = normalize(item.label).includes(q)
        const filteredChildren = item.children?.filter((child) =>
          normalize(child.label).includes(q)
        )
        if (matchesParent) return item
        if (filteredChildren && filteredChildren.length > 0) {
          return { ...item, children: filteredChildren }
        }
        return null
      })
      .filter(Boolean) as MenuItem[]
  }, [searchQuery, menuItems])

  const toggleMenu = (path: string) => {
    setExpandedMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const sidebarWidth = collapsed ? 'w-16' : 'w-56'

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 ${sidebarWidth} bg-slate-900 text-slate-300 border-r border-slate-800 transform transition-all duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        <NavLink
          to="/"
          className="h-12 flex items-center px-3 border-b border-slate-800 shrink-0"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="flex items-center gap-2 text-white">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <span className="text-white font-black text-sm tracking-tighter">H</span>
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-sm leading-tight tracking-tight">HanTech</h1>
                <span className="text-[10px] text-slate-400">OSGB Yönetim Sistemi</span>
              </div>
            )}
          </div>
        </NavLink>

        {/* Search */}
        {!collapsed && (
          <div className="px-2 py-1.5 border-b border-slate-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input
                type="text"
                placeholder="Menüde ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1 bg-slate-800/50 border border-slate-700 rounded-md text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        <nav className="p-1.5 space-y-0.5 overflow-y-auto flex-1 min-h-0">
          {filteredMenuItems.map((item) => {
            const isExpanded = expandedMenus.includes(item.path)
            const hasChildren = !!item.children

            return (
              <div key={item.path}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleMenu(item.path)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2.5 py-1.5 rounded-lg transition-all hover:bg-slate-800 hover:text-white`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
                      {!collapsed && <span className="font-medium text-[13px] truncate">{item.label}</span>}
                    </div>
                    {!collapsed && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>
                ) : (
                  <NavLink
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-2.5 py-1.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                          : 'hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
                      {!collapsed && <span className="font-medium text-[13px] truncate">{item.label}</span>}
                    </div>
                  </NavLink>
                )}

                {hasChildren && isExpanded && !collapsed && (
                  <div className="mt-0.5 ml-3 pl-2.5 border-l border-slate-700 space-y-0.5">
                    {item.children?.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                            isActive
                              ? 'text-blue-400 font-medium bg-slate-800/50'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`
                        }
                      >
                        <span className="truncate">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Recent pages */}
          {!collapsed && recentPaths.length > 1 && (
            <div className="pt-2 border-t border-slate-800 mt-2">
              <p className="px-2.5 text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Son Ziyaret Edilenler
              </p>
              <div className="space-y-0.5">
                {recentPaths.slice(1).map((path) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={() => setSidebarOpen(false)}
                    className="block px-2.5 py-1 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 truncate"
                    title={getPageTitle(path)}
                  >
                    {getPageTitle(path)}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom panel */}
        {!collapsed && (
          <div className="border-t border-slate-800 p-2 shrink-0">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs shrink-0">
                {currentUser?.displayName?.slice(0, 2).toUpperCase() ?? 'HT'}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-200 truncate">{currentUser?.displayName ?? 'Kullanıcı'}</p>
                <p className="text-[9px] text-slate-500 truncate flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5" />
                  {loadInstitutionName()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Toggle button on sidebar edge */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-full top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-500 transition-colors z-50"
          title={collapsed ? 'Genişlet' : 'Daralt'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800">{currentTitle}</h2>
          </div>

          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
              <Maximize className="w-5 h-5" />
            </button>
            {/* Bildirim Merkezi */}
            <div className="relative group">
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-800">
                    Bildirimler{unreadCount > 0 && ` (${unreadCount})`}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] text-blue-600 hover:underline font-medium"
                    >
                      Tümünü okundu işaretle
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Bildirim yok</p>
                    </div>
                  ) : (
                    notifications.slice(0, 20).map((n) => {
                      const colors: Record<string, string> = {
                        pending_result: 'bg-amber-50 border-amber-200',
                        pending_approval: 'bg-blue-50 border-blue-200',
                        pending_sample: 'bg-slate-50 border-slate-200',
                        info: 'bg-slate-50 border-slate-200',
                      }
                      const iconColors: Record<string, string> = {
                        pending_result: 'text-amber-600',
                        pending_approval: 'text-blue-600',
                        pending_sample: 'text-slate-500',
                        info: 'text-slate-500',
                      }
                      return (
                        <button
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors ${!n.read ? colors[n.type] : ''}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-transparent' : iconColors[n.type]}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold ${n.read ? 'text-slate-500' : 'text-slate-800'}`}>
                                {n.title}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {n.message}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="relative group">
              <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">
                  {(currentUser?.displayName || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-xs font-medium text-slate-700">{currentUser?.displayName || 'Kullanıcı'}</span>
                  <span className="text-[10px] text-slate-400">{currentUser?.roleName || 'Kullanıcı'}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="px-4 py-2.5 border-b border-slate-100 first:rounded-t-xl">
                  <p className="text-xs font-medium text-slate-700">{currentUser?.displayName}</p>
                  <p className="text-[10px] text-slate-400">@{currentUser?.username}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 last:rounded-b-xl"
                >
                  Güvenli Çıkış
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 lg:p-5 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
