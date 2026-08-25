export interface Patient {
  id: number
  name: string
  company: string
  type: string
  status: string
  time: string
  createdAt: string
}

export interface PatientDetail extends Patient {
  tc: string
  phone: string
  email: string
  birthDate: string
  gender: string
  address: string
  firstName?: string
  lastName?: string
  fatherName?: string
  motherName?: string
  registrationNo?: string
  passportNo?: string
  homePhone?: string
  notes?: string
  photo?: string
}
