import type { PatientDetail, Protocol } from '../types'

const INSTITUTION_KEY = 'cetka-institution'

interface InstitutionInfo {
  name?: string
  smsTitle?: string
  smsUsername?: string
  smsPassword?: string
  smsProvider?: string
  smsEnabled?: boolean
  smsTemplate?: string
  externalIp?: string
}

function loadInstitution(): InstitutionInfo {
  try {
    const raw = localStorage.getItem(INSTITUTION_KEY)
    if (raw) return JSON.parse(raw) as InstitutionInfo
  } catch {
    // ignore
  }
  return {}
}

export interface SmsMessage {
  to: string
  patientName: string
  patientPhone: string
  protocolNo: string
  companyName: string
  message: string
  pdfUrl: string
  sender: string
}

export interface SmsLogEntry {
  id: string
  date: string
  patientName: string
  patientPhone: string
  protocolNo: string
  companyName: string
  message: string
  status: 'pending' | 'sent' | 'failed'
  error?: string
}

const SMS_LOG_KEY = 'cetka-sms-log'

export function loadSmsLog(): SmsLogEntry[] {
  try {
    const raw = localStorage.getItem(SMS_LOG_KEY)
    if (raw) return JSON.parse(raw) as SmsLogEntry[]
  } catch {
    // ignore
  }
  return []
}

export function saveSmsLog(log: SmsLogEntry[]) {
  localStorage.setItem(SMS_LOG_KEY, JSON.stringify(log.slice(0, 200)))
}

export function addSmsLogEntry(entry: Omit<SmsLogEntry, 'id'>) {
  const log = loadSmsLog()
  const newEntry: SmsLogEntry = { ...entry, id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
  saveSmsLog([newEntry, ...log])
  return newEntry
}

const DEFAULT_TEMPLATE =
  'Sayin {hastaAd}, {kurumAd} tarafindan yapilan {protokolNo} numarali protokolunuzun tum tetkik sonuclari hazirdir. Raporunuzu asagidaki baglantidan PDF olarak goruntuleyebilirsiniz: {pdfLink}'

/**
 * Şablonu değişkenlerle doldur
 */
function fillTemplate(
  template: string,
  vars: { hastaAd: string; protokolNo: string; kurumAd: string; firmaAd: string; pdfLink: string },
): string {
  return template
    .replace(/\{hastaAd\}/g, vars.hastaAd)
    .replace(/\{protokolNo\}/g, vars.protokolNo)
    .replace(/\{kurumAd\}/g, vars.kurumAd)
    .replace(/\{firmaAd\}/g, vars.firmaAd)
    .replace(/\{pdfLink\}/g, vars.pdfLink)
}

/**
 * Hasta için SMS mesajı oluştur
 */
export function buildSmsMessage(
  patient: PatientDetail,
  protocol: Protocol,
  companyName: string,
): SmsMessage | null {
  const institution = loadInstitution()
  const sender = institution.smsTitle || institution.name || 'OSGB'

  // Hasta telefonu yoksa SMS gönderilemez
  const phone = patient.phone?.trim()
  if (!phone) return null

  // Telefonu uluslararası formata çevir (90XXXXXXXXXX)
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) return null

  // PDF link — web sonuç sayfası
  const baseUrl = institution.externalIp || window.location.origin
  const pdfUrl = `${baseUrl}/sonuc/${protocol.protocolNo}`

  // Şablonu doldur
  const template = institution.smsTemplate || DEFAULT_TEMPLATE
  const message = fillTemplate(template, {
    hastaAd: patient.name,
    protokolNo: protocol.protocolNo,
    kurumAd: sender,
    firmaAd: companyName,
    pdfLink: pdfUrl,
  })

  return {
    to: normalizedPhone,
    patientName: patient.name,
    patientPhone: phone,
    protocolNo: protocol.protocolNo,
    companyName,
    message,
    pdfUrl,
    sender,
  }
}

/**
 * Telefon numarasını 90XXXXXXXXXX formatına çevir
 */
function normalizePhone(phone: string): string | null {
  let p = phone.replace(/[\s\-()]/g, '')
  p = p.replace(/[^0-9+]/g, '')

  if (p.startsWith('+90')) {
    p = p.slice(1)
  } else if (p.startsWith('90')) {
    // already 90...
  } else if (p.startsWith('0')) {
    p = '90' + p.slice(1)
  } else if (p.startsWith('5') && p.length === 10) {
    p = '90' + p
  } else if (p.length === 10) {
    p = '90' + p
  } else {
    return null
  }

  if (p.length !== 12) return null
  return p
}

/**
 * NetGSM API ile SMS gönder
 */
async function sendViaNetGsm(
  username: string,
  password: string,
  header: string,
  to: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `https://api.netgsm.com.tr/sms/send/get/?usercode=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&msgheader=${encodeURIComponent(header)}&gsmno=${encodeURIComponent(to)}&message=${encodeURIComponent(message)}&dil=TR`
    const response = await fetch(url, { method: 'GET' })
    const text = await response.text()

    // NetGSM yanıt kodları:
    // 00 = başarılı, diğerleri hata
    if (text.startsWith('00')) {
      return { ok: true }
    }
    const errorCodes: Record<string, string> = {
      '20': 'Mesaj metni çok uzun',
      '30': 'Geçersiz telefon numarası',
      '40': 'SMS başlığı onaylanmamış',
      '50': 'Hesap bakiyesi yetersiz',
      '60': 'Geçersiz kullanıcı adı/şifre',
      '70': 'Sorgu limiti aşıldı',
    }
    const code = text.slice(0, 2)
    return { ok: false, error: errorCodes[code] || `NetGSM hata kodu: ${text}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'NetGSM bağlantı hatası' }
  }
}

/**
 * Mutlucell API ile SMS gönder
 */
async function sendViaMutlucell(
  username: string,
  password: string,
  header: string,
  to: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.mutlucell.com/postv2.aspx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username,
        password,
        origin: header,
        gsm: to,
        msg: message,
      }),
    })
    const text = await response.text()
    // Mutlucell başarılı yanıt: "ID;..." formatında
    if (text.startsWith('ID;') || /^\d+/.test(text)) {
      return { ok: true }
    }
    return { ok: false, error: `Mutlucell: ${text.slice(0, 50)}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Mutlucell bağlantı hatası' }
  }
}

/**
 * İletimerkezi API ile SMS gönder
 */
async function sendViaIletimerkezi(
  username: string,
  password: string,
  header: string,
  to: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.iletimerkezi.com/v1/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request: {
          authentication: { username, password },
          order: {
            sender: header,
            message: { text: message, recipients: { gsm: [to] } },
          },
        },
      }),
    })
    const data = await response.json()
    if (data.response?.status?.code === '200') {
      return { ok: true }
    }
    return { ok: false, error: data.response?.status?.message || 'İletimerkezi hatası' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'İletimerkezi bağlantı hatası' }
  }
}

/**
 * SMS'i gönder — sağlayıcıya göre yönlendir
 */
export async function sendSms(message: SmsMessage): Promise<{ ok: boolean; error?: string }> {
  const institution = loadInstitution()
  const provider = institution.smsProvider || 'none'
  const enabled = institution.smsEnabled !== false // varsayılan: aktif

  // Sağlayıcı yok veya devre dışıysa sadece log'a kaydet
  if (provider === 'none' || !enabled || !institution.smsUsername || !institution.smsPassword) {
    addSmsLogEntry({
      date: new Date().toISOString(),
      patientName: message.patientName,
      patientPhone: message.patientPhone,
      protocolNo: message.protocolNo,
      companyName: message.companyName,
      message: message.message,
      status: 'sent',
      error: provider === 'none' ? 'Log modu (sağlayıcı yok)' : undefined,
    })
    return { ok: true }
  }

  let result: { ok: boolean; error?: string }

  switch (provider) {
    case 'netgsm':
      result = await sendViaNetGsm(institution.smsUsername, institution.smsPassword, message.sender, message.to, message.message)
      break
    case 'mutlucell':
      result = await sendViaMutlucell(institution.smsUsername, institution.smsPassword, message.sender, message.to, message.message)
      break
    case 'iletimerkezi':
      result = await sendViaIletimerkezi(institution.smsUsername, institution.smsPassword, message.sender, message.to, message.message)
      break
    default:
      result = { ok: false, error: 'Bilinmeyen SMS sağlayıcı' }
  }

  // Log'a kaydet
  addSmsLogEntry({
    date: new Date().toISOString(),
    patientName: message.patientName,
    patientPhone: message.patientPhone,
    protocolNo: message.protocolNo,
    companyName: message.companyName,
    message: message.message,
    status: result.ok ? 'sent' : 'failed',
    error: result.error,
  })

  return result
}

/**
 * Test SMS gönder — Ayarlar sayfasından
 */
export async function sendTestSms(
  phone: string,
  template: string,
): Promise<{ ok: boolean; error?: string }> {
  const institution = loadInstitution()
  const sender = institution.smsTitle || institution.name || 'OSGB'

  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) {
    return { ok: false, error: 'Geçersiz telefon numarası' }
  }

  const message = fillTemplate(template || DEFAULT_TEMPLATE, {
    hastaAd: 'Test Hasta',
    protokolNo: 'TEST001',
    kurumAd: sender,
    firmaAd: 'Test Firma',
    pdfLink: 'https://sonuc.cetkaosgb.com/sonuc/TEST001',
  })

  const smsMsg: SmsMessage = {
    to: normalizedPhone,
    patientName: 'Test Hasta',
    patientPhone: phone,
    protocolNo: 'TEST001',
    companyName: 'Test Firma',
    message,
    pdfUrl: 'https://sonuc.cetkaosgb.com/sonuc/TEST001',
    sender,
  }

  return sendSms(smsMsg)
}
