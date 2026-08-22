import { createContext, useContext, useState } from 'react'
import { ConfirmModal } from '../components/ui/ConfirmModal'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, isOpen: true, resolve })
    })
  }

  const handleClose = () => {
    state?.resolve(false)
    setState(null)
  }

  const handleConfirm = () => {
    state?.resolve(true)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <ConfirmModal
          isOpen={state.isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={state.title}
          message={state.message}
          confirmText={state.confirmText}
          cancelText={state.cancelText}
          confirmVariant={state.confirmVariant}
        />
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}
