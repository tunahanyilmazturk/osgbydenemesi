import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useProtocols } from '@/state/ProtocolsContext'
import type { ProtocolService } from '@/shared/types'

export type NotificationType = 'pending_result' | 'pending_approval' | 'pending_sample' | 'info'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  protocolId?: number
  serviceId?: number
  createdAt: string
  read: boolean
}

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

const READ_KEY = 'cetka-notifications-read'

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {
    // ignore
  }
  return new Set()
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

/** Protokol hizmetlerinden bildirimleri türet */
function deriveNotifications(
  protocols: { id: number; protocolNo: string; patientName: string; services: ProtocolService[] }[],
  readIds: Set<string>,
): AppNotification[] {
  const notifications: AppNotification[] = []

  for (const protocol of protocols) {
    for (const service of protocol.services) {
      // Sonuç girilmemiş (Sonuç Bekleniyor)
      if (service.status === 'Sonuç Bekleniyor') {
        const id = `pending-result-${service.id}`
        notifications.push({
          id,
          type: 'pending_result',
          title: 'Sonuç Bekleniyor',
          message: `${protocol.patientName} — ${service.name} (${protocol.protocolNo})`,
          protocolId: protocol.id,
          serviceId: service.id,
          createdAt: service.processDate,
          read: readIds.has(id),
        })
      }
      // Sonuç girilmiş ama onay bekliyor (Sonuç Girildi)
      if (service.status === 'Sonuç Girildi') {
        const id = `pending-approval-${service.id}`
        notifications.push({
          id,
          type: 'pending_approval',
          title: 'Onay Bekliyor',
          message: `${protocol.patientName} — ${service.name} (${protocol.protocolNo})`,
          protocolId: protocol.id,
          serviceId: service.id,
          createdAt: service.processDate,
          read: readIds.has(id),
        })
      }
      // Numune bekliyor
      if (service.status === 'İşlem Bekliyor' || service.status === 'Barkod Verildi') {
        const id = `pending-sample-${service.id}`
        notifications.push({
          id,
          type: 'pending_sample',
          title: 'İşlem Bekliyor',
          message: `${protocol.patientName} — ${service.name} (${protocol.protocolNo})`,
          protocolId: protocol.id,
          serviceId: service.id,
          createdAt: service.processDate,
          read: readIds.has(id),
        })
      }
    }
  }

  // En yeniden eskiye sırala
  return notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { protocols } = useProtocols()
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds)

  // Protokol verilerinden hasta adlarını çıkar
  const protocolsWithPatientName = useMemo(() => {
    // ProtocolsContext'te hasta adı doğrudan yok, protocol.company var
    // Patient bilgisiniPatientsContext'ten almak gerekir ama burada sadece service bazlı bildirim yapıyoruz
    return protocols.map((p) => ({
      id: p.id,
      protocolNo: p.protocolNo,
      patientName: p.company, // Firma adını kullan (hasta adı protocol'de yok)
      services: p.services,
    }))
  }, [protocols])

  const notifications = useMemo(
    () => deriveNotifications(protocolsWithPatientName, readIds),
    [protocolsWithPatientName, readIds],
  )

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }, [])

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev)
      notifications.forEach((n) => next.add(n.id))
      saveReadIds(next)
      return next
    })
  }, [notifications])

  const clearAll = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev)
      notifications.forEach((n) => next.add(n.id))
      saveReadIds(next)
      return next
    })
  }, [notifications])

  const removeNotification = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }, [])

  // Read IDs'i periyodik olarak kaydet
  useEffect(() => {
    saveReadIds(readIds)
  }, [readIds])

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll, removeNotification }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
