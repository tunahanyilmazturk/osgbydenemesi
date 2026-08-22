import type { AudiometryData, PatientDetail, Protocol, ProtocolService } from '../types'
import { getDoctorStampForTest, getAssistantStampForTest } from './doctors'

const FREQUENCIES = ['250', '500', '1000', '2000', '3000', '4000', '6000', '8000']

// SVG chart dimensions
const CHART_W = 420
const CHART_H = 250
const PAD_L = 36
const PAD_R = 14
const PAD_T = 14
const PAD_B = 48
const PLOT_W = CHART_W - PAD_L - PAD_R
const PLOT_H = CHART_H - PAD_T - PAD_B
const DB_MAX = 110

const LOSS_BANDS = [
  { from: 0, to: 25, fill: '#ecfdf5' },
  { from: 25, to: 40, fill: '#fef9c3' },
  { from: 40, to: 55, fill: '#ffedd5' },
  { from: 55, to: 70, fill: '#fee2e2' },
  { from: 70, to: 90, fill: '#fecaca' },
  { from: 90, to: 110, fill: '#fca5a5' },
]

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
  data: AudiometryData
  recordedBy: string
  recordedByStamp?: string // Odyometrist kaşe
  approvedBy?: string
  approvedAt?: string
  approvedByStamp?: string // Doktor / KBB Uzmanı kaşe
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

function freqX(index: number) {
  return PAD_L + (index / (FREQUENCIES.length - 1)) * PLOT_W
}

function dbY(db: number) {
  return PAD_T + (db / DB_MAX) * PLOT_H
}

function average(values: Record<string, number | null>) {
  const nums = FREQUENCIES.map((f) => values[f]).filter((v) => v !== null && v !== undefined) as number[]
  if (nums.length === 0) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

function classifyLoss(avg: number | null): string {
  if (avg === null) return ''
  if (avg <= 25) return 'normal sınırlarda'
  if (avg <= 40) return 'hafif dereceli işitme kaybı'
  if (avg <= 55) return 'orta dereceli işitme kaybı'
  if (avg <= 70) return 'orta-ağır dereceli işitme kaybı'
  if (avg <= 90) return 'ağır işitme kaybı'
  return 'çok ağır işitme kaybı'
}

function calculateGap(air: Record<string, number | null>, bone: Record<string, number | null>) {
  const gaps = FREQUENCIES.map((frequency) => {
    const airValue = air[frequency]
    const boneValue = bone[frequency]
    return airValue !== null && airValue !== undefined && boneValue !== null && boneValue !== undefined
      ? airValue - boneValue
      : null
  }).filter((value): value is number => value !== null)

  return gaps.length ? Math.round(gaps.reduce((sum, value) => sum + value, 0) / gaps.length) : null
}

function getEarSummary(data: AudiometryData, side: 'right' | 'left') {
  const ear = side === 'right' ? data.right : data.left
  const airAverage = average(ear.air)
  const boneAverage = data.includeBone ? average(ear.bone) : null
  return {
    airAverage,
    boneAverage,
    classification: classifyLoss(airAverage),
    gap: data.includeBone ? calculateGap(ear.air, ear.bone) : null,
  }
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

function buildAudiogramSvg(data: AudiometryData, side: 'right' | 'left'): string {
  const air = side === 'right' ? data.right.air : data.left.air
  const bone = side === 'right' ? data.right.bone : data.left.bone
  const isRight = side === 'right'
  const color = isRight ? '#dc2626' : '#2563eb'

  const airPoints = FREQUENCIES.map((f, i) => ({ f, i, v: air[f] })).filter((p) => p.v !== null && p.v !== undefined)
  const bonePoints = data.includeBone
    ? FREQUENCIES.map((f, i) => ({ f, i, v: bone[f] })).filter((p) => p.v !== null && p.v !== undefined)
    : []

  const dbTicks = Array.from({ length: 12 }, (_, i) => i * 10)

  const bandRects = LOSS_BANDS.map((band) => {
    const y1 = dbY(band.from)
    const y2 = dbY(band.to)
    return `<rect x="${PAD_L}" y="${y1}" width="${PLOT_W}" height="${y2 - y1}" fill="${band.fill}" opacity="0.35" />`
  }).join('')

  const horizontalLines = dbTicks.map((db) => {
    const y = dbY(db)
    const major = db % 20 === 0
    return `<line x1="${PAD_L}" y1="${y}" x2="${PAD_L + PLOT_W}" y2="${y}" stroke="${major ? '#cbd5e1' : '#e2e8f0'}" stroke-width="${major ? 1 : 0.5}" stroke-dasharray="${major ? '0' : '3,3'}" />
            <text x="${PAD_L - 6}" y="${y + 3}" font-size="9" text-anchor="end" fill="#64748b">${db}</text>`
  }).join('')

  const verticalLines = FREQUENCIES.map((f, i) => {
    const x = freqX(i)
    return `<line x1="${x}" y1="${PAD_T}" x2="${x}" y2="${PAD_T + PLOT_H}" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="2,2" />
            <text x="${x}" y="${PAD_T + PLOT_H + 13}" font-size="9" text-anchor="middle" fill="#64748b">${f}</text>
            ${isRight
              ? `<circle cx="${x}" cy="${PAD_T + PLOT_H + 22}" r="3.5" fill="white" stroke="${color}" stroke-width="1.8" />`
              : `<rect x="${x - 3.5}" y="${PAD_T + PLOT_H + 18.5}" width="7" height="7" fill="white" stroke="${color}" stroke-width="1.8" />`
            }
            ${data.includeBone ? `<text x="${x}" y="${PAD_T + PLOT_H + 33}" font-size="11" text-anchor="middle" fill="${color}" font-weight="700">${isRight ? '&lt;' : '&gt;'}</text>` : ''}`
  }).join('')

  const axes = `<line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${PAD_T + PLOT_H}" stroke="#475569" stroke-width="1.2" />
                <line x1="${PAD_L}" y1="${PAD_T + PLOT_H}" x2="${PAD_L + PLOT_W}" y2="${PAD_T + PLOT_H}" stroke="#475569" stroke-width="1.2" />
                <text x="${PAD_L + PLOT_W / 2}" y="${CHART_H - 4}" font-size="9" text-anchor="middle" fill="#475569" font-weight="600">Frekans (Hz)</text>
                <text x="12" y="${PAD_T + PLOT_H / 2}" font-size="9" text-anchor="middle" fill="#475569" font-weight="600" transform="rotate(-90 12 ${PAD_T + PLOT_H / 2})">dB HL</text>
                <line x1="${PAD_L}" y1="${dbY(25)}" x2="${PAD_L + PLOT_W}" y2="${dbY(25)}" stroke="#16a34a" stroke-width="1" stroke-dasharray="6,3" opacity="0.6" />`

  const boneLine = data.includeBone && bonePoints.length > 1
    ? `<polyline fill="none" stroke="${color}" stroke-width="1.8" stroke-dasharray="5,3" points="${bonePoints.map((p) => `${freqX(p.i)},${dbY(p.v as number)}`).join(' ')}" />`
    : ''

  const airLine = airPoints.length > 1
    ? `<polyline fill="none" stroke="${color}" stroke-width="2.2" points="${airPoints.map((p) => `${freqX(p.i)},${dbY(p.v as number)}`).join(' ')}" />`
    : ''

  const airCircles = airPoints.map((p) => {
    const cx = freqX(p.i)
    const cy = dbY(p.v as number)
    return isRight
      ? `<circle cx="${cx}" cy="${cy}" r="5" fill="white" stroke="${color}" stroke-width="2.2" /><text x="${cx}" y="${cy - 9}" font-size="8" text-anchor="middle" fill="${color}" font-weight="600" pointer-events="none">${p.v}</text>`
      : `<rect x="${cx - 4.5}" y="${cy - 4.5}" width="9" height="9" fill="white" stroke="${color}" stroke-width="2.2" /><text x="${cx}" y="${cy - 9}" font-size="8" text-anchor="middle" fill="${color}" font-weight="600" pointer-events="none">${p.v}</text>`
  }).join('')

  const bonePaths = data.includeBone
    ? bonePoints.map((p) => {
        const cx = freqX(p.i)
        const cy = dbY(p.v as number)
        const path = isRight
          ? `M ${cx + 5} ${cy - 5} L ${cx} ${cy} L ${cx + 5} ${cy + 5}`
          : `M ${cx - 5} ${cy - 5} L ${cx} ${cy} L ${cx - 5} ${cy + 5}`
        return `<path d="${path}" fill="white" fill-opacity="0.8" stroke="${color}" stroke-width="2.2" /><text x="${cx}" y="${cy + 14}" font-size="8" text-anchor="middle" fill="${color}" font-weight="600" pointer-events="none">${p.v}</text>`
      }).join('')
    : ''

  const emptyHint = airPoints.length === 0 && bonePoints.length === 0
    ? `<text x="${PAD_L + PLOT_W / 2}" y="${PAD_T + PLOT_H / 2}" font-size="11" text-anchor="middle" fill="#94a3b8">Ölçüm girilmedi</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHART_W} ${CHART_H}" width="${CHART_W}" height="${CHART_H}">
    <rect x="0" y="0" width="${CHART_W}" height="${CHART_H}" fill="#ffffff" />
    <rect x="${PAD_L}" y="${PAD_T}" width="${PLOT_W}" height="${PLOT_H}" fill="#ffffff" />
    ${bandRects}
    ${horizontalLines}
    ${verticalLines}
    ${axes}
    ${boneLine}
    ${airLine}
    ${airCircles}
    ${bonePaths}
    ${emptyHint}
  </svg>`
}

// Helper: hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

// Load TTF font from public folder and convert to base64
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

export async function openAudiometryPdf(report: ReportData, existingDoc?: import('jspdf').jsPDF, isFirstPage = false, returnBlob = false): Promise<import('jspdf').jsPDF | Blob | void> {
  const { patient, protocol, service, data, approvedBy } = report
  const institution = loadInstitution()

  const birthDate = patient.birthDate
    ? new Date(patient.birthDate).toLocaleDateString('tr-TR')
    : '-'
  const processDate = service.processDate
    ? new Date(service.processDate).toLocaleDateString('tr-TR')
    : '-'

  // Generate audiogram PNGs
  const rightSvg = buildAudiogramSvg(data, 'right')
  const leftSvg = buildAudiogramSvg(data, 'left')
  const [rightPng, leftPng] = await Promise.all([
    svgToPng(rightSvg, CHART_W, CHART_H),
    svgToPng(leftSvg, CHART_W, CHART_H),
  ])

  const rightSummary = getEarSummary(data, 'right')
  const leftSummary = getEarSummary(data, 'left')

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
    doc.text('TAŞLAK', statusX, y + 7, { align: 'right' })
  }

  y += 23
  doc.setDrawColor(...blue)
  doc.line(margin, y, pageW - margin, y)
  y += 5

  // === REPORT TITLE ===
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...dark)
  doc.text('İŞİTME TESTİ (ODYOMETRİ) RAPORU', pageW / 2, y + 5, { align: 'center' })
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

  // === AUDIOGRAM CHARTS ===
  const chartGap = 4
  const chartW = (contentW - chartGap) / 2
  const chartH = chartW * (CHART_H / CHART_W) * 0.78

  // Sağ kulak başlığı + grafik kartı
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...red)
  doc.text('SAĞ KULAK', margin + chartW / 2, y + 3, { align: 'center' })

  doc.setFillColor(...lightBg)
  doc.setDrawColor(...red)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y + 5, chartW, chartH + 8, 2, 2, 'FD')

  if (rightPng) {
    try {
      doc.addImage(rightPng, 'PNG', margin + 2, y + 7, chartW - 4, chartH)
    } catch {
      // ignore
    }
  }

  // Sol kulak başlığı + grafik kartı
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...blue)
  doc.text('SOL KULAK', margin + chartW + chartGap + chartW / 2, y + 3, { align: 'center' })

  doc.setFillColor(...lightBg)
  doc.setDrawColor(...blue)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin + chartW + chartGap, y + 5, chartW, chartH + 8, 2, 2, 'FD')

  if (leftPng) {
    try {
      doc.addImage(leftPng, 'PNG', margin + chartW + chartGap + 2, y + 7, chartW - 4, chartH)
    } catch {
      // ignore
    }
  }

  y += 5 + chartH + 8 + 4

  // === FREQUENCY TABLE ===
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...dark)
  doc.text('Frekans Değerleri', margin, y)
  y += 4

  const freqCellH = 5.5
  const freqLabelColW = 22
  const freqColW = (contentW - freqLabelColW) / FREQUENCIES.length

  doc.setFillColor(...lightBg)
  doc.setDrawColor(...border)
  doc.setLineWidth(0.2)
  doc.roundedRect(margin, y, contentW, freqCellH, 1.5, 1.5, 'FD')

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(6)
  doc.setTextColor(...slate)
  doc.text('Hz', margin + freqLabelColW / 2, y + 3.8, { align: 'center' })
  FREQUENCIES.forEach((f, i) => {
    doc.text(f, margin + freqLabelColW + i * freqColW + freqColW / 2, y + 3.8, { align: 'center' })
  })

  const drawFreqRow = (
    rowLabel: string,
    rowColor: [number, number, number],
    values: Record<string, number | null>,
    rowY: number,
  ) => {
    doc.setDrawColor(...border)
    doc.setLineWidth(0.2)
    doc.roundedRect(margin, rowY, contentW, freqCellH, 1.5, 1.5, 'S')

    doc.setFont('Roboto', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...rowColor)
    doc.text(rowLabel, margin + freqLabelColW / 2, rowY + 3.8, { align: 'center' })

    doc.setFont('Roboto', 'normal')
    doc.setFontSize(7)
    FREQUENCIES.forEach((f, i) => {
      const val = values[f]
      doc.setTextColor(...rowColor)
      doc.text(val !== null && val !== undefined ? String(val) : '-', margin + freqLabelColW + i * freqColW + freqColW / 2, rowY + 3.8, { align: 'center' })
    })
  }

  let rowY = y + freqCellH
  drawFreqRow('Sağ-Hava', red, data.right.air, rowY)
  rowY += freqCellH
  if (data.includeBone) {
    drawFreqRow('Sağ-Kemik', red, data.right.bone, rowY)
    rowY += freqCellH
  }
  drawFreqRow('Sol-Hava', blue, data.left.air, rowY)
  rowY += freqCellH
  if (data.includeBone) {
    drawFreqRow('Sol-Kemik', blue, data.left.bone, rowY)
    rowY += freqCellH
  }

  y = rowY + 5

  // === SUMMARY TABLE ===
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...dark)
  doc.text('Özet', margin, y)
  y += 4

  const sumCols = ['Kulak', 'Hava Ort.', 'Kemik Ort.', 'Hava-Kemik', 'Sınıflama']
  const sumColWidths = [24, 28, 28, 32, contentW - 112]
  const sumRowH = 7

  doc.setFillColor(...lightBg)
  doc.setDrawColor(...border)
  doc.setLineWidth(0.2)
  doc.roundedRect(margin, y, contentW, sumRowH, 1.5, 1.5, 'FD')

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...slate)
  let sx = margin
  sumCols.forEach((h, i) => {
    doc.text(h, sx + sumColWidths[i] / 2, y + 4.5, { align: 'center' })
    sx += sumColWidths[i]
  })

  y += sumRowH

  const drawSummaryRow = (
    earLabel: string,
    earColor: [number, number, number],
    summary: { airAverage: number | null; boneAverage: number | null; gap: number | null; classification: string },
    rowY: number,
  ) => {
    doc.setDrawColor(...border)
    doc.setLineWidth(0.2)
    doc.roundedRect(margin, rowY, contentW, sumRowH, 1.5, 1.5, 'S')

    doc.setFont('Roboto', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...earColor)
    doc.text(earLabel, margin + sumColWidths[0] / 2, rowY + 4.8, { align: 'center' })

    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...dark)

    const airText = `${summary.airAverage ?? '-'} dB`
    doc.text(airText, margin + sumColWidths[0] + sumColWidths[1] / 2, rowY + 4.8, { align: 'center' })

    const boneText = data.includeBone ? `${summary.boneAverage ?? '-'} dB` : '-'
    doc.text(boneText, margin + sumColWidths[0] + sumColWidths[1] + sumColWidths[2] / 2, rowY + 4.8, { align: 'center' })

    const gapText = summary.gap !== null ? `${summary.gap} dB` : '-'
    doc.text(gapText, margin + sumColWidths[0] + sumColWidths[1] + sumColWidths[2] + sumColWidths[3] / 2, rowY + 4.8, { align: 'center' })

    const classW = sumColWidths[4] - 4
    const classLines = doc.splitTextToSize(summary.classification || 'Veri bekleniyor', classW)
    doc.setFontSize(7.5)
    doc.text(classLines[0], margin + sumColWidths[0] + sumColWidths[1] + sumColWidths[2] + sumColWidths[3] + 2, rowY + 4.8)
  }

  drawSummaryRow('Sağ', red, rightSummary, y)
  y += sumRowH
  drawSummaryRow('Sol', blue, leftSummary, y)
  y += sumRowH + 5

  // === RESULT TEXT ===
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...dark)
  doc.text('Sonuç ve Yorum', margin, y)
  y += 4

  const resultText = data.resultText?.trim() || service.resultText || 'Sonuç girilmedi.'
  doc.setFillColor(...lightBg)
  doc.setDrawColor(...border)
  doc.setLineWidth(0.2)

  const resultLines = doc.splitTextToSize(resultText, contentW - 6)
  const resultLineH = 3.6
  const resultH = Math.max(12, resultLines.length * resultLineH + 5)
  const maxResultH = 40
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

  // Stamp areas: left = Doctor (KBB), right = Audiometrist
  const stampW = 40
  const stampH = 14
  const stampGap = (contentW - stampW * 2) / 3
  const leftStampX = margin + stampGap
  const rightStampX = margin + stampW + stampGap * 2

  // Sol kaşe: Test'e atanmış doktorun kaşesi (her zaman)
  const doctorStamp = getDoctorStampForTest('İşitme Testi (ODYOMETRİ)')
  // Sağ kaşe: Test'e atanmış asistanın kaşesi (kullanıcıdan)
  const assistantStamp = getAssistantStampForTest('İşitme Testi (ODYOMETRİ)')

  if (doctorStamp) {
    try {
      doc.addImage(doctorStamp, 'PNG', leftStampX, y, stampW, stampH)
    } catch {
      // kaşe yüklenemezse geç
    }
  }
  if (assistantStamp) {
    try {
      doc.addImage(assistantStamp, 'PNG', rightStampX, y, stampW, stampH)
    } catch {
      // kaşe yüklenemezse geç
    }
  }

  y += stampH + 5

  // Legal / e-signature notice
  const legalLines = [
    'Bu rapor, 5070 sayılı Elektronik İmza Kanunu çerçevesinde elektronik ortamda onaylanmıştır.',
    'Sonuçlar, güvenli elektronik imza ile doğrulanmıştır.',
    '6331 sayılı İş Sağlığı ve Güvenliği Kanunu ile ilgili yönetmelik hükümleri uyarınca düzenlenmiştir.',
  ]

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...gray)
  let ly = y
  legalLines.forEach((line) => {
    doc.text(line, margin, ly)
    ly += 3.8
  })

  if (existingDoc) {
    return doc
  }
  if (returnBlob) {
    return doc.output('blob')
  }
  // PDF metadata — dosya adı ve başlık
  const safePatient = patient.name.replace(/\s+/g, '_').slice(0, 30)
  const pdfTitle = `Odyometri_${safePatient}_${protocol.protocolNo}`
  doc.setProperties({
    title: pdfTitle,
    subject: 'Odyometri Raporu',
    author: institution.name || 'CETKA',
  })

  const blobUrl = doc.output('bloburl')
  const newWin = window.open(blobUrl, '_blank')
  if (newWin) {
    newWin.document.title = pdfTitle
  }
}
