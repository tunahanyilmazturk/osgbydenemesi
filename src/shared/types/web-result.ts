export type WebResultUserRole = 'firma_yetkilisi' | 'saglik_personeli' | 'admin'
export type WebResultUserStatus = 'Aktif' | 'Pasif' | 'Süresi Dolmuş'

export interface WebResultAccessLog {
  id: number
  userId: number
  loginAt: string
  ip: string
  device: string
  viewedProtocols: number[]
}

export interface WebResultUser {
  id: number
  username: string
  password: string
  fullName: string
  email: string
  phone: string
  role: WebResultUserRole
  status: WebResultUserStatus
  companyId?: number
  companyName?: string
  createdAt: string
  lastLoginAt?: string
  expiresAt?: string
  accessLog: WebResultAccessLog[]
  canViewAllProtocols: boolean
  canDownloadPdf: boolean
  canViewPatientDetails: boolean
  notes?: string
}
