import { useRef, useState } from 'react'
import { CheckCircle, Eraser, Info, MessageSquare, RotateCcw, Save, X } from 'lucide-react'
import { Modal } from '@/shared/components/ui/Modal'
import { useAuth } from '@/state/AuthContext'
import type { ProtocolService, AudiometryData } from '@/shared/types'

const FREQUENCIES = ['250', '500', '1000', '2000', '3000', '4000', '6000', '8000']

interface AudiometryModalProps {
  isOpen: boolean
  onClose: () => void
  service: ProtocolService | null
  patientName?: string
  patientTc?: string
  patientBirthDate?: string
  patientGender?: string
  company?: string
  protocolNo?: string
  examType?: string
  onSave: (data: string, resultText: string, approve?: boolean) => void
}

const defaultData: AudiometryData = {
  includeBone: false,
  right: { air: {}, bone: {} },
  left: { air: {}, bone: {} },
  resultText: '',
}

function parseAudiometryData(service: ProtocolService | null): AudiometryData {
  if (!service?.audiometryData) return { ...defaultData }
  try {
    return JSON.parse(service.audiometryData) as AudiometryData
  } catch {
    return { ...defaultData }
  }
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

function classifyLossShort(avg: number | null): string {
  if (avg === null) return ''
  if (avg <= 25) return 'normal'
  if (avg <= 40) return 'hafif'
  if (avg <= 55) return 'orta'
  if (avg <= 70) return 'orta-ağır'
  if (avg <= 90) return 'ağır'
  return 'çok ağır'
}

// Konuşma frekansı ortalaması (PTA): 500, 1000, 2000 Hz
function ptaAverage(values: Record<string, number | null>) {
  const ptaFreqs = ['500', '1000', '2000']
  const nums = ptaFreqs.map((f) => values[f]).filter((v) => v !== null && v !== undefined) as number[]
  if (nums.length === 0) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

// Yüksek frekans ortalaması (4000, 6000, 8000 Hz)
function highFreqAverage(values: Record<string, number | null>) {
  const highFreqs = ['4000', '6000', '8000']
  const nums = highFreqs.map((f) => values[f]).filter((v) => v !== null && v !== undefined) as number[]
  if (nums.length === 0) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

// İletim tipi mi (air-bone gap > 15 dB), sensörinöral mı, veya mikst?
function determineLossType(airAvg: number | null, boneAvg: number | null): 'conductive' | 'sensorineural' | 'mixed' | null {
  if (airAvg === null) return null
  if (boneAvg === null) return null
  const gap = airAvg - boneAvg
  if (gap > 15 && boneAvg > 25) return 'mixed'
  if (gap > 15) return 'conductive'
  return 'sensorineural'
}

function lossTypeText(type: 'conductive' | 'sensorineural' | 'mixed' | null): string {
  switch (type) {
    case 'conductive':
      return 'iletim tipi'
    case 'sensorineural':
      return 'sensörinöral tipi'
    case 'mixed':
      return 'mikst (karışık) tipi'
    default:
      return ''
  }
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

function generateComment(data: AudiometryData): string {
  const rightPta = ptaAverage(data.right.air)
  const leftPta = ptaAverage(data.left.air)
  const rightHigh = highFreqAverage(data.right.air)
  const leftHigh = highFreqAverage(data.left.air)
  const rightBonePta = data.includeBone ? ptaAverage(data.right.bone) : null
  const leftBonePta = data.includeBone ? ptaAverage(data.left.bone) : null

  const rightType = determineLossType(rightPta, rightBonePta)
  const leftType = determineLossType(leftPta, leftBonePta)

  const lines: string[] = []

  // --- Sağ kulak ---
  if (rightPta !== null) {
    const loss = classifyLoss(rightPta)

    if (rightPta <= 25) {
      lines.push(`Sağ kulak: Konuşma frekansları (500-2000 Hz) ortalaması ${rightPta} dB HL olup, normal sınırlar içerisindedir.`)
    } else {
      const typeText = lossTypeText(rightType)
      if (typeText) {
        lines.push(`Sağ kulak: Konuşma frekansları ortalaması ${rightPta} dB HL ile ${loss} saptanmıştır (${typeText}).`)
      } else {
        lines.push(`Sağ kulak: Konuşma frekansları ortalaması ${rightPta} dB HL ile ${loss} saptanmıştır.`)
      }
    }

    // Tiz frekans değerlendirmesi
    if (rightHigh !== null && rightHigh > 25) {
      if (rightPta <= 25) {
        lines.push(`Sağ kulakta yüksek frekanslarda (${rightHigh} dB HL) düşüş izlenmekte olup, tiz frekanslarda ${classifyLoss(rightHigh)} mevcuttur.`)
      } else if (rightHigh - rightPta > 15) {
        lines.push(`Sağ kulakta yüksek frekanslarda (${rightHigh} dB HL) konuşma frekanslarına göre belirgin düşüş mevcuttur.`)
      }
    }

    // Air-bone gap analizi
    if (data.includeBone && rightBonePta !== null) {
      const gap = Math.round((rightPta - rightBonePta) * 10) / 10
      if (gap > 15) {
        if (rightBonePta > 25) {
          lines.push(`Sağ kulakta hava-kemik aralığı ${gap} dB olup, mikst tip işitme kaybı bulgusudur (kemik yolu ${rightBonePta} dB HL).`)
        } else {
          lines.push(`Sağ kulakta hava-kemik aralığı ${gap} dB olup, iletim tipi işitme kaybı ile uyumludur (kemik yolu normal sınırlarda).`)
        }
      } else if (rightPta > 25 && rightBonePta > 25) {
        lines.push(`Sağ kulakta hava-kemik aralığı ${gap} dB olup, sensörinöral tip işitme kaybı ile uyumludur.`)
      }
    }
  }

  // --- Sol kulak ---
  if (leftPta !== null) {
    const loss = classifyLoss(leftPta)

    if (leftPta <= 25) {
      lines.push(`Sol kulak: Konuşma frekansları (500-2000 Hz) ortalaması ${leftPta} dB HL olup, normal sınırlar içerisindedir.`)
    } else {
      const typeText = lossTypeText(leftType)
      if (typeText) {
        lines.push(`Sol kulak: Konuşma frekansları ortalaması ${leftPta} dB HL ile ${loss} saptanmıştır (${typeText}).`)
      } else {
        lines.push(`Sol kulak: Konuşma frekansları ortalaması ${leftPta} dB HL ile ${loss} saptanmıştır.`)
      }
    }

    // Tiz frekans değerlendirmesi
    if (leftHigh !== null && leftHigh > 25) {
      if (leftPta <= 25) {
        lines.push(`Sol kulakta yüksek frekanslarda (${leftHigh} dB HL) düşüş izlenmekte olup, tiz frekanslarda ${classifyLoss(leftHigh)} mevcuttur.`)
      } else if (leftHigh - leftPta > 15) {
        lines.push(`Sol kulakta yüksek frekanslarda (${leftHigh} dB HL) konuşma frekanslarına göre belirgin düşüş mevcuttur.`)
      }
    }

    // Air-bone gap analizi
    if (data.includeBone && leftBonePta !== null) {
      const gap = Math.round((leftPta - leftBonePta) * 10) / 10
      if (gap > 15) {
        if (leftBonePta > 25) {
          lines.push(`Sol kulakta hava-kemik aralığı ${gap} dB olup, mikst tip işitme kaybı bulgusudur (kemik yolu ${leftBonePta} dB HL).`)
        } else {
          lines.push(`Sol kulakta hava-kemik aralığı ${gap} dB olup, iletim tipi işitme kaybı ile uyumludur (kemik yolu normal sınırlarda).`)
        }
      } else if (leftPta > 25 && leftBonePta > 25) {
        lines.push(`Sol kulakta hava-kemik aralığı ${gap} dB olup, sensörinöral tip işitme kaybı ile uyumludur.`)
      }
    }
  }

  // --- Asimetri analizi ---
  if (rightPta !== null && leftPta !== null) {
    const asymmetry = Math.abs(rightPta - leftPta)
    if (asymmetry > 15) {
      const worseSide = rightPta > leftPta ? 'sağ' : 'sol'
      lines.push(`İki kulak arasında ${asymmetry} dB asimetri mevcut olup, ${worseSide} kulakta daha belirgin işitme kaybı izlenmektedir.`)
    } else if (rightPta > 25 && leftPta > 25) {
      lines.push('İşitme kaybı her iki kulakta simetrik olarak izlenmektedir (bilateral).')
    } else if (rightPta <= 25 && leftPta <= 25) {
      lines.push('Her iki kulak konuşma frekanslarında simetrik ve normal sınırlar içerisindedir.')
    }
  }

  // --- Genel değerlendirme ve tavsiye ---
  const hasLoss = (rightPta !== null && rightPta > 25) || (leftPta !== null && leftPta > 25)
  const hasHighFreqLoss = (rightHigh !== null && rightHigh > 25) || (leftHigh !== null && leftHigh > 25)

  if (hasLoss || hasHighFreqLoss) {
    const recommendations: string[] = []
    if (rightType === 'conductive' || leftType === 'conductive') {
      recommendations.push('ENT uzmanına başvurması ve ileri radyolojik değerlendirme (temporal BT) önerilir')
    }
    if (rightType === 'sensorineural' || leftType === 'sensorineural') {
      recommendations.push('odyolojik değerlendirme ve işitme cihazı uygunluğu açısından konsültasyon önerilir')
    }
    if (rightType === 'mixed' || leftType === 'mixed') {
      recommendations.push('ileri odyolojik ve ENT değerlendirmesi önerilir')
    }
    if (!data.includeBone && hasLoss) {
      recommendations.push('işitme kaybı tipinin belirlenmesi amacıyla kemik yolu odyometri yapılması önerilir')
    }
    if (hasHighFreqLoss && !hasLoss) {
      recommendations.push('gürültü maruziyeti öyküsü sorgulanması ve periyodik takibi önerilir')
    }

    if (recommendations.length > 0) {
      lines.push(`Öneri: ${recommendations.join('; ')}.`)
    }
  } else if (rightPta !== null || leftPta !== null) {
    lines.push('Sonuç: Odyometrik değerlendirme normal sınırlar içerisindedir. Periyodik işitme taraması önerilir.')
  }

  return lines.join('\n')
}

function generateShortComment(data: AudiometryData): string {
  const rightPta = ptaAverage(data.right.air)
  const leftPta = ptaAverage(data.left.air)
  const rightHigh = highFreqAverage(data.right.air)
  const leftHigh = highFreqAverage(data.left.air)
  const rightBonePta = data.includeBone ? ptaAverage(data.right.bone) : null
  const leftBonePta = data.includeBone ? ptaAverage(data.left.bone) : null

  const parts: string[] = []

  const ears: { side: string; pta: number | null; high: number | null; bone: number | null }[] = [
    { side: 'Sağ', pta: rightPta, high: rightHigh, bone: rightBonePta },
    { side: 'Sol', pta: leftPta, high: leftHigh, bone: leftBonePta },
  ]

  for (const ear of ears) {
    if (ear.pta === null) continue
    const loss = classifyLoss(ear.pta)
    const type = determineLossType(ear.pta, ear.bone)
    const typeText = data.includeBone && type ? ` (${lossTypeText(type)})` : ''

    if (ear.pta <= 25) {
      if (ear.high !== null && ear.high > 25) {
        parts.push(`${ear.side}: Normal, yüksek frekanslarda ${classifyLossShort(ear.high)} düşüş.`)
      } else {
        parts.push(`${ear.side}: Normal.`)
      }
    } else {
      parts.push(`${ear.side}: ${loss}${typeText}`)
    }
  }

  // Asimetri
  if (rightPta !== null && leftPta !== null) {
    const asym = Math.abs(rightPta - leftPta)
    if (asym > 15) {
      const worse = rightPta > leftPta ? 'sağ' : 'sol'
      parts.push(`Asimetrik (${worse} belirgin).`)
    } else if (rightPta > 25 && leftPta > 25) {
      parts.push('Bilateral ve simetrik.')
    }
  }

  // Öneri
  const hasLoss = (rightPta !== null && rightPta > 25) || (leftPta !== null && leftPta > 25)
  const hasHighLoss = (rightHigh !== null && rightHigh > 25) || (leftHigh !== null && leftHigh > 25)
  if (hasLoss) {
    const rightType = determineLossType(rightPta, rightBonePta)
    const leftType = determineLossType(leftPta, leftBonePta)
    if (rightType === 'conductive' || leftType === 'conductive') {
      parts.push('ENT konsültasyonu önerilir.')
    } else if (rightType === 'sensorineural' || leftType === 'sensorineural') {
      parts.push('İşitme cihazı değerlendirmesi önerilir.')
    } else if (rightType === 'mixed' || leftType === 'mixed') {
      parts.push('İleri odyolojik değerlendirme önerilir.')
    } else if (!data.includeBone) {
      parts.push('Kemik yolu odyometri önerilir.')
    }
  } else if (hasHighLoss) {
    parts.push('Gürültü maruziyeti sorgulanmalı, periyodik takip önerilir.')
  } else if (rightPta !== null || leftPta !== null) {
    parts.push('Periyodik tarama önerilir.')
  }

  return parts.join(' ')
}

// Audiogram coordinate system
const CHART_W = 420
const CHART_H = 250
const PAD_L = 36
const PAD_R = 14
const PAD_T = 14
const PAD_B = 48
const PLOT_W = CHART_W - PAD_L - PAD_R
const PLOT_H = CHART_H - PAD_T - PAD_B
const DB_MAX = 110

function freqX(index: number) {
  return PAD_L + (index / (FREQUENCIES.length - 1)) * PLOT_W
}

function dbY(db: number) {
  return PAD_T + (db / DB_MAX) * PLOT_H
}

// Hearing loss severity bands (y ranges in dB)
const LOSS_BANDS = [
  { from: 0, to: 25, fill: '#ecfdf5', label: 'Normal' },
  { from: 25, to: 40, fill: '#fef9c3', label: 'Hafif' },
  { from: 40, to: 55, fill: '#ffedd5', label: 'Orta' },
  { from: 55, to: 70, fill: '#fee2e2', label: 'Orta-Ağır' },
  { from: 70, to: 90, fill: '#fecaca', label: 'Ağır' },
  { from: 90, to: 110, fill: '#fca5a5', label: 'Çok Ağır' },
]

function AudiometryChart({
  data,
  side,
  onChange,
}: {
  data: AudiometryData
  side: 'right' | 'left'
  onChange: (type: 'air' | 'bone', freq: string, value: string) => void
}) {
  const air = side === 'right' ? data.right.air : data.left.air
  const bone = side === 'right' ? data.right.bone : data.left.bone
  const isRight = side === 'right'
  const color = isRight ? '#dc2626' : '#2563eb'

  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ type: 'air' | 'bone'; freq: string } | null>(null)

  const airPoints = FREQUENCIES.map((f, i) => ({ f, i, v: air[f] })).filter((p) => p.v !== null && p.v !== undefined)
  const bonePoints = data.includeBone
    ? FREQUENCIES.map((f, i) => ({ f, i, v: bone[f] })).filter((p) => p.v !== null && p.v !== undefined)
    : []

  const dbTicks = Array.from({ length: 12 }, (_, i) => i * 10)

  // Convert mouse client Y to dB value (0-110, rounded to 5)
  function clientYToDb(clientY: number): number {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    const svgY = ((clientY - rect.top) / rect.height) * CHART_H
    const dbRaw = ((svgY - PAD_T) / PLOT_H) * DB_MAX
    const clamped = Math.min(DB_MAX, Math.max(0, dbRaw))
    return Math.round(clamped / 5) * 5
  }

  // Find nearest frequency index from client X
  function clientXToFreqIndex(clientX: number): number {
    const svg = svgRef.current
    if (!svg) return 0
    const rect = svg.getBoundingClientRect()
    const svgX = ((clientX - rect.left) / rect.width) * CHART_W
    const ratio = (svgX - PAD_L) / PLOT_W
    const clamped = Math.min(1, Math.max(0, ratio))
    return Math.round(clamped * (FREQUENCIES.length - 1))
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    e.preventDefault()
    const db = clientYToDb(e.clientY)
    onChange(dragRef.current.type, dragRef.current.freq, String(db))
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  function handlePlotClick(e: React.PointerEvent) {
    // Click on empty plot area to add/set air point at nearest frequency
    if (dragRef.current) return
    const i = clientXToFreqIndex(e.clientX)
    const db = clientYToDb(e.clientY)
    const freq = FREQUENCIES[i]
    onChange('air', freq, String(db))
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full h-auto touch-none select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Plot background + click target */}
      <rect
        x={PAD_L}
        y={PAD_T}
        width={PLOT_W}
        height={PLOT_H}
        fill="#ffffff"
        onPointerDown={handlePlotClick}
        style={{ cursor: 'crosshair' }}
      />

      {/* Hearing loss severity bands */}
      {LOSS_BANDS.map((band) => {
        const y1 = dbY(band.from)
        const y2 = dbY(band.to)
        return (
          <rect
            key={`band-${band.from}`}
            x={PAD_L}
            y={y1}
            width={PLOT_W}
            height={y2 - y1}
            fill={band.fill}
            opacity={0.35}
          />
        )
      })}

      {/* Horizontal grid lines + dB labels */}
      {dbTicks.map((db) => {
        const y = dbY(db)
        const major = db % 20 === 0
        return (
          <g key={`h-${db}`}>
            <line
              x1={PAD_L}
              y1={y}
              x2={PAD_L + PLOT_W}
              y2={y}
              stroke={major ? '#cbd5e1' : '#e2e8f0'}
              strokeWidth={major ? 1 : 0.5}
              strokeDasharray={major ? '0' : '3,3'}
            />
            <text x={PAD_L - 6} y={y + 3} fontSize="9" textAnchor="end" fill="#64748b">
              {db}
            </text>
          </g>
        )
      })}

      {/* Vertical grid lines + frequency labels + air/bone symbols */}
      {FREQUENCIES.map((f, i) => {
        const x = freqX(i)
        return (
          <g key={`v-${f}`}>
            <line
              x1={x}
              y1={PAD_T}
              x2={x}
              y2={PAD_T + PLOT_H}
              stroke="#e2e8f0"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <text x={x} y={PAD_T + PLOT_H + 13} fontSize="9" textAnchor="middle" fill="#64748b">
              {f}
            </text>
            {/* Air symbol under frequency */}
            {isRight ? (
              <circle cx={x} cy={PAD_T + PLOT_H + 22} r="3.5" fill="white" stroke={color} strokeWidth="1.8" />
            ) : (
              <rect x={x - 3.5} y={PAD_T + PLOT_H + 18.5} width="7" height="7" fill="white" stroke={color} strokeWidth="1.8" />
            )}
            {/* Bone symbol under frequency */}
            {data.includeBone && (
              <text
                x={x}
                y={PAD_T + PLOT_H + 33}
                fontSize="11"
                textAnchor="middle"
                fill={color}
                fontWeight="700"
              >
                {isRight ? '<' : '>'}
              </text>
            )}
          </g>
        )
      })}

      {/* Axis lines */}
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + PLOT_H} stroke="#475569" strokeWidth="1.2" />
      <line x1={PAD_L} y1={PAD_T + PLOT_H} x2={PAD_L + PLOT_W} y2={PAD_T + PLOT_H} stroke="#475569" strokeWidth="1.2" />

      {/* Axis titles */}
      <text x={PAD_L + PLOT_W / 2} y={CHART_H - 4} fontSize="9" textAnchor="middle" fill="#475569" fontWeight="600">
        Frekans (Hz)
      </text>
      <text
        x={12}
        y={PAD_T + PLOT_H / 2}
        fontSize="9"
        textAnchor="middle"
        fill="#475569"
        fontWeight="600"
        transform={`rotate(-90 12 ${PAD_T + PLOT_H / 2})`}
      >
        dB HL
      </text>

      {/* 25 dB normal threshold reference line */}
      <line
        x1={PAD_L}
        y1={dbY(25)}
        x2={PAD_L + PLOT_W}
        y2={dbY(25)}
        stroke="#16a34a"
        strokeWidth="1"
        strokeDasharray="6,3"
        opacity={0.6}
      />

      {/* Bone conduction line */}
      {data.includeBone && bonePoints.length > 1 && (
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeDasharray="5,3"
          points={bonePoints.map((p) => `${freqX(p.i)},${dbY(p.v as number)}`).join(' ')}
        />
      )}

      {/* Air conduction line */}
      {airPoints.length > 1 && (
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          points={airPoints.map((p) => `${freqX(p.i)},${dbY(p.v as number)}`).join(' ')}
        />
      )}

      {/* Air points */}
      {airPoints.map((p) => {
        const cx = freqX(p.i)
        const cy = dbY(p.v as number)
        return (
          <g key={`a-${p.f}`}>
            {isRight ? (
              <circle
                cx={cx}
                cy={cy}
                r="7"
                fill="white"
                stroke={color}
                strokeWidth="2.2"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  dragRef.current = { type: 'air', freq: p.f }
                  ;(e.target as Element).setPointerCapture?.(e.pointerId)
                }}
                style={{ cursor: 'grab' }}
              />
            ) : (
              <g
                transform={`translate(${cx}, ${cy})`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  dragRef.current = { type: 'air', freq: p.f }
                  ;(e.target as Element).setPointerCapture?.(e.pointerId)
                }}
                style={{ cursor: 'grab' }}
              >
                <rect x="-5.5" y="-5.5" width="11" height="11" fill="white" stroke={color} strokeWidth="2.2" />
              </g>
            )}
            <text x={cx} y={cy - 9} fontSize="8" textAnchor="middle" fill={color} fontWeight="600" pointerEvents="none">
              {p.v}
            </text>
          </g>
        )
      })}

      {/* Bone points */}
      {data.includeBone &&
        bonePoints.map((p) => {
          const cx = freqX(p.i)
          const cy = dbY(p.v as number)
          return (
            <g
              key={`b-${p.f}`}
              onPointerDown={(e) => {
                e.stopPropagation()
                dragRef.current = { type: 'bone', freq: p.f }
                ;(e.target as Element).setPointerCapture?.(e.pointerId)
              }}
              style={{ cursor: 'grab' }}
            >
              {isRight ? (
                // Sağ kulak kemik: sola açık <
                <path
                  d={`M ${cx + 6} ${cy - 6} L ${cx} ${cy} L ${cx + 6} ${cy + 6}`}
                  fill="white"
                  fillOpacity={0.8}
                  stroke={color}
                  strokeWidth="2.2"
                />
              ) : (
                // Sol kulak kemik: sağa açık >
                <path
                  d={`M ${cx - 6} ${cy - 6} L ${cx} ${cy} L ${cx - 6} ${cy + 6}`}
                  fill="white"
                  fillOpacity={0.8}
                  stroke={color}
                  strokeWidth="2.2"
                />
              )}
              <text x={cx} y={cy + 14} fontSize="8" textAnchor="middle" fill={color} fontWeight="600" pointerEvents="none">
                {p.v}
              </text>
            </g>
          )
        })}

      {/* Empty state hint */}
      {airPoints.length === 0 && bonePoints.length === 0 && (
        <text
          x={PAD_L + PLOT_W / 2}
          y={PAD_T + PLOT_H / 2}
          fontSize="11"
          textAnchor="middle"
          fill="#94a3b8"
        >
          Ölçüm girilmedi
        </text>
      )}

    </svg>
  )
}

export function AudiometryModal(props: AudiometryModalProps) {
  if (!props.isOpen || !props.service) return null
  return <AudiometryModalContent {...props} service={props.service} />
}

function AudiometryModalContent({
  isOpen,
  onClose,
  service,
  patientName,
  patientTc,
  patientBirthDate,
  patientGender,
  company,
  protocolNo,
  examType,
  onSave,
}: AudiometryModalProps & { service: ProtocolService }) {
  const [data, setData] = useState<AudiometryData>(() => parseAudiometryData(service))
  const { canApproveAudiometry } = useAuth()

  const handleValueChange = (
    side: 'right' | 'left',
    type: 'air' | 'bone',
    freq: string,
    value: string
  ) => {
    const parsed = value === '' ? null : Number(value)
    const num = parsed === null || Number.isNaN(parsed) ? parsed : Math.min(110, Math.max(0, parsed))
    setData((prev) => ({
      ...prev,
      [side]: {
        ...prev[side],
        [type]: {
          ...prev[side][type],
          [freq]: num,
        },
      },
    }))
  }

  const handleSetNormal = () => {
    const air: Record<string, number | null> = {}
    const bone: Record<string, number | null> = {}
    FREQUENCIES.forEach((f) => {
      air[f] = 10
      bone[f] = 10
    })
    setData((prev) => ({
      ...prev,
      includeBone: true,
      right: { air: { ...air }, bone: { ...bone } },
      left: { air: { ...air }, bone: { ...bone } },
      resultText: 'Her iki kulak konuşma frekanslarında ve tiz frekanslarda normal sınırlardadır.',
    }))
  }

  const handleClear = () => {
    setData({ ...defaultData, right: { air: {}, bone: {} }, left: { air: {}, bone: {} } })
  }

  const handleGenerateComment = () => {
    const comment = generateComment(data)
    setData((prev) => ({ ...prev, resultText: comment }))
  }

  const handleGenerateShortComment = () => {
    const comment = generateShortComment(data)
    setData((prev) => ({ ...prev, resultText: comment }))
  }

  const handleSave = (approve?: boolean) => {
    // Kullanıcının yazdığı yorum (resultText) PDF'e aktarılması gereken metindir.
    // Eğer yorum boşsa otomatik özet üretilip kullanılır.
    const autoSummary = `Sağ Hava Ort: ${average(data.right.air) ?? '-'} | Sol Hava Ort: ${average(data.left.air) ?? '-'} dB`
    const resultText = data.resultText?.trim() || autoSummary
    onSave(JSON.stringify(data), resultText, approve)
    onClose()
  }

  const rightSummary = getEarSummary(data, 'right')
  const leftSummary = getEarSummary(data, 'left')
  const rightAirAvg = rightSummary.airAverage
  const rightBoneAvg = rightSummary.boneAverage
  const leftAirAvg = leftSummary.airAverage
  const leftBoneAvg = leftSummary.boneAverage
  const hasMeasurements = rightAirAvg !== null || leftAirAvg !== null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="İşitme Testi (ODYOMETRİ)" size="2xl">
      <div className="space-y-3">
        {/* Patient & protocol info bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-semibold text-slate-800">{patientName ?? '-'}</span>
          </div>
          {patientTc && (
            <div className="flex items-center gap-1 text-slate-600">
              <span className="text-slate-400">TC:</span>
              <span>{patientTc}</span>
            </div>
          )}
          {patientBirthDate && (
            <div className="flex items-center gap-1 text-slate-600">
              <span className="text-slate-400">Doğum:</span>
              <span>{new Date(patientBirthDate).toLocaleDateString('tr-TR')}</span>
            </div>
          )}
          {patientGender && (
            <div className="flex items-center gap-1 text-slate-600">
              <span className="text-slate-400">Cinsiyet:</span>
              <span>{patientGender}</span>
            </div>
          )}
          {company && (
            <div className="flex items-center gap-1 text-slate-600">
              <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
              </svg>
              <span>{company}</span>
            </div>
          )}
          {protocolNo && (
            <div className="flex items-center gap-1 text-slate-600">
              <span className="text-slate-400">Protokol:</span>
              <span className="font-medium text-slate-700">{protocolNo}</span>
            </div>
          )}
          {examType && (
            <div className="flex items-center gap-1 text-slate-600">
              <span className="text-slate-400">Tür:</span>
              <span>{examType}</span>
            </div>
          )}
          {service?.barcode && (
            <div className="flex items-center gap-1 text-slate-600">
              <span className="text-slate-400">Barkod:</span>
              <span className="font-mono font-medium text-slate-700">{service.barcode}</span>
            </div>
          )}
          {service?.processDate && (
            <div className="flex items-center gap-1 text-slate-600">
              <span className="text-slate-400">Tarih:</span>
              <span>{new Date(service.processDate).toLocaleDateString('tr-TR')}</span>
            </div>
          )}
        </div>

        {/* Header actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            dB HL cinsinden, 0–110 aralığı.
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={data.includeBone}
                onChange={(e) => setData((prev) => ({ ...prev, includeBone: e.target.checked }))}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
              />
              Kemik Yolu
            </label>
            <button
              onClick={handleSetNormal}
              type="button"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-slate-600 rounded-md hover:bg-slate-700"
            >
              <RotateCcw className="w-3 h-3" />
              Normal
            </button>
            <button
              onClick={handleClear}
              type="button"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
            >
              <Eraser className="w-3 h-3" />
              Temizle
            </button>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50/60 to-white overflow-hidden">
            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 px-3 py-2">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.5 2 5.5 4.2 4.3 7.3c-.4 1 .4 2 1.5 2 .7 0 1.3-.4 1.6-1C8.3 6.6 10 5.5 12 5.5s3.7 1.1 4.6 2.8c.3.6.9 1 1.6 1 1.1 0 1.9-1 1.5-2C18.5 4.2 15.5 2 12 2zm0 5.5c-2.5 0-4.5 2-4.5 4.5v6c0 1.4 1.1 2.5 2.5 2.5h4c1.4 0 2.5-1.1 2.5-2.5v-6c0-2.5-2-4.5-4.5-4.5z"/>
              </svg>
              <h3 className="text-sm font-bold text-white tracking-wide drop-shadow-sm">SAĞ KULAK AUDİOGRAM</h3>
            </div>
            <div className="px-1.5 py-1">
              <AudiometryChart data={data} side="right" onChange={(type, freq, value) => handleValueChange('right', type, freq, value)} />
            </div>
          </div>

          <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/60 to-white overflow-hidden">
            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.5 2 5.5 4.2 4.3 7.3c-.4 1 .4 2 1.5 2 .7 0 1.3-.4 1.6-1C8.3 6.6 10 5.5 12 5.5s3.7 1.1 4.6 2.8c.3.6.9 1 1.6 1 1.1 0 1.9-1 1.5-2C18.5 4.2 15.5 2 12 2zm0 5.5c-2.5 0-4.5 2-4.5 4.5v6c0 1.4 1.1 2.5 2.5 2.5h4c1.4 0 2.5-1.1 2.5-2.5v-6c0-2.5-2-4.5-4.5-4.5z"/>
              </svg>
              <h3 className="text-sm font-bold text-white tracking-wide drop-shadow-sm">SOL KULAK AUDİOGRAM</h3>
            </div>
            <div className="px-1.5 py-1">
              <AudiometryChart data={data} side="left" onChange={(type, freq, value) => handleValueChange('left', type, freq, value)} />
            </div>
          </div>
        </div>

        {/* Compact summary - single row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { label: 'Sağ', color: 'red', summary: rightSummary },
            { label: 'Sol', color: 'blue', summary: leftSummary },
          ].map(({ label, color, summary }) => (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${color === 'red' ? 'border-red-100 bg-red-50' : 'border-blue-100 bg-blue-50'}`}
            >
              <span className={`text-xs font-bold ${color === 'red' ? 'text-red-700' : 'text-blue-700'} shrink-0`}>
                {label}
              </span>
              <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-600">
                <span>
                  Hava: <strong className="text-slate-800">{summary.airAverage ?? '-'}</strong> dB
                </span>
                <span className={data.includeBone ? '' : 'opacity-40'}>
                  Kemik: <strong className="text-slate-800">{data.includeBone ? (summary.boneAverage ?? '-') : '-'}</strong> dB
                </span>
                <span className={summary.gap !== null ? '' : 'opacity-40'}>
                  Açık: <strong className="text-slate-800">{summary.gap ?? '-'}</strong> dB
                </span>
                <span className={`font-semibold ${color === 'red' ? 'text-red-700' : 'text-blue-700'}`}>
                  {summary.classification || 'Veri bekleniyor'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Input tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AudiometryInputTable
            title="Sağ"
            color="red"
            data={data}
            side="right"
            onChange={handleValueChange}
            airAvg={rightAirAvg}
            boneAvg={rightBoneAvg}
          />
          <AudiometryInputTable
            title="Sol"
            color="blue"
            data={data}
            side="left"
            onChange={handleValueChange}
            airAvg={leftAirAvg}
            boneAvg={leftBoneAvg}
          />
        </div>

        {/* Result text */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-700">Sonuç</label>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleGenerateShortComment}
                disabled={!hasMeasurements}
                type="button"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Kısa, net yorum"
              >
                <MessageSquare className="w-3 h-3" />
                Kısa Yorumla
              </button>
              <button
                onClick={handleGenerateComment}
                disabled={!hasMeasurements}
                type="button"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Detaylı profesyonel yorum"
              >
                <MessageSquare className="w-3 h-3" />
                Detaylı Yorumla
              </button>
            </div>
          </div>
          {!hasMeasurements && (
            <div className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] text-amber-700">
              <Info className="w-3 h-3 shrink-0" />
              En az bir hava yolu ölçümü girin.
            </div>
          )}
          <textarea
            value={data.resultText}
            onChange={(e) => setData((prev) => ({ ...prev, resultText: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 text-xs leading-relaxed border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Sonuç yorumu..."
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-1.5 pt-1">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            <X className="w-3.5 h-3.5" />
            Vazgeç
          </button>
          <button
            onClick={() => handleSave()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Save className="w-3.5 h-3.5" />
            Kaydet
          </button>
          {canApproveAudiometry && (
            <button
              onClick={() => handleSave(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Kaydet ve Onayla
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function AudiometryInputTable({
  title,
  color,
  data,
  side,
  onChange,
  airAvg,
  boneAvg,
}: {
  title: string
  color: 'red' | 'blue'
  data: AudiometryData
  side: 'right' | 'left'
  onChange: (side: 'right' | 'left', type: 'air' | 'bone', freq: string, value: string) => void
  airAvg: number | null
  boneAvg: number | null
}) {
  const air = side === 'right' ? data.right.air : data.left.air
  const bone = side === 'right' ? data.right.bone : data.left.bone
  const textColor = color === 'red' ? 'text-red-500' : 'text-blue-500'
  const inputClass = `w-9 px-0.5 py-0.5 text-center text-[11px] border rounded ${color === 'red' ? 'border-red-200 focus:border-red-500 focus:ring-red-500' : 'border-blue-200 focus:border-blue-500 focus:ring-blue-500'}`
  const boneInputClass = data.includeBone
    ? inputClass
    : `w-9 px-0.5 py-0.5 text-center text-[11px] border rounded bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed`

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr>
            <th className="px-1 py-0.5 text-left font-medium text-slate-700">{title}</th>
            {FREQUENCIES.map((f) => (
              <th key={f} className={`px-0.5 py-0.5 text-center font-medium ${textColor}`}>
                {f}
              </th>
            ))}
            <th className="px-1 py-0.5 text-center font-medium text-slate-700">Ort.</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-1 py-0.5 text-slate-600">Hava</td>
            {FREQUENCIES.map((f) => (
              <td key={`air-${f}`} className="px-0.5 py-0.5">
                <input
                  type="number"
                  min="0"
                  max="110"
                  step="5"
                  aria-label={`${title} kulak hava ${f} Hz dB HL`}
                  value={air[f] ?? ''}
                  onChange={(e) => onChange(side, 'air', f, e.target.value)}
                  className={inputClass}
                />
              </td>
            ))}
            <td className="px-1 py-0.5 text-center font-semibold text-slate-700 bg-slate-100 rounded">{airAvg ?? '-'}</td>
          </tr>
          <tr className={data.includeBone ? '' : 'opacity-50'}>
            <td className="px-1 py-0.5 text-slate-600">Kemik</td>
            {FREQUENCIES.map((f) => (
              <td key={`bone-${f}`} className="px-0.5 py-0.5">
                <input
                  type="number"
                  min="0"
                  max="110"
                  step="5"
                  disabled={!data.includeBone}
                  aria-label={`${title} kulak kemik ${f} Hz dB HL`}
                  value={data.includeBone ? (bone[f] ?? '') : ''}
                  onChange={(e) => onChange(side, 'bone', f, e.target.value)}
                  className={boneInputClass}
                />
              </td>
            ))}
            <td className="px-1 py-0.5 text-center font-semibold text-slate-700 bg-slate-100 rounded">
              {data.includeBone ? (boneAvg ?? '-') : '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
