import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AppLayout } from '@/app/layout/AppLayout'
import { useAuth } from '@/state/AuthContext'

export function ProtectedLayout() {
  const { currentUser, hasPageAccess, getLandingPath, logout } = useAuth()
  const location = useLocation()

  if (!currentUser) return <Navigate to="/giris" replace />

  if (!hasPageAccess(location.pathname)) return <Navigate to={getLandingPath()} replace />

  return (
    <AppLayout onLogout={logout}>
      <Outlet />
    </AppLayout>
  )
}
