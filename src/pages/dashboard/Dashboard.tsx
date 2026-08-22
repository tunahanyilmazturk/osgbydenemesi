import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  Plus,
  Stethoscope,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatients } from '../../context/PatientsContext'
import { useProtocols } from '../../context/ProtocolsContext'
import { useCompanies } from '../../context/CompaniesContext'
import { useAuth } from '../../context/AuthContext'
import { nowLocalDate } from '../../utils/date'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { TrendChart, DonutChart } from '../../components/ui/Charts'
import type { Protocol } from '../../types'

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

const STATUS_COLORS: Record<string, string> = {
  'Numune Bekliyor': '#f59e0b',
  'Barkod Verildi': '#0ea5e9',
  'Numune Kabul': '#6366f1',
  'Sonuç Bekleniyor': '#f43f5e',
  'Sonuç Girildi': '#8b5cf6',
  Onaylandı: '#10b981',
  Tamamlandı: '#10b981',
  Bekliyor: '#f59e0b',
}

export function Dashboard() {
  const navigate = useNavigate()
  const { patients } = usePatients()
  const { protocols } = useProtocols()
  const { activeCompanies } = useCompanies()
  const { users, currentUser } = useAuth()

  const today = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const todayStr = nowLocalDate()
  const thisMonth = todayStr.slice(0, 7)

  // --- Hesaplamalar ---
  const metrics = useMemo(() => {
    const todayProtocols = protocols.filter((p) => p.protocolDate.startsWith(todayStr))
    const todayPatients = new Set(todayProtocols.map((p) => p.patientId)).size
    const todayServices = todayProtocols.reduce((s, p) => s + p.services.length, 0)
    const totalServices = protocols.reduce((s, p) => s + p.services.length, 0)

    const pendingResults = protocols.reduce(
      (s, p) => s + p.services.filter((x) => x.status === 'Sonuç Bekleniyor' || x.status === 'Numune Bekliyor').length,
      0
    )
    const pendingApproval = protocols.reduce(
      (s, p) => s + p.services.filter((x) => x.status === 'Sonuç Girildi').length,
      0
    )
    const pendingProtocols = protocols.filter((p) => p.status === 'Bekliyor').length

    const todayPayments = todayProtocols.reduce(
      (s, p) => s + p.payments.filter((pay) => pay.paymentType !== 'İndirim').reduce((x, pay) => x + pay.amount, 0),
      0
    )
    const monthPayments = protocols
      .filter((p) => p.protocolDate.startsWith(thisMonth))
      .reduce(
        (s, p) => s + p.payments.filter((pay) => pay.paymentType !== 'İndirim').reduce((x, pay) => x + pay.amount, 0),
        0
      )

    const activeUsers = users.filter((u) => u.isActive).length

    return {
      todayPatients,
      todayServices,
      totalServices,
      pendingResults,
      pendingApproval,
      pendingProtocols,
      todayPayments,
      monthPayments,
      activeUsers,
    }
  }, [protocols, todayStr, thisMonth, users])

  // --- Kompakt istatistikler (hero header için) ---
  const heroStats = useMemo(
    () => [
      { label: 'Bugünkü Hasta', value: metrics.todayPatients, icon: Users, color: 'text-blue-300', bg: 'bg-blue-500/15' },
      { label: 'Bugünkü Hizmet', value: metrics.todayServices, icon: Activity, color: 'text-emerald-300', bg: 'bg-emerald-500/15' },
      { label: 'Bekleyen Sonuç', value: metrics.pendingResults, icon: FlaskConical, color: 'text-amber-300', bg: 'bg-amber-500/15' },
      { label: 'Tahsilat (Bugün)', value: `₺${metrics.todayPayments.toFixed(0)}`, icon: Wallet, color: 'text-violet-300', bg: 'bg-violet-500/15' },
      { label: 'Aktif Firma', value: activeCompanies.length, icon: Building2, color: 'text-sky-300', bg: 'bg-sky-500/15' },
      { label: 'Bekleyen Protokol', value: metrics.pendingProtocols, icon: FileText, color: 'text-rose-300', bg: 'bg-rose-500/15' },
      { label: 'Onay Bekleyen', value: metrics.pendingApproval, icon: Stethoscope, color: 'text-indigo-300', bg: 'bg-indigo-500/15' },
      { label: 'Aktif Kullanıcı', value: metrics.activeUsers, icon: Clock, color: 'text-teal-300', bg: 'bg-teal-500/15' },
    ],
    [metrics, activeCompanies.length]
  )

  // --- Son protokoller ---
  const recentProtocols = useMemo(() => {
    return [...protocols]
      .sort((a, b) => new Date(b.protocolDate).getTime() - new Date(a.protocolDate).getTime())
      .slice(0, 6)
  }, [protocols])

  // --- Bekleyen işler ---
  const pendingTasks = useMemo(() => {
    const tasks: { label: string; count: number; route: string; color: string }[] = []
    if (metrics.pendingResults > 0) {
      tasks.push({
        label: 'Bekleyen Sonuçlar',
        count: metrics.pendingResults,
        route: '/laboratuvar',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
      })
    }
    if (metrics.pendingApproval > 0) {
      tasks.push({
        label: 'Onay Bekleyen Sonuçlar',
        count: metrics.pendingApproval,
        route: '/laboratuvar',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      })
    }
    if (metrics.pendingProtocols > 0) {
      tasks.push({
        label: 'Açık Protokoller',
        count: metrics.pendingProtocols,
        route: '/hasta-kayit',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
      })
    }
    return tasks
  }, [metrics])

  // --- 7 günlük trend verisi ---
  const weeklyTrend = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const key = `${y}-${m}-${day}`
      const count = protocols.filter((p) => p.protocolDate.startsWith(key)).length
      days.push({
        label: d.toLocaleDateString('tr-TR', { weekday: 'short' }).slice(0, 3),
        value: count,
      })
    }
    return days
  }, [protocols])

  const weeklyPayments = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const key = `${y}-${m}-${day}`
      const total = protocols
        .filter((p) => p.protocolDate.startsWith(key))
        .reduce(
          (s, p) => s + p.payments.filter((pay) => pay.paymentType !== 'İndirim').reduce((x, pay) => x + pay.amount, 0),
          0
        )
      days.push({
        label: d.toLocaleDateString('tr-TR', { weekday: 'short' }).slice(0, 3),
        value: Math.round(total),
      })
    }
    return days
  }, [protocols])

  // --- Hizmet dağılımı (donut) ---
  const serviceDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    protocols.forEach((p) => {
      p.services.forEach((s) => {
        counts[s.group] = (counts[s.group] ?? 0) + 1
      })
    })
    const palette = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#0ea5e9', '#6366f1', '#14b8a6']
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }))
  }, [protocols])

  // --- Hızlı aksiyonlar (gerçek route'lar) ---
  const quickActions = [
    { label: 'Yeni Hasta', icon: UserPlus, color: 'bg-blue-600 hover:bg-blue-700', route: '/hasta-kayit/yeni' },
    { label: 'Protokol Oluştur', icon: FileText, color: 'bg-emerald-600 hover:bg-emerald-700', route: '/protokol/yeni' },
    { label: 'Sonuç Girişi', icon: FlaskConical, color: 'bg-amber-600 hover:bg-amber-700', route: '/laboratuvar' },
    { label: 'Rapor Al', icon: Stethoscope, color: 'bg-violet-600 hover:bg-violet-700', route: '/istatistikler' },
  ]

  const activeUser = users.find((u) => u.id === currentUser?.id)
  const lastLogin = activeUser?.lastLoginAt
    ? new Date(activeUser.lastLoginAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-'

  const lastProtocolDate = protocols.length
    ? new Date(Math.max(...protocols.map((p) => new Date(p.protocolDate).getTime()))).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '-'

  return (
    <div className="space-y-6">
      {/* Hero Header — şık karşılama + kompakt istatistikler */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 shadow-xl">
        {/* Dekoratif arka plan elemanları */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-12 w-72 h-72 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-emerald-500/10 blur-2xl" />
        </div>

        <div className="relative p-6 lg:p-8">
          {/* Üst satır: Marka + Karşılama / Yeni Hasta butonu */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              {/* Marka rozeti */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <span className="text-white font-black text-base tracking-tighter">H</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-white tracking-tight">HanTech</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">OSGB Yönetim Sistemi</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sistem Aktif
                </span>
                <span className="text-[11px] text-slate-400">
                  Oturum: <span className="text-slate-300 font-medium">{currentUser?.displayName ?? '-'}</span>
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white">
                Hoş geldiniz, <span className="text-blue-400">{currentUser?.displayName ?? 'Kullanıcı'}</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">{today}</p>
            </div>
            <button
              onClick={() => navigate('/hasta-kayit/yeni')}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Yeni Hasta
            </button>
          </div>

          {/* Kompakt istatistik şeridi */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
            {heroStats.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${stat.bg} flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 truncate">{stat.label}</p>
                    <p className="text-sm font-bold text-white truncate">{stat.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bekleyen işler widget'ı */}
      {pendingTasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800">Bekleyen İşler</h3>
            <span className="text-xs text-slate-400">({pendingTasks.reduce((s, t) => s + t.count, 0)} toplam)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pendingTasks.map((task) => (
              <button
                key={task.label}
                onClick={() => navigate(task.route)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md text-left ${task.color}`}
              >
                <div>
                  <p className="text-sm font-semibold">{task.label}</p>
                  <p className="text-xs opacity-75 mt-0.5">Tıkla ve görüntüle</p>
                </div>
                <span className="text-2xl font-bold">{task.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.route)}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl text-white font-medium shadow-lg shadow-black/10 transition-colors ${action.color}`}
            >
              <Icon className="w-7 h-7" />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>

      {/* Charts satırı */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7 günlük protokol trendi */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">Haftalık Protokol Trendi</h3>
              <p className="text-xs text-slate-400 mt-0.5">Son 7 günde oluşturulan protokol sayısı</p>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
              {weeklyTrend.reduce((s, d) => s + d.value, 0)} protokol
            </span>
          </div>
          <TrendChart data={weeklyTrend} color="#2563eb" height={200} />
        </div>

        {/* Hizmet dağılımı donut */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-1">Hizmet Dağılımı</h3>
          <p className="text-xs text-slate-400 mb-4">Tüm protokollerde</p>
          {serviceDistribution.length > 0 ? (
            <DonutChart segments={serviceDistribution} size={130} />
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Veri yok</p>
          )}
        </div>
      </div>

      {/* Tahsilat trendi */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800">Haftalık Tahsilat</h3>
            <p className="text-xs text-slate-400 mt-0.5">Son 7 günde tahsil edilen tutar (₺)</p>
          </div>
          <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg">
            ₺{weeklyPayments.reduce((s, d) => s + d.value, 0).toLocaleString('tr-TR')}
          </span>
        </div>
        <TrendChart data={weeklyPayments} color="#8b5cf6" height={180} valueSuffix=" ₺" />
      </div>

      {/* Son protokoller + Durum özeti */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Son protokoller */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Son Protokoller</h3>
            <button
              onClick={() => navigate('/hasta-kayit')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Tümünü Gör
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Protokol No</th>
                  <th className="px-6 py-3 font-medium">Hasta</th>
                  <th className="px-6 py-3 font-medium">Firma</th>
                  <th className="px-6 py-3 font-medium">Tür</th>
                  <th className="px-6 py-3 font-medium">Durum</th>
                  <th className="px-6 py-3 font-medium">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentProtocols.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Henüz protokol yok
                    </td>
                  </tr>
                ) : (
                  recentProtocols.map((p: Protocol) => {
                    const patient = patients.find((pt) => pt.id === p.patientId)
                    return (
                      <tr
                        key={p.id}
                        onClick={() => navigate(`/protokol/${p.id}`)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{p.protocolNo}</td>
                        <td className="px-6 py-4 font-medium text-slate-800">{patient?.name ?? '-'}</td>
                        <td className="px-6 py-4 text-slate-600">{p.company}</td>
                        <td className="px-6 py-4 text-slate-600">{p.examType}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(p.protocolDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Durum özeti — gerçek metrikler */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-5">Durum Özeti</h3>

          {/* Servis durum dağılımı */}
          <div className="space-y-3 mb-5">
            {Object.entries(
              protocols.reduce<Record<string, number>>((acc, p) => {
                p.services.forEach((s) => {
                  acc[s.status] = (acc[s.status] ?? 0) + 1
                })
                return acc
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([status, count]) => {
                const max = protocols.reduce((s, p) => s + p.services.length, 0)
                const pct = max > 0 ? Math.round((count / max) * 100) : 0
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[status] ?? '#94a3b8' }} />
                        {status}
                      </span>
                      <span className="font-semibold text-slate-800">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: STATUS_COLORS[status] ?? '#94a3b8' }} />
                    </div>
                  </div>
                )
              })}
            {protocols.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Veri yok</p>}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2.5 text-sm">
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Sistem aktif</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Son giriş: <strong className="text-slate-700">{lastLogin}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Son protokol: <strong className="text-slate-700">{lastProtocolDate}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Aktif firma: <strong className="text-slate-700">{activeCompanies.length}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-200">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex flex-col items-center lg:items-start gap-1">
            <p>© 2026 <span className="font-semibold text-slate-700">HanTech</span> — OSGB Yönetim Sistemi</p>
            <p className="text-[11px] text-slate-400">
              Kurum: <span className="font-medium text-slate-600">{loadInstitutionName()}</span>
            </p>
          </div>
          <div className="flex items-center gap-6">
            <span>v: 1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
