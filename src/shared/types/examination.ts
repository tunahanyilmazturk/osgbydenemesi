export interface AudiometryData {
  includeBone: boolean
  right: { air: Record<string, number | null>; bone: Record<string, number | null> }
  left: { air: Record<string, number | null>; bone: Record<string, number | null> }
  resultText: string
}

export interface EyeExaminationData {
  examinationMode?: 'otorefraktometre' | 'eshel'
  rightEye: EyeMeasurement
  leftEye: EyeMeasurement
  colorBlindness: FindingState
  needsGlasses: FindingState
  nightBlindness: FindingState
  screenUsage: 'Çalışabilir' | 'Çalışamaz' | 'İşaretsiz'
  highAltitude: FindingState
  extraFindings?: Array<{ id: string; label: string; value: string; values?: string[] }>
  evaluation: string
  diagnosis: string
  conclusion: string
  resultStatus: 'Sonuç Normal' | 'Sonuç Anormal' | 'Sonuç Değerlendirme'
  resultText: string
}

export interface TetanusVaccinationData {
  version: 1
  applicationDate: string
  vaccineName: string
  dose: string
  doseNumber: '1. Doz' | '2. Doz' | '3. Doz' | 'Rapel' | 'Diğer'
  administrationRoute: 'İntramüsküler (IM)' | 'Subkutan (SC)' | 'Diğer'
  applicationSite: string
  manufacturer: string
  lotNumber: string
  expiryDate: string
  nextDoseDate: string
  administeredBy: string
  observation: string
  adverseReaction: string
  notes: string
  updatedAt: string
}

export interface Ek2WorkHistory {
  id: string
  workplace: string
  sector: string
  job: string
  startDate: string
  endDate: string
}

export interface Ek2MedicalAnswer {
  answer: 'Evet' | 'Hayır' | ''
  note: string
}

export interface Ek2Data {
  version: 1
  reportDate: string
  examinationReason: 'İşe Giriş' | 'Periyodik' | 'İş Değişikliği' | 'İşe Dönüş' | 'Diğer'
  workplace: {
    title: string
    sgkNumber: string
    address: string
    phone: string
    fax: string
    email: string
  }
  employee: {
    fullName: string
    tc: string
    birthPlace: string
    birthDate: string
    gender: string
    education: string
    maritalStatus: string
    childCount: string
    address: string
    phone: string
    email: string
    occupation: string
    jobDescription: string
    department: string
  }
  workHistory: Ek2WorkHistory[]
  personalHistory: string
  bloodGroup: string
  chronicDiseases: string
  immunization: { tetanus: string; hepatitis: string; other: string }
  familyHistory: { mother: string; father: string; sibling: string; child: string }
  medicalAnswers: Record<string, Ek2MedicalAnswer>
  narrativeAnswers: Record<string, string>
  smoking: { status: string; startDate: string; endDate: string; dailyAmount: string }
  alcohol: { status: string; startDate: string; endDate: string; frequency: string }
  physicalExamination: Record<string, string>
  measurements: { bloodPressure: string; pulse: string; height: string; weight: string; bmi: string }
  laboratoryFindings: Record<string, string>
  automaticValues?: {
    laboratoryFindings: Record<string, string>
    bloodGroup: string
    tetanus: string
    syncedAt: string
  }
  opinion: string
  conditions: string
  resultText: string
  conclusion: 'Çalışmaya Uygundur' | 'Şartlı Uygundur' | 'Çalışmaya Uygun Değildir' | 'Değerlendirme Bekliyor'
  doctorId: string
  doctorName: string
  doctorStamp?: string
  status: 'Taslak' | 'Tamamlandı'
  updatedAt: string
}

interface EyeMeasurement {
  sph: string
  cyl: string
  ax: string
  visualAcuity: string
  visualAcuityWithGlasses: string
  eyePressure: string
}

type FindingState = 'Yoktur' | 'Vardır' | 'İşaretsiz'
