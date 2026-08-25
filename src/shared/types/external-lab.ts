export interface ExternalLab {
  id: number
  active: boolean
  name: string
  institutionCode: string
  username: string
  webServiceAddress: string
  type: string
}

export interface ExternalLabSendService {
  serviceId: number
  protocolId: number
  patientName: string
  serviceName: string
  barcode: string
  protocolNo: string
}

export interface ExternalLabSendRecord {
  id: number
  sendDate: string
  externalLabId: number
  externalLabName: string
  patientCount: number
  serviceCount: number
  status: 'Gönderildi' | 'Hazırlanıyor' | 'İptal'
  sentBy: string
  services: ExternalLabSendService[]
}
