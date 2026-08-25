import type { PropsWithChildren } from 'react'
import { AuthProvider } from '@/state/AuthContext'
import { CashProvider } from '@/state/CashContext'
import { CompaniesProvider } from '@/state/CompaniesContext'
import { ConfirmProvider } from '@/state/ConfirmContext'
import { ExamTypesProvider } from '@/state/ExamTypesContext'
import { NotificationProvider } from '@/state/NotificationContext'
import { PatientsProvider } from '@/state/PatientsContext'
import { ProtocolsProvider } from '@/state/ProtocolsContext'
import { ServicesProvider } from '@/state/ServicesContext'
import { ToastProvider } from '@/state/ToastContext'
import { WebResultUsersProvider } from '@/state/WebResultUsersContext'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <ExamTypesProvider>
          <CashProvider>
            <PatientsProvider>
              <CompaniesProvider>
                <ServicesProvider>
                  <ProtocolsProvider>
                    <NotificationProvider>
                      <WebResultUsersProvider>
                        <AuthProvider>{children}</AuthProvider>
                      </WebResultUsersProvider>
                    </NotificationProvider>
                  </ProtocolsProvider>
                </ServicesProvider>
              </CompaniesProvider>
            </PatientsProvider>
          </CashProvider>
        </ExamTypesProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}
