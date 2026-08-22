import { createContext, useContext, useEffect, useState } from 'react'

export interface CashAccount {
  id: number
  name: string
  active: boolean
}

export interface CashTransferRecord {
  id: number
  date: string
  from: string
  to: string
  amount: number
  description: string
  recordedBy: string
}

interface CashContextType {
  cashAccounts: CashAccount[]
  addCashAccount: (account: Omit<CashAccount, 'id'>) => number
  updateCashAccount: (id: number, updates: Partial<Omit<CashAccount, 'id'>>) => void
  removeCashAccount: (id: number) => void
  toggleCashAccountActive: (id: number) => void
  transfers: CashTransferRecord[]
  addTransfer: (transfer: Omit<CashTransferRecord, 'id' | 'recordedBy'>) => void
  removeTransfer: (id: number) => void
}

const ACCOUNTS_KEY = 'cetka-cash-accounts'
const TRANSFERS_KEY = 'cetka-cash-transfers'

const defaultCashAccounts: CashAccount[] = [
  { id: 1, name: 'MERKEZ KASA', active: true },
  { id: 2, name: 'BANKO-1', active: true },
  { id: 3, name: 'BANKO-2', active: true },
]

function loadInitialAccounts(): CashAccount[] {
  try {
    const stored = localStorage.getItem(ACCOUNTS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as CashAccount[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  return defaultCashAccounts
}

function loadInitialTransfers(): CashTransferRecord[] {
  try {
    const stored = localStorage.getItem(TRANSFERS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as CashTransferRecord[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return []
}

let accountIdSeq = defaultCashAccounts.length
let transferIdSeq = 0

const CashContext = createContext<CashContextType | null>(null)

export function CashProvider({ children }: { children: React.ReactNode }) {
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>(loadInitialAccounts)
  const [transfers, setTransfers] = useState<CashTransferRecord[]>(loadInitialTransfers)

  useEffect(() => {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(cashAccounts))
  }, [cashAccounts])

  useEffect(() => {
    localStorage.setItem(TRANSFERS_KEY, JSON.stringify(transfers))
  }, [transfers])

  useEffect(() => {
    const maxAccountId = cashAccounts.reduce((max, a) => Math.max(max, a.id), 0)
    const maxTransferId = transfers.reduce((max, t) => Math.max(max, t.id), 0)
    accountIdSeq = Math.max(accountIdSeq, maxAccountId)
    transferIdSeq = Math.max(transferIdSeq, maxTransferId)
  }, [cashAccounts, transfers])

  const addCashAccount = (account: Omit<CashAccount, 'id'>) => {
    const id = ++accountIdSeq + Date.now()
    setCashAccounts((prev) => [...prev, { ...account, id }])
    return id
  }

  const updateCashAccount = (id: number, updates: Partial<Omit<CashAccount, 'id'>>) => {
    setCashAccounts((prev) => {
      const account = prev.find((a) => a.id === id)
      if (!account) return prev
      const newName = updates.name ?? account.name
      if (newName !== account.name) {
        setTransfers((tPrev) =>
          tPrev.map((t) => ({
            ...t,
            from: t.from === account.name ? newName : t.from,
            to: t.to === account.name ? newName : t.to,
          }))
        )
      }
      return prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    })
  }

  const removeCashAccount = (id: number) => {
    setCashAccounts((prev) => prev.filter((a) => a.id !== id))
  }

  const toggleCashAccountActive = (id: number) => {
    setCashAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)))
  }

  const addTransfer = (transfer: Omit<CashTransferRecord, 'id' | 'recordedBy'>) => {
    const id = ++transferIdSeq + Date.now()
    const newTransfer: CashTransferRecord = { ...transfer, id, recordedBy: 'Kullanıcı' }
    setTransfers((prev) => [newTransfer, ...prev])
  }

  const removeTransfer = (id: number) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <CashContext.Provider
      value={{
        cashAccounts,
        addCashAccount,
        updateCashAccount,
        removeCashAccount,
        toggleCashAccountActive,
        transfers,
        addTransfer,
        removeTransfer,
      }}
    >
      {children}
    </CashContext.Provider>
  )
}

export function useCash() {
  const context = useContext(CashContext)
  if (!context) {
    throw new Error('useCash must be used within a CashProvider')
  }
  return context
}
