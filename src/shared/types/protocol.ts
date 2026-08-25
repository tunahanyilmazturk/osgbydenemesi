export interface ProtocolService {
  id: number
  protocolId: number
  code: number
  status: string
  barcode: string
  processDate: string
  group: string
  name: string
  price: number
  vatRate: number
  totalPrice: number
  recordedBy: string
  result?: string
  resultText?: string
  oldResult?: string
  referenceRange?: string
  unit?: string
  lab?: string
  requestDate?: string
  acceptDate?: string
  approvedBy?: string
  approvedAt?: string
  audiometryData?: string
  eyeExaminationData?: string
  tetanusVaccinationData?: string
  ek2Data?: string
  pdfData?: string
  pdfName?: string
  pdfId?: string
  note?: string
  rejectionReason?: string
  rejectedBy?: string
  rejectedAt?: string
}

export interface ProtocolPayment {
  id: number
  protocolId: number
  paymentDate: string
  paymentType: string
  amount: number
  description: string
  recordedBy: string
}

export interface Protocol {
  id: number
  patientId: number
  protocolNo: string
  protocolDate: string
  status: string
  company: string
  examType: string
  department: string
  occupation: string
  description: string
  services: ProtocolService[]
  payments: ProtocolPayment[]
}
