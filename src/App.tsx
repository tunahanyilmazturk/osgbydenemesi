import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Login } from './components/Login'
import { AuthProvider, useAuth, ALL_MENUS } from './context/AuthContext'
import { Accounting } from './pages/accounting/Accounting'
import { Debtors } from './pages/debtors/Debtors'
import { CashTransfer } from './pages/cash/CashTransfer'
import { CashMovements } from './pages/cash/CashMovements'
import { InvoiceSummary } from './pages/definitions/InvoiceSummary'
import { Companies } from './pages/companies/Companies'
import { NewCompany } from './pages/companies/NewCompany'
import { Dashboard } from './pages/dashboard/Dashboard'
import { Lab } from './pages/lab/Lab'
import { Laboratory } from './pages/lab/Laboratory'
import { QuickApproval } from './pages/definitions/QuickApproval'
import { ExternalLabSend } from './pages/external-labs/ExternalLabSend'
import { ExternalLabSendNew } from './pages/external-labs/ExternalLabSendNew'
import { ExternalLabTrack } from './pages/external-labs/ExternalLabTrack'
import { NredReasons } from './pages/definitions/NredReasons'
import { NewPatient } from './pages/patients/NewPatient'
import { NewProtocol } from './pages/protocols/NewProtocol'
import { NewPackage } from './pages/packages/NewPackage'
import { PackageDefinitions } from './pages/packages/PackageDefinitions'
import { Patients } from './pages/patients/Patients'
import { Protocol } from './pages/protocols/Protocol'
import { ProtocolDetail } from './pages/protocols/ProtocolDetail'
import { ServiceDefinitions } from './pages/services/ServiceDefinitions'
import { Settings } from './pages/settings/Settings'
import { SmsSettings } from './pages/settings/SmsSettings'
import { BarcodeSettings } from './pages/settings/BarcodeSettings'
import { EyeExamTemplates } from './pages/settings/EyeExamTemplates'
import { Doctors } from './pages/doctors/Doctors'
import { Stats } from './pages/stats/Stats'
import { Users } from './pages/users/Users'
import { ServiceTubeTypes } from './pages/definitions/ServiceTubeTypes'
import { OSGBDefinitions } from './pages/definitions/OSGBDefinitions'
import { ExamTypeDefinitions } from './pages/exam-types/ExamTypeDefinitions'
import { ExternalLabs } from './pages/external-labs/ExternalLabs'
import { CashDefinitions } from './pages/cash/CashDefinitions'
import { WebResultUsers } from './pages/definitions/WebResultUsers'
import { Ek2ReportDefinitions } from './pages/definitions/Ek2ReportDefinitions'
import { NotFoundPage } from './components/ui/EmptyState'

function ProtectedLayout({ onLogout }: { onLogout: () => void }) {
  const { currentUser, hasMenuAccess } = useAuth()
  const location = useLocation()
  if (!currentUser) {
    return <Navigate to="/giris" replace />
  }
  // Yetkisiz sayfaya erişim engeli — kullanıcının erişebileceği ilk menüye yönlendir
  if (!hasMenuAccess(location.pathname)) {
    const menus = currentUser.allowedMenus && currentUser.allowedMenus.length
      ? currentUser.allowedMenus
      : ALL_MENUS
    const firstAllowed = menus[0] || '/'
    return <Navigate to={firstAllowed} replace />
  }

  return (
    <Layout onLogout={onLogout}>
      <Outlet />
    </Layout>
  )
}

function AppContent() {
  const { currentUser, logout } = useAuth()
  const isLoggedIn = !!currentUser

  useEffect(() => {
    localStorage.setItem('cetka-auth', String(isLoggedIn))
  }, [isLoggedIn])

  return (
    <Routes>
      <Route
        path="/giris"
        element={<Login isLoggedIn={isLoggedIn} />}
      />
      <Route
        element={
          <ProtectedLayout onLogout={logout} />
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="hasta-kayit" element={<Patients />} />
        <Route path="hasta-kayit/yeni" element={<NewPatient />} />
        <Route path="hasta-kayit/protokol/:patientId" element={<Protocol />} />
        <Route path="hasta-kayit/protokol/:patientId/yeni" element={<NewProtocol />} />
        <Route path="hasta-kayit/protokol/:patientId/:protocolId" element={<ProtocolDetail />} />
        <Route path="laboratuvar" element={<Lab />} />
        <Route path="laboratuvar/laboratuvar" element={<Laboratory />} />
        <Route path="laboratuvar/hizli-onay" element={<QuickApproval />} />
        <Route path="laboratuvar/dis-lab-gonderim" element={<ExternalLabSend />} />
        <Route path="laboratuvar/dis-lab-gonderim/yeni" element={<ExternalLabSendNew />} />
        <Route path="laboratuvar/dis-lab-izlem" element={<ExternalLabTrack />} />
        <Route path="laboratuvar/nred-nedenleri" element={<NredReasons />} />
        <Route path="muhasebe" element={<Navigate to="/muhasebe/kasa-raporu" replace />} />
        <Route path="muhasebe/kasa-raporu" element={<Accounting />} />
        <Route path="muhasebe/transfer" element={<CashTransfer />} />
        <Route path="muhasebe/hareketler" element={<CashMovements />} />
        <Route path="muhasebe/borclular" element={<Debtors />} />
        <Route path="muhasebe/fatura-icmal" element={<InvoiceSummary />} />
        <Route path="istatistikler" element={<Stats />} />
        <Route path="ayarlar" element={<Settings />} />
        <Route path="ayarlar/sms" element={<SmsSettings />} />
        <Route path="ayarlar/barkod" element={<BarcodeSettings />} />
        <Route path="ayarlar/goz-muayenesi-sablonlari" element={<EyeExamTemplates />} />
        <Route path="ayarlar/doktorlar" element={<Doctors />} />
        <Route path="ayarlar/hizmet-tup-tipleri" element={<ServiceTubeTypes />} />
        <Route path="ayarlar/hizmetler" element={<ServiceDefinitions />} />
        <Route path="ayarlar/paketler" element={<PackageDefinitions />} />
        <Route path="ayarlar/paketler/yeni" element={<NewPackage />} />
        <Route path="ayarlar/paketler/duzenle/:packageId" element={<NewPackage />} />
        <Route path="ayarlar/firmalar" element={<Companies />} />
        <Route path="ayarlar/firmalar/yeni" element={<NewCompany />} />
        <Route path="ayarlar/firmalar/duzenle/:companyId" element={<NewCompany />} />
        <Route path="ayarlar/osgb" element={<OSGBDefinitions />} />
        <Route path="ayarlar/muayene-turleri" element={<ExamTypeDefinitions />} />
        <Route path="ayarlar/dis-laboratuvarlar" element={<ExternalLabs />} />
        <Route path="ayarlar/kasalar" element={<CashDefinitions />} />
        <Route path="ayarlar/web-sonuc-kullanicilari" element={<WebResultUsers />} />
        <Route path="ayarlar/ek2-rapor-tanimlari" element={<Ek2ReportDefinitions />} />
        <Route path="ayarlar/kullanicilar" element={<Users />} />
      </Route>
      <Route
        path="*"
        element={
          isLoggedIn ? (
            <Layout onLogout={logout}>
              <NotFoundPage />
            </Layout>
          ) : (
            <Navigate to="/giris" replace />
          )
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
