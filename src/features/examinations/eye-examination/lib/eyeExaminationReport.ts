import type { EyeExaminationData, PatientDetail, Protocol, ProtocolService } from '@/shared/types'
import { getDoctorStampForTest, getAssistantStampForTest } from '@/shared/lib/doctors'
import { getInstitutionStampForTest } from '@/shared/lib/institutionStamps'

const STORAGE_KEY = 'cetka-institution'

interface InstitutionForm {
  code: string
  name: string
  address: string
  phone: string
  authorizedPerson: string
  authorizedPhone: string
  officialEmail: string
  mailAddress: string
  logo: string
  ministryLogo: string
  showPdfAntet: boolean
}

interface ReportData {
  patient: PatientDetail
  protocol: Protocol
  service: ProtocolService
  data: EyeExaminationData
  recordedBy: string
  approvedBy?: string
  approvedAt?: string
  approvedByStamp?: string
}

function loadInstitution(): Partial<InstitutionForm> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Partial<InstitutionForm>
  } catch {
    // ignore
  }
  return {}
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

async function loadFontBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  return btoa(binary)
}

let cachedFonts: { regular: string; bold: string } | null = null

async function ensureFonts(doc: import('jspdf').jsPDF): Promise<void> {
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
}

function svgToPng(svg: string, width: number, height: number): Promise<string | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = width * 2
    canvas.height = height * 2
    const ctx = canvas.getContext('2d')
    if (!ctx) return resolve(null)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    img.src = url
  })
}

function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = base64
  })
}

function fitLogoDimensions(naturalWidth: number, naturalHeight: number, maxW: number, maxH: number): { w: number; h: number } {
  if (naturalWidth === 0 || naturalHeight === 0) return { w: maxW, h: maxH }
  const ratio = naturalWidth / naturalHeight
  const maxRatio = maxW / maxH
  if (ratio > maxRatio) {
    return { w: maxW, h: maxW / ratio }
  }
  return { w: maxH * ratio, h: maxH }
}

function buildEyeSvg(color: string, label: string): string {
  // PDF içinde daha klinik ve sade görünen, clipart hissinden uzak
  // çizgisel göz şeması. Renk yalnızca OD/OS ayrımı için kullanılır.
  const w = 180
  const h = 90
  const cx = w / 2
  const cy = 39
  const eyeRx = 67
  const irisR = 16
  const pupilR = 6
  const gid = `eye_${label.replace(/[^a-zA-Z0-9]/g, '')}`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
      <clipPath id="${gid}_clip">
        <path d="M ${cx - eyeRx} ${cy}
          C ${cx - 48} ${cy - 25}, ${cx - 18} ${cy - 30}, ${cx} ${cy - 24}
          C ${cx + 18} ${cy - 30}, ${cx + 48} ${cy - 25}, ${cx + eyeRx} ${cy}
          C ${cx + 48} ${cy + 25}, ${cx + 18} ${cy + 30}, ${cx} ${cy + 24}
          C ${cx - 18} ${cy + 30}, ${cx - 48} ${cy + 25}, ${cx - eyeRx} ${cy} Z" />
      </clipPath>
    </defs>

    <rect width="${w}" height="${h}" fill="#ffffff"/>

    <!-- Main eye contour -->
    <path d="M ${cx - eyeRx} ${cy}
      C ${cx - 48} ${cy - 25}, ${cx - 18} ${cy - 30}, ${cx} ${cy - 24}
      C ${cx + 18} ${cy - 30}, ${cx + 48} ${cy - 25}, ${cx + eyeRx} ${cy}"
      fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>

    <path d="M ${cx - eyeRx} ${cy}
      C ${cx - 48} ${cy + 25}, ${cx - 18} ${cy + 30}, ${cx} ${cy + 24}
      C ${cx + 18} ${cy + 30}, ${cx + 48} ${cy + 25}, ${cx + eyeRx} ${cy}"
      fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>

    <g clip-path="url(#${gid}_clip)">
      <!-- Iris -->
      <circle cx="${cx}" cy="${cy}" r="${irisR}" fill="#f8fafc" stroke="${color}" stroke-width="1.8"/>
      <circle cx="${cx}" cy="${cy}" r="${irisR - 4}" fill="none" stroke="${color}" stroke-width="0.9" opacity="0.55"/>
      <circle cx="${cx}" cy="${cy}" r="${pupilR}" fill="#0f172a"/>

      <!-- Iris radial clinical lines -->
      ${Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180
        const r1 = pupilR + 2
        const r2 = irisR - 2
        const x1 = cx + Math.cos(a) * r1
        const y1 = cy + Math.sin(a) * r1
        const x2 = cx + Math.cos(a) * r2
        const y2 = cy + Math.sin(a) * r2
        return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${color}" stroke-width="0.65" opacity="0.42"/>`
      }).join('')}
    </g>

    <!-- Small clinical orientation marks -->
    <path d="M ${cx - 48} ${cy - 19} Q ${cx} ${cy - 34} ${cx + 48} ${cy - 19}"
      fill="none" stroke="#94a3b8" stroke-width="0.7" opacity="0.55"/>
    <path d="M ${cx - 48} ${cy + 19} Q ${cx} ${cy + 30} ${cx + 48} ${cy + 19}"
      fill="none" stroke="#94a3b8" stroke-width="0.7" opacity="0.45"/>

    <!-- OD / OS label -->
    <rect x="${cx - 25}" y="70" width="50" height="14" rx="7" fill="${color}"/>
    <text x="${cx}" y="79.5" font-size="8.5" text-anchor="middle"
      fill="#ffffff" font-weight="700" font-family="Arial, sans-serif"
      letter-spacing="1">${label}</text>
  </svg>`
}

export async function openEyeExaminationPdf(report: ReportData, existingDoc?: import('jspdf').jsPDF, isFirstPage = false, returnBlob = false): Promise<import('jspdf').jsPDF | Blob | void> {
  const { patient, protocol, service, data, approvedBy } = report
  const institution = loadInstitution()

  const birthDate = patient.birthDate
    ? new Date(patient.birthDate).toLocaleDateString('tr-TR')
    : '-'
  const processDate = service.processDate
    ? new Date(service.processDate).toLocaleDateString('tr-TR')
    : '-'

  let doc: import('jspdf').jsPDF
  if (existingDoc) {
    doc = existingDoc
    if (!isFirstPage) doc.addPage()
  } else {
    const { jsPDF } = await import('jspdf')
    doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  }
  await ensureFonts(doc)
  doc.setFont('Roboto')

  const pageW = 210
  const margin = 10
  const contentW = pageW - margin * 2
  let y = margin

  const dark = hexToRgb('#1e293b')
  const gray = hexToRgb('#64748b')
  const slate = hexToRgb('#475569')
  const lightBg = hexToRgb('#f8fafc')
  const border = hexToRgb('#e2e8f0')
  const blue = hexToRgb('#2563eb')
  const red = hexToRgb('#dc2626')
  const green = hexToRgb('#166534')

  // === HEADER ===
  doc.setDrawColor(...blue)
  doc.setLineWidth(0.7)
  doc.line(margin, y + 1, pageW - margin, y + 1)

  // Logo alanı: max 36mm genişlik, 22mm yükseklik, orantılı ölçekleme
  const logoMaxW = 36
  const logoMaxH = 22
  let logoW = 0
  let logoH = 0
  if (institution.logo) {
    try {
      const dims = await getImageDimensions(institution.logo)
      const fit = fitLogoDimensions(dims.width, dims.height, logoMaxW, logoMaxH)
      logoW = fit.w
      logoH = fit.h
      doc.addImage(institution.logo, 'PNG', margin, y + 2, logoW, logoH)
    } catch {
      // ignore
    }
  }

  // Ministry logo on the right
  const ministryMaxW = 20
  const ministryMaxH = 20
  let ministryW = 0
  let ministryH = 0
  if (institution.ministryLogo) {
    try {
      const dims = await getImageDimensions(institution.ministryLogo)
      const fit = fitLogoDimensions(dims.width, dims.height, ministryMaxW, ministryMaxH)
      ministryW = fit.w
      ministryH = fit.h
      doc.addImage(institution.ministryLogo, 'PNG', pageW - margin - ministryW, y + 2, ministryW, ministryH)
    } catch {
      // ignore
    }
  }

  const textX = logoW > 0 ? margin + logoW + 5 : margin
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...dark)
  doc.text(institution.name || 'KURUM', textX, y + 7)

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...gray)
  if (institution.address) {
    const addrWidth = Math.max(40, contentW - logoW - ministryW - 40)
    const addrLines = doc.splitTextToSize(institution.address, addrWidth)
    doc.text(addrLines[0] || '', textX, y + 11.5)
  }
  const contactParts = [
    institution.phone ? `Tel: ${institution.phone}` : '',
  ].filter(Boolean)
  if (contactParts.length > 0) {
    doc.text(contactParts.join('  |  '), textX, y + 15.5)
  }

  doc.setFontSize(9)
  doc.setFont('Roboto', 'bold')
  const statusX = pageW - margin - ministryW - 3
  if (approvedBy) {
    doc.setTextColor(...green)
    doc.text('ONAYLANDI', statusX, y + 7, { align: 'right' })
  } else {
    doc.setTextColor(...gray)
    doc.text('TASLAK', statusX, y + 7, { align: 'right' })
  }

  y += 23
  doc.setDrawColor(...blue)
  doc.line(margin, y, pageW - margin, y)
  y += 5

  // === REPORT TITLE ===
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...dark)
  const reportTitle = data.examinationMode === 'eshel'
    ? 'GÖZ MUAYENESİ · EŞHEL (SNELLEN) RAPORU'
    : 'GÖZ TARAMASI · OTOREFRAKTOMETRE RAPORU'
  doc.text(reportTitle, pageW / 2, y + 5, { align: 'center' })
  doc.setDrawColor(...dark)
  doc.setLineWidth(0.4)
  doc.line(margin + 20, y + 7, pageW - margin - 20, y + 7)
  y += 10

  // === PATIENT INFO TABLE ===
  doc.setFillColor(...lightBg)
  doc.setDrawColor(...border)
  doc.setLineWidth(0.2)
  doc.roundedRect(margin, y, contentW, 24, 2, 2, 'FD')

  const patientRows: { label: string; value: string }[] = [
    { label: 'Adı Soyadı', value: patient.name },
    { label: 'TC Kimlik No', value: patient.tc },
    { label: 'Doğum / Cinsiyet', value: `${birthDate} / ${patient.gender || '-'}` },
    { label: 'Firma / Kurum', value: protocol.company },
    { label: 'Protokol No', value: protocol.protocolNo },
    { label: 'Muayene Türü', value: protocol.examType },
    { label: 'Barkod No', value: service.barcode || '-' },
    { label: 'İşlem Tarihi', value: processDate },
    { label: 'Hizmet', value: service.name },
  ]

  const colW = contentW / 3
  const rowH = 8
  patientRows.forEach((row, i) => {
    const col = i % 3
    const rowIdx = Math.floor(i / 3)
    const x = margin + col * colW
    const ry = y + 2 + rowIdx * rowH

    doc.setFont('Roboto', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(...slate)
    doc.text(row.label.toUpperCase(), x + 2, ry)

    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...dark)
    const valW = colW - 4
    const lines = doc.splitTextToSize(row.value, valW)
    doc.text(lines[0] || '-', x + 2, ry + 3.5)
  })

  y += 26

  // === EYE EXAMINATION CARDS ===
  // Göz fotoğrafı yerine klinik veri + OD/OS gösterimi kullanılır.
  const cardGap = 4
  const cardW = (contentW - cardGap) / 2
  const cardH = 56

  const [rightPng, leftPng] = await Promise.all([
    svgToPng(buildEyeSvg('#dc2626', 'OD'), 180, 90),
    svgToPng(buildEyeSvg('#2563eb', 'OS'), 180, 90),
  ])

  const drawEyeCard = (
    x: number,
    cardColor: [number, number, number],
    label: string,
    png: string | null,
    eyeData: EyeExaminationData['rightEye'],
    mirror: boolean,
  ) => {
    // Card
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...border)
    doc.setLineWidth(0.35)
    doc.roundedRect(x, y, cardW, cardH, 3, 3, 'FD')

    // Accent bar (mirror tarafında)
    doc.setFillColor(...cardColor)
    if (mirror) {
      doc.roundedRect(x + cardW - 2.2, y, 2.2, cardH, 1.1, 1.1, 'F')
    } else {
      doc.roundedRect(x, y, 2.2, cardH, 1.1, 1.1, 'F')
    }

    // Header
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...dark)
    if (mirror) {
      doc.text(label, x + cardW - 7, y + 7.5, { align: 'right' })
    } else {
      doc.text(label, x + 7, y + 7.5)
    }

    doc.setFont('Roboto', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...cardColor)
    if (mirror) {
      doc.text(label === 'Sağ Göz' ? 'OD' : 'OS', x + 7, y + 7.5)
    } else {
      doc.text(label === 'Sağ Göz' ? 'OD' : 'OS', x + cardW - 7, y + 7.5, { align: 'right' })
    }

    // Eye diagram (mirror tarafında)
    if (png) {
      try {
        const imgX = mirror ? x + cardW - 43 : x + 5
        doc.addImage(png, 'PNG', imgX, y + 10, 38, 19)
      } catch {
        // ignore
      }
    }

    // Visual acuity block (göz şemasının iç tarafına doğru)
    // "0" değeri girilmemiş sayılır — gösterilmez
    const isMeaningful = (v: string) => {
      const t = v.trim()
      return t !== '' && t !== '0' && t !== '0/0' && t !== '0.0'
    }
    const acuityBare = isMeaningful(eyeData.visualAcuity ?? '') ? eyeData.visualAcuity!.trim() : ''
    const acuityGlasses = isMeaningful(eyeData.visualAcuityWithGlasses ?? '') ? eyeData.visualAcuityWithGlasses!.trim() : ''
    const metricX = mirror ? x + cardW / 2 - 12 : x + cardW / 2 + 12

    if (acuityBare && acuityGlasses) {
      // İkisi de girilmiş — iki satır halinde göster
      doc.setFont('Roboto', 'bold')
      doc.setFontSize(5.5)
      doc.setTextColor(...gray)
      doc.text('GÖZLÜKSÜZ', metricX, y + 14.5, { align: 'center' })
      doc.setFont('Roboto', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(...dark)
      doc.text(acuityBare, metricX, y + 20, { align: 'center' })

      doc.setFont('Roboto', 'bold')
      doc.setFontSize(5.5)
      doc.setTextColor(...cardColor)
      doc.text('GÖZLÜK/LENS', metricX, y + 24.5, { align: 'center' })
      doc.setFont('Roboto', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(...cardColor)
      doc.text(acuityGlasses, metricX, y + 29.5, { align: 'center' })
    } else if (acuityGlasses) {
      // Sadece gözlüklü/lensli girilmiş — çıplak göz gösterilmez
      doc.setFont('Roboto', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(...cardColor)
      doc.text('GÖZLÜK/LENS', metricX, y + 15.5, { align: 'center' })

      doc.setFont('Roboto', 'bold')
      doc.setFontSize(19)
      doc.setTextColor(...dark)
      doc.text(acuityGlasses, metricX, y + 22, { align: 'center' })

      doc.setFont('Roboto', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...gray)
      doc.text('GÖRME KESKİNLİĞİ', metricX, y + 26.5, { align: 'center' })
    } else if (acuityBare) {
      // Sadece çıplak göz girilmiş
      doc.setFont('Roboto', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(...gray)
      doc.text('GÖZLÜKSÜZ', metricX, y + 15.5, { align: 'center' })

      doc.setFont('Roboto', 'bold')
      doc.setFontSize(19)
      doc.setTextColor(...dark)
      doc.text(acuityBare, metricX, y + 22, { align: 'center' })

      doc.setFont('Roboto', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...gray)
      doc.text('GÖRME KESKİNLİĞİ', metricX, y + 26.5, { align: 'center' })
    } else {
      // Hiç değer girilmemiş
      doc.setFont('Roboto', 'bold')
      doc.setFontSize(19)
      doc.setTextColor(...gray)
      doc.text('-', metricX, y + 20, { align: 'center' })

      doc.setFont('Roboto', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...gray)
      doc.text('GÖRME KESKİNLİĞİ', metricX, y + 24.5, { align: 'center' })
    }

    // Divider
    doc.setDrawColor(...border)
    doc.setLineWidth(0.2)
    doc.line(x + 7, y + 31, x + cardW - 7, y + 31)

    // Measurement grid — eshel modunda SPH/CYL/AX gösterilmez
    const isEshel = data.examinationMode === 'eshel'
    const params: { l: string; v: string }[] = isEshel
      ? [
          { l: 'GÖZLÜK/LENS', v: eyeData.visualAcuityWithGlasses },
          { l: 'TANSİYON', v: eyeData.eyePressure },
        ]
      : [
          { l: 'SPH', v: eyeData.sph },
          { l: 'CYL', v: eyeData.cyl },
          { l: 'AX', v: eyeData.ax },
          { l: 'GÖZLÜK/LENS', v: eyeData.visualAcuityWithGlasses },
          { l: 'TANSİYON', v: eyeData.eyePressure },
        ]

    const paramGap = 1.5
    const paramW = (cardW - 14 - (params.length - 1) * paramGap) / params.length
    let px = x + 7

    params.forEach((p) => {
      doc.setFillColor(...lightBg)
      doc.setDrawColor(...border)
      doc.setLineWidth(0.2)
      doc.roundedRect(px, y + 34, paramW, 16, 1.8, 1.8, 'FD')

      doc.setFont('Roboto', 'bold')
      doc.setFontSize(5.2)
      doc.setTextColor(...gray)
      doc.text(p.l, px + paramW / 2, y + 38, { align: 'center' })

      doc.setFont('Roboto', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...dark)
      const val = p.v?.trim() || '-'
      doc.text(val, px + paramW / 2, y + 46.5, { align: 'center' })

      px += paramW + paramGap
    })
  }

  drawEyeCard(margin, blue, 'Sol Göz', leftPng, data.leftEye, false)
  drawEyeCard(margin + cardW + cardGap, red, 'Sağ Göz', rightPng, data.rightEye, true)

  y += cardH + 6

  // === FINDINGS TABLE (2 columns) ===
  const findings: { label: string; value: string }[] = [
    { label: 'Renk Körlüğü', value: data.colorBlindness },
    { label: 'Gözlük İhtiyacı', value: data.needsGlasses },
    { label: 'Gece Körlüğü', value: data.nightBlindness },
    { label: 'Ekranlı Araçlarda', value: data.screenUsage },
    { label: 'Yüksekte Çalışma Sakıncası', value: data.highAltitude },
    ...(data.extraFindings ?? []).map((f) => ({ label: f.label, value: f.value })),
  ].filter((f) => f.value !== 'İşaretsiz')

  if (findings.length > 0) {
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...dark)
    doc.text('KLİNİK BULGULAR', margin, y)
    y += 4

    const findingColW = (contentW - 4) / 2
    const findingCellH = 6.5
    const findingRows = Math.ceil(findings.length / 2)

    for (let i = 0; i < findings.length; i++) {
      const row = findings[i]
      const col = i % 2
      const rowIdx = Math.floor(i / 2)
      const fx = margin + col * (findingColW + 4)
      const frowY = y + rowIdx * findingCellH

      doc.setFillColor(...lightBg)
      doc.setDrawColor(...border)
      doc.setLineWidth(0.2)
      doc.roundedRect(fx, frowY, findingColW, findingCellH, 2, 2, 'FD')

      doc.setFont('Roboto', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...slate)
      doc.text(row.label, fx + 2, frowY + 4)

      doc.setFont('Roboto', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...dark)
      const valW = findingColW - 50
      const lines = doc.splitTextToSize(row.value, valW)
      doc.text(lines[0], fx + findingColW - 2, frowY + 4, { align: 'right' })
    }

    y += findingRows * findingCellH + 6
  }

  // === EVALUATION / DIAGNOSIS ===
  const sections: { title: string; value: string }[] = [
    { title: 'Değerlendirme', value: data.evaluation },
    { title: 'Tanı', value: data.diagnosis },
  ].filter((s) => s.value.trim().length > 0)

  if (sections.length > 0) {
    const sectionGap = 3
    const sectionW = sections.length === 1
      ? contentW
      : (contentW - sectionGap) / 2
    const sectionH = 22

    sections.forEach((section, i) => {
      const sx = margin + (sections.length === 1 ? 0 : i * (sectionW + sectionGap))

      doc.setFont('Roboto', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...dark)
      doc.text(section.title.toUpperCase(), sx, y)

      doc.setFillColor(...lightBg)
      doc.setDrawColor(...border)
      doc.setLineWidth(0.2)
      doc.roundedRect(sx, y + 3, sectionW, sectionH, 2, 2, 'FD')

      doc.setFont('Roboto', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...dark)
      const lines = doc.splitTextToSize(section.value.trim() || '-', sectionW - 4)
      const lineH = 3.2
      let sy = y + 7
      lines.slice(0, 5).forEach((line: string) => {
        doc.text(line, sx + 2, sy)
        sy += lineH
      })
    })

    y += 3 + sectionH + 6
  }

  // === RESULT TEXT ===
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...dark)
  doc.text('SONUÇ VE YORUM', margin, y)
  y += 4

  const resultText = data.resultText?.trim() || service.resultText || 'Sonuç girilmedi.'
  doc.setFillColor(...lightBg)
  doc.setDrawColor(...border)
  doc.setLineWidth(0.2)

  const resultLines = doc.splitTextToSize(resultText, contentW - 6)
  const resultLineH = 3.6
  const resultH = Math.max(12, resultLines.length * resultLineH + 5)
  const maxResultH = 60
  const finalResultH = Math.min(resultH, maxResultH)
  doc.roundedRect(margin, y, contentW, finalResultH, 2, 2, 'FD')

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...dark)
  let ry = y + 5
  resultLines.forEach((line: string) => {
    if (ry + 2 > y + finalResultH - 1) return
    doc.text(line, margin + 2, ry)
    ry += resultLineH
  })

  y += finalResultH + 5

  // === FOOTER ===
  doc.setDrawColor(...border)
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageW - margin, y)
  y += 3

  // Teste özel doktor, kurum ve asistan kaşeleri.
  const doctorStamp = getDoctorStampForTest(service.name)
  const assistantStamp = getAssistantStampForTest(service.name)
  const institutionStamp = getInstitutionStampForTest(service.name)
  const stamps = [doctorStamp, institutionStamp?.image, assistantStamp].filter(Boolean) as string[]
  if (stamps.length > 0) {
    const stampW = institutionStamp ? 34 : 40
    const stampH = 14
    const stampGap = (contentW - stampW * stamps.length) / (stamps.length + 1)
    stamps.forEach((stamp, index) => {
      const stampX = margin + stampGap * (index + 1) + stampW * index
      try { doc.addImage(stamp, 'PNG', stampX, y, stampW, stampH) } catch { /* geçersiz görsel atlanır */ }
    })
    y += 18
  }

  // Tetanoz belgesiyle aynı sabit yasal bilgilendirme alanı.
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.2)
  doc.line(margin, 279, pageW - margin, 279)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(5.8)
  doc.setTextColor(100, 116, 139)
  doc.text('Bu rapor, 5070 sayılı Elektronik İmza Kanunu çerçevesinde elektronik ortamda onaylanmıştır.', pageW / 2, 283, { align: 'center' })
  doc.text('6331 sayılı İş Sağlığı ve Güvenliği Kanunu ile ilgili yönetmelik hükümleri uyarınca düzenlenmiştir.', pageW / 2, 286.5, { align: 'center' })
  doc.setFillColor(...blue)
  doc.rect(0, 292, pageW, 5, 'F')

  if (existingDoc) {
    return doc
  }
  if (returnBlob) {
    return doc.output('blob')
  }
  // PDF metadata — dosya adı ve başlık
  const safePatient = patient.name.replace(/\s+/g, '_').slice(0, 30)
  const pdfTitle = `GozMuayenesi_${safePatient}_${protocol.protocolNo}`
  doc.setProperties({
    title: pdfTitle,
    subject: 'Göz Muayanesi Raporu',
    author: institution.name || 'CETKA',
  })

  const blobUrl = doc.output('bloburl')
  const newWin = window.open(blobUrl, '_blank')
  if (newWin) {
    newWin.document.title = pdfTitle
  }
}
