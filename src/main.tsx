import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CompaniesProvider } from './context/CompaniesContext'
import { PatientsProvider } from './context/PatientsContext'
import { ProtocolsProvider } from './context/ProtocolsContext'
import { ServicesProvider } from './context/ServicesContext'
import { ToastProvider } from './context/ToastContext'
import { CashProvider } from './context/CashContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { ExamTypesProvider } from './context/ExamTypesContext'
import { NotificationProvider } from './context/NotificationContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <ExamTypesProvider>
          <CashProvider>
            <PatientsProvider>
              <CompaniesProvider>
                <ServicesProvider>
                  <ProtocolsProvider>
                    <NotificationProvider>
                      <App />
                    </NotificationProvider>
                  </ProtocolsProvider>
                </ServicesProvider>
              </CompaniesProvider>
            </PatientsProvider>
          </CashProvider>
        </ExamTypesProvider>
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
)
