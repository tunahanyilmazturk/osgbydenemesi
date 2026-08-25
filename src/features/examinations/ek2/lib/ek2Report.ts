import { loadEk2Settings } from '@/features/examinations/ek2/lib/ek2Settings'
import { loadDoctors } from '@/shared/lib/doctors'
import type { Ek2Data, PatientDetail, Protocol, ProtocolService } from '@/shared/types'

const INSTITUTION_STORAGE_KEY = 'cetka-institution'

interface InstitutionInfo {
  name?: string
  address?: string
  phone?: string
  officialEmail?: string
  logo?: string
  ministryLogo?: string
}

interface Ek2ReportInput {
  patient: PatientDetail
  protocol: Protocol
  service: ProtocolService
  data: Ek2Data
}

const COLORS = {
  blue: [37, 99, 235] as const,
  blueDark: [30, 64, 175] as const,
  dark: [30, 41, 59] as const,
  slate: [71, 85, 105] as const,
  gray: [100, 116, 139] as const,
  border: [203, 213, 225] as const,
  light: [248, 250, 252] as const,
  blueLight: [239, 246, 255] as const,
  green: [22, 101, 52] as const,
}

let cachedFonts: { regular: string; bold: string } | null = null

function loadInstitution(): InstitutionInfo {
  try {
    const raw = localStorage.getItem(INSTITUTION_STORAGE_KEY)
    return raw ? JSON.parse(raw) as InstitutionInfo : {}
  } catch {
    return {}
  }
}

async function loadFontBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(index, index + 0x8000)))
  }
  return btoa(binary)
}

async function ensureFonts(doc: import('jspdf').jsPDF) {
  if (!cachedFonts) {
    const [regular, bold] = await Promise.all([
      loadFontBase64('/fonts/Roboto-Regular.ttf'),
      loadFontBase64('/fonts/Roboto-Bold.ttf'),
    ])
    cachedFonts = { regular, bold }
  }
  doc.addFileToVFS('Roboto-Regular.ttf', cachedFonts.regular)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', cachedFonts.bold)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  doc.setFont('Roboto', 'normal')
}

function formatDate(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('tr-TR')
}

function valueOrDash(value?: string): string {
  return value?.trim() || '-'
}

function imageDimensions(source: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve({ width: 0, height: 0 })
    image.src = source
  })
}

function fitImage(width: number, height: number, maxWidth: number, maxHeight: number) {
  if (!width || !height) return { width: maxWidth, height: maxHeight }
  const ratio = Math.min(maxWidth / width, maxHeight / height)
  return { width: width * ratio, height: height * ratio }
}

async function addImageContained(doc: import('jspdf').jsPDF, source: string | undefined, x: number, y: number, width: number, height: number) {
  if (!source) return
  try {
    const dimensions = await imageDimensions(source)
    const fitted = fitImage(dimensions.width, dimensions.height, width, height)
    doc.addImage(source, 'PNG', x + (width - fitted.width) / 2, y + (height - fitted.height) / 2, fitted.width, fitted.height)
  } catch {
    // Hatalı veya desteklenmeyen görsel raporu engellemez.
  }
}

async function drawHeader(doc: import('jspdf').jsPDF, institution: InstitutionInfo, page: number, status: string) {
  const margin = 10
  const pageWidth = 210
  doc.setDrawColor(...COLORS.blue)
  doc.setLineWidth(0.7)
  doc.line(margin, 11, pageWidth - margin, 11)
  await addImageContained(doc, institution.logo, margin, 13, 34, 17)
  await addImageContained(doc, institution.ministryLogo, 180, 13, 20, 17)

  const textX = institution.logo ? 48 : margin
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(12.5)
  doc.setTextColor(...COLORS.dark)
  doc.text(institution.name || 'İŞ SAĞLIĞI VE GÜVENLİĞİ BİRİMİ', textX, 18)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(...COLORS.gray)
  const contact = [institution.address, institution.phone && `Tel: ${institution.phone}`, institution.officialEmail].filter(Boolean).join('  |  ')
  doc.text(doc.splitTextToSize(contact || 'İşyeri sağlık ve güvenlik hizmetleri', 120)[0], textX, 23)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(status === 'Tamamlandı' ? COLORS.green[0] : COLORS.gray[0], status === 'Tamamlandı' ? COLORS.green[1] : COLORS.gray[1], status === 'Tamamlandı' ? COLORS.green[2] : COLORS.gray[2])
  doc.text(status === 'Tamamlandı' ? 'TAMAMLANDI' : 'TASLAK', 177, 18, { align: 'right' })
  doc.setFont('Roboto', 'normal')
  doc.setTextColor(...COLORS.gray)
  doc.text(`Sayfa ${page} / 2`, 177, 23, { align: 'right' })
  doc.setDrawColor(...COLORS.blue)
  doc.line(margin, 32, pageWidth - margin, 32)
}

function drawFooter(doc: import('jspdf').jsPDF, page: number) {
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.2)
  doc.line(10, 279, 200, 279)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(5.6)
  doc.setTextColor(...COLORS.gray)
  doc.text('Bu rapor, 5070 sayılı Elektronik İmza Kanunu çerçevesinde elektronik ortamda onaylanmıştır.', 105, 283, { align: 'center' })
  doc.text('6331 sayılı İş Sağlığı ve Güvenliği Kanunu ile ilgili yönetmelik hükümleri uyarınca düzenlenmiştir.', 105, 286.3, { align: 'center' })
  doc.setFillColor(...COLORS.blue)
  doc.rect(0, 292, 210, 5, 'F')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(5.5)
  doc.setTextColor(255, 255, 255)
  doc.text(`EK-2 SAĞLIK RAPORU  •  ${page}/2`, 105, 295, { align: 'center' })
}

function sectionTitle(doc: import('jspdf').jsPDF, title: string, y: number) {
  doc.setFillColor(...COLORS.blueLight)
  doc.setDrawColor(191, 219, 254)
  doc.roundedRect(10, y, 190, 7, 1.5, 1.5, 'FD')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.blueDark)
  doc.text(title, 13, y + 4.7)
}

function keyValueGrid(doc: import('jspdf').jsPDF, rows: Array<{ label: string; value: string }>, y: number, columns = 3, rowHeight = 10): number {
  const width = 190 / columns
  const rowCount = Math.ceil(rows.length / columns)
  doc.setDrawColor(...COLORS.border)
  doc.setLineWidth(0.2)
  doc.roundedRect(10, y, 190, rowCount * rowHeight, 1.5, 1.5, 'S')
  rows.forEach((row, index) => {
    const column = index % columns
    const rowIndex = Math.floor(index / columns)
    const x = 10 + column * width
    const cellY = y + rowIndex * rowHeight
    if (column > 0) doc.line(x, cellY, x, cellY + rowHeight)
    if (rowIndex > 0) doc.line(x, cellY, x + width, cellY)
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(5.7)
    doc.setTextColor(...COLORS.gray)
    doc.text(row.label.toLocaleUpperCase('tr-TR'), x + 2, cellY + 3.2)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(7.4)
    doc.setTextColor(...COLORS.dark)
    const lines = doc.splitTextToSize(valueOrDash(row.value), width - 4)
    doc.text(lines.slice(0, 2), x + 2, cellY + 7)
  })
  return y + rowCount * rowHeight
}

function textCards(doc: import('jspdf').jsPDF, rows: Array<{ label: string; value: string }>, y: number, columns = 2, height = 16): number {
  const gap = 3
  const width = (190 - gap * (columns - 1)) / columns
  rows.forEach((row, index) => {
    const column = index % columns
    const rowIndex = Math.floor(index / columns)
    const x = 10 + column * (width + gap)
    const cardY = y + rowIndex * (height + 2)
    doc.setFillColor(...COLORS.light)
    doc.setDrawColor(...COLORS.border)
    doc.roundedRect(x, cardY, width, height, 1.5, 1.5, 'FD')
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(...COLORS.slate)
    doc.text(row.label, x + 2, cardY + 4)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(6.7)
    doc.setTextColor(...COLORS.dark)
    const lines = doc.splitTextToSize(valueOrDash(row.value), width - 4)
    doc.text(lines.slice(0, 3), x + 2, cardY + 8)
  })
  return y + Math.ceil(rows.length / columns) * (height + 2)
}

function answerLabel(answer?: { answer: string; note: string }) {
  if (!answer?.answer) return '-'
  return answer.note?.trim() ? `${answer.answer} - ${answer.note.trim()}` : answer.answer
}

function drawMedicalAnswers(doc: import('jspdf').jsPDF, data: Ek2Data, y: number): number {
  const labels: Array<[string, string]> = [
    ['productiveCough', 'Balgamlı öksürük'], ['shortnessOfBreath', 'Nefes darlığı'], ['chestPain', 'Göğüs ağrısı'],
    ['palpitation', 'Çarpıntı'], ['backPain', 'Sırt ağrısı'], ['bowelProblem', 'Bağırsak yakınması'], ['jointPain', 'Eklem ağrısı'],
    ['heartDisease', 'Kalp hastalığı'], ['diabetes', 'Şeker hastalığı'], ['kidneyDisease', 'Böbrek rahatsızlığı'],
    ['jaundice', 'Sarılık'], ['ulcer', 'Mide/duodenum ülseri'], ['hearingLoss', 'İşitme kaybı'], ['visualImpairment', 'Görme bozukluğu'],
    ['nervousSystemDisease', 'Sinir sistemi'], ['skinDisease', 'Deri hastalığı'], ['foodPoisoning', 'Besin zehirlenmesi'],
  ]
  const columnWidth = 92.5
  const rowHeight = 5.4
  labels.forEach(([key, label], index) => {
    const column = index >= 9 ? 1 : 0
    const row = index >= 9 ? index - 9 : index
    const x = 10 + column * 97.5
    const rowY = y + row * rowHeight
    doc.setFillColor(row % 2 === 0 ? 248 : 255, row % 2 === 0 ? 250 : 255, row % 2 === 0 ? 252 : 255)
    doc.setDrawColor(...COLORS.border)
    doc.rect(x, rowY, columnWidth, rowHeight, 'FD')
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(6.2)
    doc.setTextColor(...COLORS.slate)
    doc.text(label, x + 2, rowY + 3.6)
    doc.setFont('Roboto', 'bold')
    doc.setTextColor(...COLORS.dark)
    const value = answerLabel(data.medicalAnswers[key])
    doc.text(doc.splitTextToSize(value, 36)[0], x + columnWidth - 2, rowY + 3.6, { align: 'right' })
  })
  return y + 9 * rowHeight
}

function drawLabFindings(doc: import('jspdf').jsPDF, findings: Record<string, string>, y: number): number {
  const rows = [
    ['Kan Analizleri', findings.blood], ['İdrar Analizleri', findings.urine], ['Radyolojik Analizler', findings.radiology],
    ['Odyometri', findings.audiometry], ['Solunum Fonksiyon Testi', findings.sft], ['Göz Muayenesi', findings.eye],
    ['Psikolojik Testler', findings.psychological], ['Diğer Bulgular', findings.other],
  ].filter(([, value]) => value?.trim())
  return textCards(doc, rows.length ? rows.map(([label, value]) => ({ label, value })) : [{ label: 'Tetkik Bulguları', value: 'Sonuç aktarılmadı.' }], y, 2, 13)
}

export async function openEk2Pdf(report: Ek2ReportInput, returnBlob = false): Promise<Blob | void> {
  const previewWindow = returnBlob ? null : window.open('', '_blank')
  if (previewWindow) {
    previewWindow.document.title = 'EK-2 PDF hazırlanıyor'
    previewWindow.document.body.innerHTML = '<div style="font-family:Arial,sans-serif;padding:32px;color:#334155">EK-2 PDF hazırlanıyor...</div>'
  }
  const { patient, protocol, service, data } = report
  const institution = loadInstitution()
  const settings = loadEk2Settings()
  const selectedDoctor = loadDoctors().find((doctor) => doctor.id === data.doctorId)
  const doctorName = data.doctorName || (selectedDoctor ? `${selectedDoctor.title} ${selectedDoctor.name}`.trim() : 'Doktor seçilmedi')
  const doctorStamp = data.doctorStamp || selectedDoctor?.stamp
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  await ensureFonts(doc)

  await drawHeader(doc, institution, 1, data.status)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COLORS.dark)
  doc.text('EK-2 İŞE GİRİŞ / PERİYODİK MUAYENE FORMU', 105, 40, { align: 'center' })
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(...COLORS.gray)
  doc.text('Çalışanların Sağlık Gözetimine Yönelik İşyeri Hekimi Değerlendirme Raporu', 105, 44.5, { align: 'center' })

  sectionTitle(doc, 'RAPOR VE İŞYERİ BİLGİLERİ', 48)
  let y = keyValueGrid(doc, [
    { label: 'Rapor Tarihi', value: formatDate(data.reportDate) }, { label: 'Muayene Nedeni', value: data.examinationReason }, { label: 'Protokol / Barkod', value: `${protocol.protocolNo} / ${service.barcode || '-'}` },
    { label: 'İşyeri Unvanı', value: data.workplace.title }, { label: 'SGK Sicil No', value: data.workplace.sgkNumber }, { label: 'Telefon', value: data.workplace.phone },
    { label: 'Adres', value: data.workplace.address }, { label: 'E-posta', value: data.workplace.email }, { label: 'Faks', value: data.workplace.fax },
  ], 56, 3, 9)

  sectionTitle(doc, 'ÇALIŞANIN KİMLİK VE GÖREV BİLGİLERİ', y + 3)
  y = keyValueGrid(doc, [
    { label: 'Adı Soyadı', value: data.employee.fullName || patient.name }, { label: 'T.C. Kimlik No', value: data.employee.tc || patient.tc }, { label: 'Cinsiyet', value: data.employee.gender },
    { label: 'Doğum Yeri / Tarihi', value: `${valueOrDash(data.employee.birthPlace)} / ${formatDate(data.employee.birthDate)}` }, { label: 'Telefon', value: data.employee.phone }, { label: 'E-posta', value: data.employee.email },
    { label: 'Mesleği', value: data.employee.occupation }, { label: 'Çalıştığı Bölüm', value: data.employee.department }, { label: 'Yaptığı İş', value: data.employee.jobDescription },
    { label: 'Eğitim Durumu', value: data.employee.education }, { label: 'Medeni Durum / Çocuk', value: `${valueOrDash(data.employee.maritalStatus)} / ${valueOrDash(data.employee.childCount)}` }, { label: 'Adres', value: data.employee.address },
  ], y + 11, 3, 9)

  sectionTitle(doc, 'ÇALIŞMA ÖYKÜSÜ, ÖZGEÇMİŞ VE BAĞIŞIKLAMA', y + 3)
  const workHistory = data.workHistory.slice(0, 3).map((item, index) => ({
    label: `${index + 1}. İş Deneyimi`,
    value: [item.workplace, item.sector, item.job, [formatDate(item.startDate), formatDate(item.endDate)].join(' - ')].filter((value) => value && value !== '- - -').join(' / '),
  }))
  y = textCards(doc, [
    ...workHistory,
    { label: 'Kişisel Özgeçmiş', value: data.personalHistory },
    { label: 'Kronik Hastalıklar', value: data.chronicDiseases },
    { label: 'Kan Grubu', value: data.bloodGroup },
    { label: 'Bağışıklama', value: `Tetanoz: ${valueOrDash(data.immunization.tetanus)} | Hepatit: ${valueOrDash(data.immunization.hepatitis)} | Diğer: ${valueOrDash(data.immunization.other)}` },
    { label: 'Aile Öyküsü', value: `Anne: ${valueOrDash(data.familyHistory.mother)} | Baba: ${valueOrDash(data.familyHistory.father)} | Kardeş: ${valueOrDash(data.familyHistory.sibling)} | Çocuk: ${valueOrDash(data.familyHistory.child)}` },
  ], y + 11, 2, 15)

  sectionTitle(doc, 'TIBBİ ANAMNEZ', y + 1)
  y = drawMedicalAnswers(doc, data, y + 9)
  const narrativeSummary = Object.entries(data.narrativeAnswers).filter(([, value]) => value?.trim()).map(([, value]) => value.trim()).join(' | ')
  doc.setFillColor(...COLORS.light)
  doc.setDrawColor(...COLORS.border)
  doc.roundedRect(10, y + 2, 190, 12, 1.5, 1.5, 'FD')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(6)
  doc.setTextColor(...COLORS.slate)
  doc.text('EK ANAMNEZ AÇIKLAMALARI', 12, y + 6)
  doc.setFont('Roboto', 'normal')
  doc.setTextColor(...COLORS.dark)
  doc.text(doc.splitTextToSize(narrativeSummary || 'Ek açıklama bulunmuyor.', 186).slice(0, 2), 12, y + 9.5)
  drawFooter(doc, 1)

  doc.addPage()
  await drawHeader(doc, institution, 2, data.status)
  sectionTitle(doc, 'FİZİK MUAYENE VE ÖLÇÜMLER', 37)
  y = keyValueGrid(doc, Object.entries(data.physicalExamination).map(([key, value]) => ({
    label: ({ eye: 'Göz', ent: 'Kulak - Burun - Boğaz', skin: 'Deri', cardiovascular: 'Kardiyovasküler Sistem', respiratory: 'Solunum Sistemi', digestive: 'Sindirim Sistemi', urogenital: 'Ürogenital Sistem', musculoskeletal: 'Kas-İskelet Sistemi', neurological: 'Nörolojik Muayene', psychiatric: 'Psikiyatrik Muayene' } as Record<string, string>)[key] || key,
    value,
  })), 46, 2, 8)
  y = keyValueGrid(doc, [
    { label: 'Tansiyon', value: data.measurements.bloodPressure }, { label: 'Nabız', value: data.measurements.pulse }, { label: 'Boy', value: data.measurements.height ? `${data.measurements.height} cm` : '' },
    { label: 'Kilo', value: data.measurements.weight ? `${data.measurements.weight} kg` : '' }, { label: 'Vücut Kitle İndeksi', value: data.measurements.bmi }, { label: 'Muayene Tarihi', value: formatDate(data.reportDate) },
  ], y + 1, 3, 9)

  sectionTitle(doc, 'LABORATUVAR VE TETKİK BULGULARI', y + 3)
  y = drawLabFindings(doc, data.laboratoryFindings, y + 12)

  sectionTitle(doc, 'ALIŞKANLIKLAR VE HEKİM SONUCU', y + 1)
  y = keyValueGrid(doc, [
    { label: 'Sigara', value: [data.smoking.status, data.smoking.dailyAmount].filter(Boolean).join(' / ') },
    { label: 'Alkol', value: [data.alcohol.status, data.alcohol.frequency].filter(Boolean).join(' / ') },
    { label: 'Uygunluk Durumu', value: data.conclusion },
  ], y + 9, 3, 10)
  const resultLines = doc.splitTextToSize(valueOrDash(data.resultText), 184)
  const resultHeight = Math.min(30, Math.max(18, resultLines.length * 4 + 8))
  doc.setFillColor(...COLORS.blueLight)
  doc.setDrawColor(147, 197, 253)
  doc.roundedRect(10, y + 3, 190, resultHeight, 2, 2, 'FD')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.blueDark)
  doc.text('HEKİM KANAATİ / SONUÇ', 13, y + 8)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.dark)
  doc.text(resultLines.slice(0, 6), 13, y + 13)
  y += resultHeight + 6

  sectionTitle(doc, 'ONAY VE KAŞELER', y)
  y += 9
  const stamps = [
    ...(doctorStamp ? [{ id: 'doctor', name: doctorName, image: doctorStamp, doctor: true }] : []),
    ...settings.stamps.map((stamp) => ({ ...stamp, doctor: false })),
  ].slice(0, 6)
  const slotWidth = 190 / Math.max(1, stamps.length)
  if (stamps.length === 0) {
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.gray)
    doc.text(`Rapor Doktoru: ${doctorName} - Kaşe görseli tanımlanmamış.`, 10, y + 8)
  } else {
    await Promise.all(stamps.map(async (stamp, index) => {
      const x = 10 + index * slotWidth
      doc.setDrawColor(...COLORS.border)
      doc.roundedRect(x + 1, y, slotWidth - 2, 25, 1.5, 1.5, 'S')
      await addImageContained(doc, stamp.image, x + 3, y + 2, slotWidth - 6, 15)
      doc.setFont('Roboto', stamp.doctor ? 'bold' : 'normal')
      doc.setFontSize(5.5)
      doc.setTextColor(...COLORS.slate)
      doc.text(doc.splitTextToSize(stamp.doctor ? `Rapor Doktoru: ${stamp.name}` : stamp.name, slotWidth - 5).slice(0, 2), x + slotWidth / 2, y + 20, { align: 'center' })
    }))
  }
  drawFooter(doc, 2)

  const safePatient = patient.name.replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ ]/g, '').trim().replace(/\s+/g, '_').slice(0, 36)
  const title = `EK2_${safePatient}_${protocol.protocolNo}`
  doc.setProperties({ title, subject: 'EK-2 İşe Giriş / Periyodik Muayene Formu', author: institution.name || 'HanTech OSGB Yönetim Sistemi', creator: 'HanTech OSGB Yönetim Sistemi' })
  if (returnBlob) return doc.output('blob')
  const url = doc.output('bloburl')
  if (previewWindow) {
    previewWindow.location.href = url.toString()
    previewWindow.document.title = title
  } else {
    window.open(url.toString(), '_blank')
  }
}

export async function downloadEk2Pdf(report: Ek2ReportInput): Promise<void> {
  const blob = await openEk2Pdf(report, true)
  if (!(blob instanceof Blob)) return
  const safePatient = report.patient.name.replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ ]/g, '').trim().replace(/\s+/g, '_').slice(0, 36)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `EK2_${safePatient}_${report.protocol.protocolNo}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
