import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/state/AuthContext'

const STORAGE_KEY = 'cetka-institution'

interface InstitutionInfo {
  name?: string
  address?: string
  phone?: string
  logo?: string
  ministryLogo?: string
  smsTitle?: string
}

function loadInstitution(): InstitutionInfo {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as InstitutionInfo
  } catch {
    // ignore
  }
  return {}
}

const EyeIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const PhoneIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
)

const MapPinIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
)

const HeartPulseIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
  </svg>
)

const FlaskIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6M10 3v6.5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-8.5V3" />
    <path d="M7.5 14h9" />
  </svg>
)

const features = [
  { icon: <HeartPulseIcon />, title: 'Sağlık Takibi', desc: 'Hasta muayene ve tarama süreçleri' },
  { icon: <FlaskIcon />, title: 'Laboratuvar', desc: 'Tetkik ve sonuç yönetimi' },
  { icon: <ShieldIcon />, title: 'OSGB Uyumlu', desc: 'İş sağlığı ve güvenliği standartları' },
]

interface LoginProps {
  isLoggedIn: boolean
}

export function Login({ isLoggedIn }: LoginProps) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const institution = loadInstitution()
  const institutionName = institution.name || institution.smsTitle || 'Çet-Ka OSGB'

  useEffect(() => {
    document.title = `${institutionName} - Giriş | HanTech`
    if (isLoggedIn) {
      navigate('/', { replace: true })
    }
  }, [institutionName, isLoggedIn, navigate])
  const [username, setUsername] = useState(() => localStorage.getItem('cetka-remember-user') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('cetka-remember') === 'true')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve parola alanlarını doldurunuz.')
      return
    }

    setIsLoading(true)
    setTimeout(() => {
      const result = login(username, password)
      setIsLoading(false)
      if (!result.ok) {
        setError(result.error || 'Giriş yapılamadı.')
      } else if (rememberMe) {
        localStorage.setItem('cetka-remember', 'true')
        localStorage.setItem('cetka-remember-user', username.trim())
      } else {
        localStorage.removeItem('cetka-remember')
        localStorage.removeItem('cetka-remember-user')
      }
    }, 600)
  }

  const fillDemoAccount = () => {
    setUsername('admin')
    setPassword('admin123')
    setError('')
  }

  const fillOdyoAccount = () => {
    setUsername('odyometrist')
    setPassword('odyo123')
    setError('')
  }

  return (
    <div className="flex min-h-screen font-sans bg-slate-100">
      {/* Sol Panel — Marka */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 text-white relative overflow-hidden">
        {/* Dekoratif arka plan */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-blue-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-32 w-[26rem] h-[26rem] bg-cyan-400/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 left-1/4 w-[30rem] h-[30rem] bg-indigo-500/15 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        {/* Üst — Marka (HanTech) */}
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 backdrop-blur flex items-center justify-center shadow-2xl border border-white/20">
              <span className="text-4xl font-black tracking-tighter text-white">H</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight leading-none">HanTech</h1>
              <p className="text-sm text-blue-200 mt-1.5 font-medium tracking-wide">
                OSGB Yönetim Sistemi
              </p>
            </div>
          </div>
          {/* Kurum etiketi — küçük */}
          {institutionName && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur border border-white/15">
              <span className="text-[10px] text-blue-300 font-medium uppercase tracking-wider">Kurum</span>
              <span className="text-xs text-white font-semibold">{institutionName}</span>
            </div>
          )}
        </div>

        {/* Orta — Özellikler */}
        <div className="relative z-10 max-w-md">
          <h2 className="text-xl font-semibold mb-6 text-blue-100">
            Modern ve güvenli sağlık süreçleri
          </h2>
          <div className="space-y-3">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 transition-colors"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 text-slate-900 shadow-lg flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <p className="font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-blue-200 mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alt — İletişim & Telif */}
        <div className="relative z-10 space-y-3">
          {institution.address && (
            <div className="flex items-start gap-2.5 text-sm text-blue-100">
              <MapPinIcon />
              <span className="leading-relaxed">{institution.address}</span>
            </div>
          )}
          {institution.phone && (
            <div className="flex items-center gap-2.5 text-sm text-blue-100">
              <PhoneIcon />
              <span className="font-medium tracking-wide">{institution.phone}</span>
            </div>
          )}
          <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between text-xs text-blue-200/80">
            <span>© {new Date().getFullYear()} HanTech</span>
            <span className="text-blue-300/70">{institutionName}</span>
          </div>
        </div>
      </div>

      {/* Sağ Panel — Giriş Formu */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        {/* Mobil logo (lg altı) */}
        <div className="lg:hidden absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-black text-2xl shadow-lg">
            H
          </div>
          <p className="text-sm font-bold text-slate-800">HanTech</p>
          <p className="text-[10px] text-slate-400">{institutionName}</p>
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-300/50 p-8 md:p-10 lg:mt-0 mt-24">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Tekrar hoş geldiniz</h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Devam etmek için hesabınıza giriş yapın
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Kullanıcı Adı
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınızı girin"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Parola
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolanızı girin"
                  className="w-full px-4 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer rounded"
                />
                <span>Beni hatırla</span>
              </label>
              <span className="text-xs text-slate-500" title="Parola sıfırlama işlemini kurum yöneticiniz yapabilir">
                Parola için yöneticinize başvurun
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:from-blue-700 hover:to-blue-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  Giriş Yap
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={fillDemoAccount}
                className="py-2.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                Demo Admin
              </button>
              <button
                type="button"
                onClick={fillOdyoAccount}
                className="py-2.5 border border-blue-200 text-blue-600 text-xs font-medium rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                Demo Odyometrist
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} HanTech · OSGB Yönetim Sistemi
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Kurum: <span className="font-semibold text-slate-600">{institutionName}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
