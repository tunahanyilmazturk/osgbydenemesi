import type { PatientDetail, Protocol, ProtocolService, TetanusVaccinationData } from '@/shared/types'

const STORAGE_KEY = 'cetka-institution'

interface InstitutionForm {
  name: string
  address: string
  phone: string
  officialEmail: string
  logo: string
  ministryLogo: string
}

interface ReportData {
  patient: PatientDetail
  protocol: Protocol
  service: ProtocolService
  data: TetanusVaccinationData
  recordedBy?: string
  approvedBy?: string
  approvedAt?: string
  approvedByStamp?: string
}

function loadInstitution(): Partial<InstitutionForm> {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? JSON.parse(value) as Partial<InstitutionForm> : {}
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

let cachedFonts: { regular: string; bold: string } | null = null

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
  doc.setFont('Roboto')
}

function formatDate(value?: string, includeTime = false) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR', includeTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function imageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve({ width: 0, height: 0 })
    image.src = src
  })
}

function fitDimensions(width: number, height: number, maxWidth: number, maxHeight: number) {
  if (!width || !height) return { width: maxWidth, height: maxHeight }
  const scale = Math.min(maxWidth / width, maxHeight / height)
  return { width: width * scale, height: height * scale }
}

function addCheckShield(doc: import('jspdf').jsPDF, x: number, y: number) {
  doc.setFillColor(16, 185, 129)
  doc.circle(x, y, 10, 'F')
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(1.8)
  doc.line(x - 4.2, y, x - 1, y + 3.2)
  doc.line(x - 1, y + 3.2, x + 5.2, y - 4)
}

export async function openTetanusVaccinationPdf(
  report: ReportData,
  existingDoc?: import('jspdf').jsPDF,
  isFirstPage = false,
  returnBlob = false,
): Promise<import('jspdf').jsPDF | Blob | void> {
  const { patient, protocol, service, data } = report
  const institution = loadInstitution()
  // Sekmeyi kullanıcı etkileşimi devam ederken ayır; font/PDF hazırlığı sonrasında
  // yapılan window.open çağrıları bazı tarayıcılarda açılır pencere olarak engellenir.
  const previewWindow = !existingDoc && !returnBlob ? window.open('', '_blank') : null
  let doc: import('jspdf').jsPDF
  if (existingDoc) {
    doc = existingDoc
    if (!isFirstPage) doc.addPage()
  } else {
    const { jsPDF } = await import('jspdf')
    doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  }
  await ensureFonts(doc)

  const margin = 10
  const pageWidth = 210
  const contentWidth = 190
  const blueAccent: [number, number, number] = [37, 99, 235]
  const blueDark: [number, number, number] = [29, 78, 216]
  const navy: [number, number, number] = [30, 41, 59]
  const gray: [number, number, number] = [100, 116, 139]
  const slate: [number, number, number] = [71, 85, 105]
  const lightBackground: [number, number, number] = [248, 250, 252]
  const border: [number, number, number] = [226, 232, 240]
  const blue: [number, number, number] = [37, 99, 235]
  const green: [number, number, number] = [22, 101, 52]
  let y = margin

  // === HEADER ===
  // Göz ve odyometri raporlarındaki antet ölçüleri birebir kullanılır.
  doc.setDrawColor(...blue)
  doc.setLineWidth(0.7)
  doc.line(margin, y + 1, pageWidth - margin, y + 1)

  let logoWidth = 0
  if (institution.logo) {
    try {
      const dimensions = await imageDimensions(institution.logo)
      const fitted = fitDimensions(dimensions.width, dimensions.height, 36, 22)
      logoWidth = fitted.width
      doc.addImage(institution.logo, 'PNG', margin, y + 2, fitted.width, fitted.height)
    } catch {
      // Logo olmadan devam edilir.
    }
  }

  let ministryWidth = 0
  if (institution.ministryLogo) {
    try {
      const dimensions = await imageDimensions(institution.ministryLogo)
      const fitted = fitDimensions(dimensions.width, dimensions.height, 20, 20)
      ministryWidth = fitted.width
      doc.addImage(institution.ministryLogo, 'PNG', pageWidth - margin - fitted.width, y + 2, fitted.width, fitted.height)
    } catch {
      // Bakanlık logosu olmadan devam edilir.
    }
  }

  const headerTextX = logoWidth > 0 ? margin + logoWidth + 5 : margin
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...navy)
  doc.text(institution.name || 'KURUM', headerTextX, y + 7)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...gray)
  if (institution.address) {
    const addressWidth = Math.max(40, contentWidth - logoWidth - ministryWidth - 40)
    const addressLines = doc.splitTextToSize(institution.address, addressWidth) as string[]
    doc.text(addressLines[0] || '', headerTextX, y + 11.5)
  }
  if (institution.phone) doc.text(`Tel: ${institution.phone}`, headerTextX, y + 15.5)

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(report.approvedBy ? green[0] : gray[0], report.approvedBy ? green[1] : gray[1], report.approvedBy ? green[2] : gray[2])
  const statusX = pageWidth - margin - ministryWidth - 3
  doc.text(report.approvedBy ? 'ONAYLANDI' : 'TASLAK', statusX, y + 7, { align: 'right' })

  y += 23
  doc.setDrawColor(...blue)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5

  // === REPORT TITLE ===
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...navy)
  doc.text('TETANOZ AŞISI UYGULAMA BELGESİ', pageWidth / 2, y + 5, { align: 'center' })
  doc.setDrawColor(...navy)
  doc.setLineWidth(0.4)
  doc.line(margin + 20, y + 7, pageWidth - margin - 20, y + 7)
  y += 10

  // === PATIENT INFO TABLE ===
  doc.setFillColor(...lightBackground)
  doc.setDrawColor(...border)
  doc.setLineWidth(0.2)
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD')
  const patientFields = [
    ['Adı Soyadı', patient.name], ['TC Kimlik No', patient.tc], ['Doğum / Cinsiyet', `${formatDate(patient.birthDate)} / ${patient.gender || '-'}`],
    ['Firma / Kurum', protocol.company], ['Protokol No', protocol.protocolNo], ['Muayene Türü', protocol.examType],
    ['Barkod No', service.barcode || '-'], ['İşlem Tarihi', formatDate(service.processDate)], ['Hizmet', service.name],
  ]
  const patientColumnWidth = contentWidth / 3
  patientFields.forEach(([label, value], index) => {
    const x = margin + (index % 3) * patientColumnWidth
    const rowY = y + 2 + Math.floor(index / 3) * 8
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(...slate)
    doc.text(label.toLocaleUpperCase('tr-TR'), x + 2, rowY)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...navy)
    const lines = doc.splitTextToSize(value, patientColumnWidth - 4) as string[]
    doc.text(lines[0] || '-', x + 2, rowY + 3.5)
  })
  y += 26

  // Belgenin odak alanı.
  doc.setFillColor(239, 246, 255)
  doc.setDrawColor(191, 219, 254)
  doc.roundedRect(margin, y + 4, contentWidth, 31, 3, 3, 'FD')
  addCheckShield(doc, 28, y + 19.5)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(30, 64, 175)
  doc.text('TETANOZ AŞISI UYGULANMIŞTIR', 43, y + 16.5)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(7.1)
  doc.setTextColor(100, 116, 139)
  doc.text('Koruyucu sağlık hizmeti uygulama kaydı', 43, y + 23)
  doc.setFillColor(...blueAccent)
  doc.roundedRect(160, y + 11, 32, 16, 2, 2, 'F')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(6.2)
  doc.setTextColor(219, 234, 254)
  doc.text('UYGULAMA TARİHİ', 176, y + 16, { align: 'center' })
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(formatDate(data.applicationDate), 176, y + 22, { align: 'center' })

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, 119, contentWidth, 28, 2, 2, 'FD')
  doc.setFillColor(...blueDark)
  doc.roundedRect(margin, 119, 2.5, 28, 1.2, 1.2, 'F')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...blueDark)
  doc.text('UYGULAMA AÇIKLAMASI', margin + 7, 126)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  const declaration = `Yukarıda kimlik bilgileri bulunan kişiye ${formatDate(data.applicationDate)} tarihinde tetanoz aşısı uygulanmıştır. Bu belge, aşı uygulamasının kayıt altına alındığını ve onaylandığını göstermek amacıyla düzenlenmiştir.`
  doc.text(doc.splitTextToSize(declaration, contentWidth - 14), margin + 7, 133)

  doc.setDrawColor(203, 213, 225)
  doc.line(margin, 279, pageWidth - margin, 279)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(5.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Bu rapor, 5070 sayılı Elektronik İmza Kanunu çerçevesinde elektronik ortamda onaylanmıştır.', 105, 283, { align: 'center' })
  doc.text('6331 sayılı İş Sağlığı ve Güvenliği Kanunu ile ilgili yönetmelik hükümleri uyarınca düzenlenmiştir.', 105, 286.5, { align: 'center' })
  doc.setFillColor(...blueAccent)
  doc.rect(0, 292, pageWidth, 5, 'F')

  if (existingDoc) return doc
  if (returnBlob) return doc.output('blob')

  doc.setProperties({
    title: `Tetanoz Aşısı Uygulama Belgesi - ${patient.name}`,
    subject: `Protokol ${protocol.protocolNo}`,
    author: institution.name || 'HanTech OSGB Yönetim Sistemi',
    creator: 'HanTech OSGB Yönetim Sistemi',
  })
  const url = doc.output('bloburl')
  if (previewWindow) previewWindow.location.href = String(url)
  else window.location.href = String(url)
}
