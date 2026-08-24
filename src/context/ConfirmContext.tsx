import { createContext, useContext, useState } from 'react'
import { ConfirmModal } from '../components/ui/ConfirmModal'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary'
  /** Bu key için "tekrar sorma" seçildiyse otomatik true döner */
  skipKey?: string
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  resetSkipConfirm: () => void
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)
  const [skipSet, setSkipSet] = useState<Set<string>>(new Set())

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    // "Tekrar sorma" seçildiyse direkt onayla
    if (options.skipKey && skipSet.has(options.skipKey)) {
      return Promise.resolve(true)
    }
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

  const handleSkipConfirm = (key: string) => {
    setSkipSet((prev) => new Set([...prev, key]))
  }

  const resetSkipConfirm = () => {
    setSkipSet(new Set())
  }

  return (
    <ConfirmContext.Provider value={{ confirm, resetSkipConfirm }}>
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
          skipKey={state.skipKey}
          onSkipConfirm={handleSkipConfirm}
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

export function useResetSkipConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useResetSkipConfirm must be used within a ConfirmProvider')
  }
  return context.resetSkipConfirm
}
