import { createContext, useContext, useEffect, useState } from 'react'
import { defaultWebResultUsers } from './mocks/webResultUsersMock'
import type { WebResultUser } from '../types'
import { nowLocalDateTime } from '../utils/date'
import { loadFromStorage, saveToStorage } from '../utils/storage'

interface WebResultUsersContextType {
  users: WebResultUser[]
  addUser: (user: Omit<WebResultUser, 'id' | 'createdAt' | 'accessLog'>) => number
  updateUser: (id: number, updates: Partial<WebResultUser>) => void
  removeUser: (id: number) => void
  toggleStatus: (id: number) => void
  recordLogin: (id: number, ip: string, device: string, protocolIds: number[]) => void
}

const WebResultUsersContext = createContext<WebResultUsersContextType | null>(null)

const STORAGE_KEY = 'cetka-web-result-users'

export function WebResultUsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<WebResultUser[]>(() =>
    loadFromStorage(STORAGE_KEY, defaultWebResultUsers)
  )

  useEffect(() => {
    saveToStorage(STORAGE_KEY, users)
  }, [users])

  const addUser = (user: Omit<WebResultUser, 'id' | 'createdAt' | 'accessLog'>) => {
    const id = Date.now()
    const newUser: WebResultUser = {
      ...user,
      id,
      createdAt: nowLocalDateTime(),
      accessLog: [],
    }
    setUsers((prev) => [newUser, ...prev])
    return id
  }

  const updateUser = (id: number, updates: Partial<WebResultUser>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    )
  }

  const removeUser = (id: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const toggleStatus = (id: number) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u
        const nextStatus = u.status === 'Aktif' ? 'Pasif' : 'Aktif'
        return { ...u, status: nextStatus }
      })
    )
  }

  const recordLogin = (id: number, ip: string, device: string, protocolIds: number[]) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u
        const logId = Date.now()
        return {
          ...u,
          lastLoginAt: nowLocalDateTime(),
          accessLog: [
            { id: logId, userId: id, loginAt: nowLocalDateTime(), ip, device, viewedProtocols: protocolIds },
            ...u.accessLog,
          ].slice(0, 50),
        }
      })
    )
  }

  return (
    <WebResultUsersContext.Provider value={{ users, addUser, updateUser, removeUser, toggleStatus, recordLogin }}>
      {children}
    </WebResultUsersContext.Provider>
  )
}

export function useWebResultUsers() {
  const context = useContext(WebResultUsersContext)
  if (!context) {
    throw new Error('useWebResultUsers must be used within a WebResultUsersProvider')
  }
  return context
}
