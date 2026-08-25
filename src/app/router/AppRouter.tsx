import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/app/layout/AppLayout'
import { ProtectedLayout } from '@/app/router/ProtectedLayout'
import { RouteFallback } from '@/app/router/RouteFallback'
import { Login } from '@/pages/auth/Login'
import { NotFoundPage } from '@/shared/components/ui/EmptyState'
import { useAuth } from '@/state/AuthContext'

const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })))
const Patients = lazy(() => import('@/pages/patients/Patients').then((m) => ({ default: m.Patients })))
const NewPatient = lazy(() => import('@/pages/patients/NewPatient').then((m) => ({ default: m.NewPatient })))
const Protocol = lazy(() => import('@/pages/protocols/Protocol').then((m) => ({ default: m.Protocol })))
const NewProtocol = lazy(() => import('@/pages/protocols/NewProtocol').then((m) => ({ default: m.NewProtocol })))
const ProtocolDetail = lazy(() => import('@/pages/protocols/ProtocolDetail').then((m) => ({ default: m.ProtocolDetail })))
const Lab = lazy(() => import('@/pages/lab/Lab').then((m) => ({ default: m.Lab })))
const Laboratory = lazy(() => import('@/pages/lab/Laboratory').then((m) => ({ default: m.Laboratory })))
const QuickApproval = lazy(() => import('@/pages/lab/QuickApproval').then((m) => ({ default: m.QuickApproval })))
const ExternalLabSend = lazy(() => import('@/pages/external-labs/ExternalLabSend').then((m) => ({ default: m.ExternalLabSend })))
const ExternalLabSendNew = lazy(() => import('@/pages/external-labs/ExternalLabSendNew').then((m) => ({ default: m.ExternalLabSendNew })))
const ExternalLabTrack = lazy(() => import('@/pages/external-labs/ExternalLabTrack').then((m) => ({ default: m.ExternalLabTrack })))
const NredReasons = lazy(() => import('@/pages/lab/NredReasons').then((m) => ({ default: m.NredReasons })))
const Accounting = lazy(() => import('@/pages/accounting/Accounting').then((m) => ({ default: m.Accounting })))
const CashTransfer = lazy(() => import('@/pages/cash/CashTransfer').then((m) => ({ default: m.CashTransfer })))
const CashMovements = lazy(() => import('@/pages/cash/CashMovements').then((m) => ({ default: m.CashMovements })))
const Debtors = lazy(() => import('@/pages/debtors/Debtors').then((m) => ({ default: m.Debtors })))
const InvoiceSummary = lazy(() => import('@/pages/accounting/InvoiceSummary').then((m) => ({ default: m.InvoiceSummary })))
const Stats = lazy(() => import('@/pages/stats/Stats').then((m) => ({ default: m.Stats })))
const Settings = lazy(() => import('@/pages/settings/Settings').then((m) => ({ default: m.Settings })))
const SmsSettings = lazy(() => import('@/pages/settings/SmsSettings').then((m) => ({ default: m.SmsSettings })))
const BarcodeSettings = lazy(() => import('@/pages/settings/BarcodeSettings').then((m) => ({ default: m.BarcodeSettings })))
const EyeExamTemplates = lazy(() => import('@/pages/settings/EyeExamTemplates').then((m) => ({ default: m.EyeExamTemplates })))
const Doctors = lazy(() => import('@/pages/doctors/Doctors').then((m) => ({ default: m.Doctors })))
const ServiceTubeTypes = lazy(() => import('@/pages/settings/ServiceTubeTypes').then((m) => ({ default: m.ServiceTubeTypes })))
const ServiceDefinitions = lazy(() => import('@/pages/services/ServiceDefinitions').then((m) => ({ default: m.ServiceDefinitions })))
const PackageDefinitions = lazy(() => import('@/pages/packages/PackageDefinitions').then((m) => ({ default: m.PackageDefinitions })))
const NewPackage = lazy(() => import('@/pages/packages/NewPackage').then((m) => ({ default: m.NewPackage })))
const Companies = lazy(() => import('@/pages/companies/Companies').then((m) => ({ default: m.Companies })))
const NewCompany = lazy(() => import('@/pages/companies/NewCompany').then((m) => ({ default: m.NewCompany })))
const OSGBDefinitions = lazy(() => import('@/pages/settings/OSGBDefinitions').then((m) => ({ default: m.OSGBDefinitions })))
const ExamTypeDefinitions = lazy(() => import('@/pages/exam-types/ExamTypeDefinitions').then((m) => ({ default: m.ExamTypeDefinitions })))
const ExternalLabs = lazy(() => import('@/pages/external-labs/ExternalLabs').then((m) => ({ default: m.ExternalLabs })))
const CashDefinitions = lazy(() => import('@/pages/cash/CashDefinitions').then((m) => ({ default: m.CashDefinitions })))
const WebResultUsers = lazy(() => import('@/pages/settings/WebResultUsers').then((m) => ({ default: m.WebResultUsers })))
const Ek2ReportDefinitions = lazy(() => import('@/pages/settings/Ek2ReportDefinitions').then((m) => ({ default: m.Ek2ReportDefinitions })))
const Users = lazy(() => import('@/pages/users/Users').then((m) => ({ default: m.Users })))
const PublicResult = lazy(() => import('@/pages/results/PublicResult').then((m) => ({ default: m.PublicResult })))

function UnknownRoute() {
  const { currentUser, logout } = useAuth()
  return currentUser ? <AppLayout onLogout={logout}><NotFoundPage /></AppLayout> : <Navigate to="/giris" replace />
}

export function AppRouter() {
  const { currentUser } = useAuth()
  const isLoggedIn = Boolean(currentUser)

  useEffect(() => localStorage.setItem('cetka-auth', String(isLoggedIn)), [isLoggedIn])

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/giris" element={<Login isLoggedIn={isLoggedIn} />} />
        <Route path="/sonuc/:protocolNo" element={<PublicResult />} />
        <Route element={<ProtectedLayout />}>
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
        <Route path="*" element={<UnknownRoute />} />
      </Routes>
    </Suspense>
  )
}
