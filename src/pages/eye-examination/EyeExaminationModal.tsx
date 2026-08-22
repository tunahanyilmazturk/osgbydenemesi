import { useEffect, useState } from 'react'
import { CheckCircle, ClipboardList, Eraser, MessageSquare, Plus, Save, Trash2, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import type { ProtocolService, EyeExaminationData } from '../../types'

const TEMPLATE_STORAGE_KEY = 'cetka-eye-templates'

type TemplateCategory = 'evaluation' | 'diagnosis' | 'resultText'

interface Template {
  id: string
  category: TemplateCategory
  text: string
}

function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Template[]
  } catch {
    // ignore
  }
  return []
}

function saveTemplates(templates: Template[]): void {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates))
}

interface EyeExaminationModalProps {
  isOpen: boolean
  onClose: () => void
  service: ProtocolService | null
  onSave: (data: string, resultText: string, approve?: boolean) => void
}

const defaultData: EyeExaminationData = {
  examinationMode: 'otorefraktometre',
  rightEye: { sph: '', cyl: '', ax: '', visualAcuity: '', visualAcuityWithGlasses: '', eyePressure: '' },
  leftEye: { sph: '', cyl: '', ax: '', visualAcuity: '', visualAcuityWithGlasses: '', eyePressure: '' },
  colorBlindness: 'Yoktur',
  needsGlasses: 'İşaretsiz',
  nightBlindness: 'İşaretsiz',
  screenUsage: 'İşaretsiz',
  highAltitude: 'İşaretsiz',
  extraFindings: [],
  evaluation: '',
  diagnosis: '',
  conclusion: '',
  resultStatus: 'Sonuç Normal',
  resultText: '',
}

const EMPTY_EYE_FIELDS = { sph: '', cyl: '', ax: '', visualAcuity: '', visualAcuityWithGlasses: '', eyePressure: '' }

const EYE_FIELDS: { key: keyof EyeExaminationData['rightEye']; label: string; placeholder?: string }[] = [
  { key: 'sph', label: 'Sph.' },
  { key: 'cyl', label: 'Cyl.' },
  { key: 'ax', label: 'Ax.' },
  { key: 'visualAcuity', label: 'Görme Keskinliği', placeholder: 'örn. 1.0' },
  { key: 'visualAcuityWithGlasses', label: 'Keskinlik (Gözlüklü/Lensli)', placeholder: 'örn. 1.0' },
  { key: 'eyePressure', label: 'Göz Tansiyonu (mmHg)', placeholder: 'örn. 14' },
]

const TRIO_OPTIONS = [
  { key: 'colorBlindness' as const, label: 'Renk Körlüğü', values: ['Yoktur', 'Vardır', 'İşaretsiz'] },
  { key: 'needsGlasses' as const, label: 'Gözlük İhtiyacı', values: ['Yoktur', 'Vardır', 'İşaretsiz'] },
  { key: 'nightBlindness' as const, label: 'Gece Körlüğü', values: ['Yoktur', 'Vardır', 'İşaretsiz'] },
  { key: 'highAltitude' as const, label: 'Yüksekte Çalışma Sakıncası', values: ['Yoktur', 'Vardır', 'İşaretsiz'] },
]

const SCREEN_OPTIONS = { key: 'screenUsage' as const, label: 'Ekranlı Araçlarda', values: ['Çalışabilir', 'Çalışamaz', 'İşaretsiz'] }

const EXTRA_FINDING_OPTIONS: { label: string; values: string[] }[] = [
  { label: 'Araç Kullanma Yeterliliği', values: ['Evet', 'Hayır', 'İşaretsiz'] },
  { label: 'Göz Kayması (Strabismus)', values: ['Yoktur', 'Vardır', 'İşaretsiz'] },
  { label: 'Görme Alanı', values: ['Normal', 'Daralmış', 'İşaretsiz'] },
  { label: 'Koruyucu Gözlük İhtiyacı', values: ['Evet', 'Hayır', 'İşaretsiz'] },
  { label: 'Gece Görüşü Yeterliliği', values: ['Yeterli', 'Yetersiz', 'İşaretsiz'] },
  { label: 'Diplopi (Çift Görme)', values: ['Yoktur', 'Vardır', 'İşaretsiz'] },
  { label: 'Göz Kapağı/İltihap', values: ['Yoktur', 'Vardır', 'İşaretsiz'] },
  { label: 'Göz Dibi (Fundus)', values: ['Normal', 'Anormal', 'İşaretsiz'] },
]

function parseEyeExaminationData(service: ProtocolService | null): EyeExaminationData {
  if (!service?.eyeExaminationData) return { ...defaultData }
  try {
    return JSON.parse(service.eyeExaminationData) as EyeExaminationData
  } catch {
    return { ...defaultData }
  }
}

// === Refraksiyon analiz yardımcı fonksiyonları ===

function parseNum(val: string | undefined): number | null {
  if (!val || val.trim() === '' || val.trim() === '-') return null
  const n = parseFloat(val.replace(',', '.'))
  return isNaN(n) ? null : n
}

function fmtNum(n: number | null): string {
  if (n === null) return '-'
  const s = n.toFixed(2).replace(/\.?0+$/, '')
  return n > 0 ? `+${s}` : s
}

// SPH + 1/2 CYL → Sferik Eşdeğer (SE)
function sphericalEquivalent(sph: number | null, cyl: number | null): number | null {
  if (sph === null) return null
  if (cyl === null) return sph
  return sph + cyl / 2
}

// Kırma kusuru sınıflandırması
function classifyRefraction(sph: number | null, cyl: number | null): string {
  const se = sphericalEquivalent(sph, cyl)
  const absCyl = cyl !== null ? Math.abs(cyl) : 0
  const parts: string[] = []

  // Astigmatizm sınıflandırması (önce, çünkü astigmatizm bağımsız olabilir)
  if (absCyl >= 0.25 && absCyl < 0.75) {
    parts.push('hafif derecede astigmatizm')
  } else if (absCyl >= 0.75 && absCyl < 1.50) {
    parts.push('orta derecede astigmatizm')
  } else if (absCyl >= 1.50 && absCyl < 2.50) {
    parts.push('ileri derecede astigmatizm')
  } else if (absCyl >= 2.50) {
    parts.push('yüksek derecede astigmatizm')
  }

  // Sferik kırma kusuru (SE'ye göre)
  if (se !== null) {
    const absSe = Math.abs(se)
    if (se > 0.25) {
      // Hipermetropi
      if (absSe <= 0.50) parts.push('hafif derecede hipermetropi')
      else if (absSe <= 2.00) parts.push('orta derecede hipermetropi')
      else if (absSe <= 4.00) parts.push('ileri derecede hipermetropi')
      else parts.push('yüksek derecede hipermetropi')
    } else if (se < -0.25) {
      // Miyopi
      if (absSe <= 0.50) parts.push('hafif derecede miyopi')
      else if (absSe <= 3.00) parts.push('orta derecede miyopi')
      else if (absSe <= 6.00) parts.push('ileri derecede miyopi')
      else parts.push('yüksek derecede miyopi')
    } else if (absCyl < 0.25) {
      parts.push('emetropi (normal kırma)')
    }
  } else if (absCyl >= 0.25) {
    // Sadece astigmatizm var, SPH boş
    // Yukarıda zaten eklendi
  }

  return parts.length > 0 ? parts.join(' ve ') : 'kırma kusuru saptanmadı (emetropi)'
}

// Astigmatizm tipini belirle (AX değerine göre)
function astigmatismType(cyl: number | null, ax: number | null): string | null {
  if (cyl === null || Math.abs(cyl) < 0.25) return null
  if (ax === null) return null
  // 0-30 veya 150-180 arası → with-the-rule (WTR), 60-120 → against-the-rule (ATR), diğerleri oblik
  if ((ax >= 0 && ax <= 30) || (ax >= 150 && ax <= 180)) {
    return 'with-the-rule (kurallara uygun) astigmatizm'
  } else if (ax >= 60 && ax <= 120) {
    return 'against-the-rule (kurallara ters) astigmatizm'
  } else {
    return 'oblik astigmatizm'
  }
}

// Görme keskinliği değerlendirmesi
function evaluateVisualAcuity(va: string | undefined): { text: string; isNormal: boolean } {
  if (!va || va.trim() === '') return { text: 'ölçülmedi', isNormal: false }
  const lower = va.trim().toLowerCase()
  // 10/10, 20/20, 1.0, 5/5 → normal
  if (lower === '10/10' || lower === '20/20' || lower === '1.0' || lower === '5/5' || lower === '1,0') {
    return { text: va, isNormal: true }
  }
  // 9/10, 8/10 vb → hafif düşük
  const match = lower.match(/(\d+)\/(\d+)/)
  if (match) {
    const num = parseInt(match[1])
    const den = parseInt(match[2])
    if (den > 0) {
      const ratio = num / den
      if (ratio >= 0.9) return { text: `${va} (normal sınırlarda)`, isNormal: true }
      if (ratio >= 0.5) return { text: `${va} (orta derecede düşük)`, isNormal: false }
      return { text: `${va} (ileri derecede düşük)`, isNormal: false }
    }
  }
  return { text: va, isNormal: false }
}

// Tek göz için detaylı refraksiyon yorumu
function analyzeEye(eye: EyeExaminationData['rightEye'], sideName: string): { summary: string; detail: string; isAbnormal: boolean } {
  const sph = parseNum(eye.sph)
  const cyl = parseNum(eye.cyl)
  const ax = parseNum(eye.ax)
  const va = evaluateVisualAcuity(eye.visualAcuity)
  const se = sphericalEquivalent(sph, cyl)
  const classification = classifyRefraction(sph, cyl)
  const astigType = astigmatismType(cyl, ax)

  const hasData = sph !== null || cyl !== null || ax !== null || eye.visualAcuity
  if (!hasData) {
  return { summary: `${sideName} ölçüm yapılmadı`, detail: '', isAbnormal: false }
  }

  // Özet satır: parametreler
  const params = `Sph: ${fmtNum(sph)}, Cyl: ${fmtNum(cyl)}, Ax: ${ax !== null ? ax.toFixed(0) + '°' : '-'}, Görme: ${va.text}`
  const seText = se !== null ? ` (SE: ${fmtNum(se)})` : ''

  // Detaylı yorum
  let detail = `${sideName} otorefraktometrik ölçümünde ${classification}`
  if (astigType) {
    detail += `, ${astigType} (${ax !== null ? ax.toFixed(0) + '°' : 'eksen belirsiz'})`
  }
  if (se !== null) {
    detail += `. Sferik eşdeğer ${fmtNum(se)} D`
  }
  detail += `. Görme keskinliği ${va.text}`

  // Gözlük ihtiyacı değerlendirmesi
  const needsCorrection =
    (se !== null && Math.abs(se) >= 0.50) ||
    (cyl !== null && Math.abs(cyl) >= 0.75)

  if (needsCorrection) {
    detail += '. Mevcut kırma kusuru düzeltici lens/gözlük kullanımını gerektirmektedir'
  } else if (se !== null || cyl !== null) {
    if (Math.abs(se ?? 0) < 0.50 && Math.abs(cyl ?? 0) < 0.75) {
      detail += '. Mevcut değerler düzeltici lens gerektirmeyecek düzeydedir'
    }
  }

  const isAbnormal = !va.isNormal || needsCorrection || (cyl !== null && Math.abs(cyl) >= 1.50)

  return {
    summary: `${sideName}: ${params}${seText}`,
    detail,
    isAbnormal,
  }
}

function generateComment(data: EyeExaminationData): string {
  const paragraphs: string[] = []
  const isEshel = data.examinationMode === 'eshel'

  // === 1. GÖRME KESKİNLİĞİ (ve refraksiyon — otorefraktometre modunda) ===
  const rightAnalysis = analyzeEye(data.rightEye, 'Sağ göz')
  const leftAnalysis = analyzeEye(data.leftEye, 'Sol göz')
  const hasRightData = data.rightEye.sph || data.rightEye.cyl || data.rightEye.ax || data.rightEye.visualAcuity
  const hasLeftData = data.leftEye.sph || data.leftEye.cyl || data.leftEye.ax || data.leftEye.visualAcuity

  if (isEshel) {
    // === EŞHEL OKUTMA MODU — sadece görme keskinliği ===
    const eyeParts: string[] = []
    const rightVA = evaluateVisualAcuity(data.rightEye.visualAcuity)
    const leftVA = evaluateVisualAcuity(data.leftEye.visualAcuity)

    if (data.rightEye.visualAcuity) {
      eyeParts.push(`sağ gözde görme keskinliği ${rightVA.text}`)
    }
    if (data.leftEye.visualAcuity) {
      eyeParts.push(`sol gözde görme keskinliği ${leftVA.text}`)
    }
    if (eyeParts.length > 0) {
      paragraphs.push(`Eşhel (Snellen) chart ile yapılan görme keskinliği ölçümünde ${eyeParts.join(', ')}.`)
    }

    // Gözlükle düzeltilmiş görme
    const glassesParts: string[] = []
    if (data.rightEye.visualAcuityWithGlasses) {
      const va = evaluateVisualAcuity(data.rightEye.visualAcuityWithGlasses)
      glassesParts.push(`sağ gözde gözlükle ${va.text}`)
    }
    if (data.leftEye.visualAcuityWithGlasses) {
      const va = evaluateVisualAcuity(data.leftEye.visualAcuityWithGlasses)
      glassesParts.push(`sol gözde gözlükle ${va.text}`)
    }
    if (glassesParts.length > 0) {
      paragraphs.push(`Düzeltici lens ile görme keskinliği ${glassesParts.join(', ')} olarak ölçülmüştür.`)
    }

    // Değerlendirme
    const bothNormal = rightVA.isNormal && leftVA.isNormal
    const anyAbnormal = !rightVA.isNormal || !leftVA.isNormal
    if (bothNormal && data.rightEye.visualAcuity && data.leftEye.visualAcuity) {
      paragraphs.push('Her iki gözde görme keskinliği normal sınırlar içinde değerlendirilmiştir.')
    } else if (anyAbnormal) {
      const abnormalEyes: string[] = []
      if (data.rightEye.visualAcuity && !rightVA.isNormal) abnormalEyes.push('sağ gözde')
      if (data.leftEye.visualAcuity && !leftVA.isNormal) abnormalEyes.push('sol gözde')
      paragraphs.push(`${abnormalEyes.join(' ve ')} görme keskinliği normal sınırların altındadır. Mevcut durum iş sağlığı ve güvenliği açısından değerlendirilmesi gerekmektedir.`)
    }
  } else if (hasRightData || hasLeftData) {
    // === OTOREFRAKTOMETRE MODU ===
    const refractionParts: string[] = []
    if (hasRightData) refractionParts.push(rightAnalysis.detail)
    if (hasLeftData) refractionParts.push(leftAnalysis.detail)
    paragraphs.push(refractionParts.join('. '))

    // Anizometropi kontrolü (iki göz arasındaki SE farkı)
    const rightSE = sphericalEquivalent(parseNum(data.rightEye.sph), parseNum(data.rightEye.cyl))
    const leftSE = sphericalEquivalent(parseNum(data.leftEye.sph), parseNum(data.leftEye.cyl))
    if (rightSE !== null && leftSE !== null) {
      const diff = Math.abs(rightSE - leftSE)
      if (diff >= 1.00) {
        paragraphs.push(`İki göz arasındaki sferik eşdeğer farkı ${fmtNum(diff)} D olup, anizometropi mevcuttur. Bu durum düzeltici lens reçete edilirken dikkatli olunmasını gerektirir.`)
      } else if (diff >= 0.50) {
        paragraphs.push(`İki göz arasındaki sferik eşdeğer farkı ${fmtNum(diff)} D olup, hafif anizometropi mevcuttur.`)
      }
    }

    // Genel kırma özeti
    const anyAbnormal = rightAnalysis.isAbnormal || leftAnalysis.isAbnormal
    if (anyAbnormal) {
      const abnormalEyes: string[] = []
      if (rightAnalysis.isAbnormal) abnormalEyes.push('sağ gözde')
      if (leftAnalysis.isAbnormal) abnormalEyes.push('sol gözde')
      paragraphs.push(`Özetle, ${abnormalEyes.join(' ve ')} kırma kusuru ve/veya görme keskinliği açısından değerlendirme gerektirmektedir.`)
    } else if (hasRightData && hasLeftData) {
      paragraphs.push('Her iki gözde kırma kusuru ve görme keskinliği normal sınırlar içinde değerlendirilmiştir.')
    }
  }

  // === 2. GÖZ TANSİYONU ===
  if (data.rightEye.eyePressure || data.leftEye.eyePressure) {
    const rPressure = data.rightEye.eyePressure ? Number(data.rightEye.eyePressure) : null
    const lPressure = data.leftEye.eyePressure ? Number(data.leftEye.eyePressure) : null
    const pressures: string[] = []
    if (rPressure !== null) pressures.push(`sağ göz ${data.rightEye.eyePressure} mmHg`)
    if (lPressure !== null) pressures.push(`sol göz ${data.leftEye.eyePressure} mmHg`)
    const isNormal = (rPressure === null || (rPressure >= 10 && rPressure <= 21)) && (lPressure === null || (lPressure >= 10 && lPressure <= 21))
    const pressureDiff = rPressure !== null && lPressure !== null ? Math.abs(rPressure - lPressure) : null
    let pressureText = `Göz içi basıncı (GİB) ölçümünde ${pressures.join(', ')} saptanmıştır. ${isNormal ? 'Değerler normal sınırlar (10-21 mmHg) arasındadır.' : 'Değerler normal sınırların dışındadır, ileri oftalmolojik değerlendirme önerilir.'}`
    if (pressureDiff !== null && pressureDiff >= 3) {
      pressureText += ` İki göz arasındaki basınç farkı ${pressureDiff} mmHg olup, asimetri açısından takip edilmesi önerilir.`
    }
    paragraphs.push(pressureText)
  }

  // === 3. BULGULAR (Klinik) ===
  const findings: string[] = []
  if (data.colorBlindness === 'Vardır') findings.push('renk körlüğü mevcut')
  if (data.needsGlasses === 'Vardır') findings.push('gözlük ihtiyacı bulunmakta')
  if (data.nightBlindness === 'Vardır') findings.push('gece körlüğü saptanmış')
  if (data.screenUsage === 'Çalışamaz') findings.push('ekranlı araçlarda çalışmasında sakınca')
  if (data.highAltitude === 'Vardır') findings.push('yüksekte çalışmasında göz muayenesi açısından sakınca')

  ;(data.extraFindings ?? []).forEach((f) => {
    if (f.value === 'İşaretsiz') return
    const label = f.label.toLowerCase()
    if (f.value === 'Vardır' || f.value === 'Hayır' || f.value === 'Yetersiz' || f.value === 'Anormal' || f.value === 'Daralmış') {
      findings.push(`${label} açısından ${f.value.toLowerCase()}`)
    } else if (f.value === 'Yoktur' || f.value === 'Evet' || f.value === 'Yeterli' || f.value === 'Normal') {
      findings.push(`${label} açısından ${f.value.toLowerCase()}`)
    } else {
      findings.push(`${label}: ${f.value.toLowerCase()}`)
    }
  })

  if (findings.length > 0) {
    const negativeFindings = findings.filter((f) => f.includes('sakınca') || f.includes('yoktur') === false && (f.includes('vardır') || f.includes('hayır') || f.includes('yetersiz') || f.includes('anormal') || f.includes('daralmış') || f.includes('mevcut') || f.includes('bulunmakta') || f.includes('saptanmış') || f.includes('çalışamaz')))
    const positiveFindings = findings.filter((f) => !negativeFindings.includes(f))

    if (negativeFindings.length > 0) {
      paragraphs.push(`Klinik bulgularda ${negativeFindings.join(', ')} tespit edilmiştir.`)
    }
    if (positiveFindings.length > 0) {
      paragraphs.push(`Diğer değerlendirmelerde ${positiveFindings.join(', ')}.`)
    }
  } else {
    const allClear = data.colorBlindness === 'Yoktur' && data.needsGlasses === 'Yoktur' && data.nightBlindness === 'Yoktur' && data.screenUsage === 'Çalışabilir' && data.highAltitude === 'Yoktur'
    if (allClear) {
      paragraphs.push('Klinik bulgular açısından renk körlüğü, gece körlüğü, gözlük ihtiyacı, ekranlı araçlarda çalışma ve yüksekte çalışma durumlarında sakınca saptanmamıştır.')
    }
  }

  // === 4. DEĞERLENDİRME ===
  if (data.evaluation.trim()) {
    paragraphs.push(`Değerlendirme: ${data.evaluation.trim()}`)
  }

  // === 5. TANI ===
  if (data.diagnosis.trim()) {
    paragraphs.push(`Tanı: ${data.diagnosis.trim()}`)
  }

  // === 6. SONUÇ ===
  const hasAbnormal = findings.some((f) => f.includes('sakınca') || f.includes('vardır') || f.includes('hayır') || f.includes('yetersiz') || f.includes('anormal') || f.includes('daralmış') || f.includes('mevcut') || f.includes('bulunmakta') || f.includes('saptanmış') || f.includes('çalışamaz'))
  const hasRefractionAbnormal = isEshel
    ? (!evaluateVisualAcuity(data.rightEye.visualAcuity).isNormal || !evaluateVisualAcuity(data.leftEye.visualAcuity).isNormal)
    : (rightAnalysis.isAbnormal || leftAnalysis.isAbnormal)
  const hasConclusion = data.conclusion.trim()

  if (hasConclusion) {
    paragraphs.push(`Sonuç: ${data.conclusion.trim()}`)
  } else if (hasAbnormal || hasRefractionAbnormal) {
    paragraphs.push('Sonuç: Mevcut bulgular ışığında iş sağlığı ve güvenliği açısından uygun olmayan durumlar mevcuttur. Detaylı oftalmolojik değerlendirme için ilgili uzmana yönlendirilmesi önerilir.')
  } else if (paragraphs.length > 0) {
    const examText = isEshel ? 'Eşhel chart ile yapılan görme muayenesi' : 'otorefraktometrik muayene'
    paragraphs.push(`Sonuç: Yapılan ${examText} ve klinik bulgular ışığında iş sağlığı ve güvenliği açısından sakıncalı bir durum saptanmamıştır. Mevcut görevinde çalışmasında göz muayenesi açısından sakınca yoktur.`)
  }

  if (paragraphs.length === 0) return 'Göz taraması değerlendirmesi yapıldı.'
  return paragraphs.join('\n\n')
}

// === KISA YORUM — özet, profesyonel, tek paragraf ===
function generateShortComment(data: EyeExaminationData): string {
  const parts: string[] = []
  const isEshel = data.examinationMode === 'eshel'

  if (isEshel) {
    // === EŞHEL MODU — sadece görme keskinliği ===
    const rightVA = evaluateVisualAcuity(data.rightEye.visualAcuity)
    const leftVA = evaluateVisualAcuity(data.leftEye.visualAcuity)
    const eyeParts: string[] = []
    if (data.rightEye.visualAcuity) eyeParts.push(`sağ göz görme ${rightVA.text}`)
    if (data.leftEye.visualAcuity) eyeParts.push(`sol göz görme ${leftVA.text}`)
    if (eyeParts.length > 0) {
      parts.push(`Eşhel chart ile ${eyeParts.join(', ')}`)
    }
  } else {
    // === OTOREFRAKTOMETRE MODU ===
    const hasRightData = data.rightEye.sph || data.rightEye.cyl || data.rightEye.ax || data.rightEye.visualAcuity
    const hasLeftData = data.leftEye.sph || data.leftEye.cyl || data.leftEye.ax || data.leftEye.visualAcuity

    if (hasRightData || hasLeftData) {
      const eyeParts: string[] = []
      if (hasRightData) {
        const sph = parseNum(data.rightEye.sph)
        const cyl = parseNum(data.rightEye.cyl)
        const se = sphericalEquivalent(sph, cyl)
        const cls = classifyRefraction(sph, cyl)
        const va = evaluateVisualAcuity(data.rightEye.visualAcuity)
        eyeParts.push(`sağ gözde ${cls}${se !== null ? ` (SE ${fmtNum(se)} D)` : ''}, görme ${va.text}`)
      }
      if (hasLeftData) {
        const sph = parseNum(data.leftEye.sph)
        const cyl = parseNum(data.leftEye.cyl)
        const se = sphericalEquivalent(sph, cyl)
        const cls = classifyRefraction(sph, cyl)
        const va = evaluateVisualAcuity(data.leftEye.visualAcuity)
        eyeParts.push(`sol gözde ${cls}${se !== null ? ` (SE ${fmtNum(se)} D)` : ''}, görme ${va.text}`)
      }
      parts.push(`Otorefraktometrede ${eyeParts.join('; ')}`)
    }
  }

  // Göz tansiyonu özeti
  if (data.rightEye.eyePressure || data.leftEye.eyePressure) {
    const rP = data.rightEye.eyePressure ? Number(data.rightEye.eyePressure) : null
    const lP = data.leftEye.eyePressure ? Number(data.leftEye.eyePressure) : null
    const pStr: string[] = []
    if (rP !== null) pStr.push(`Sağ ${data.rightEye.eyePressure} mmHg`)
    if (lP !== null) pStr.push(`Sol ${data.leftEye.eyePressure} mmHg`)
    const isNormal = (rP === null || (rP >= 10 && rP <= 21)) && (lP === null || (lP >= 10 && lP <= 21))
    parts.push(`GİB: ${pStr.join(', ')}${isNormal ? ' (normal)' : ' (yüksek)'}`)
  }

  // Bulgular özeti
  const abnormalFindings: string[] = []
  if (data.colorBlindness === 'Vardır') abnormalFindings.push('renk körlüğü')
  if (data.needsGlasses === 'Vardır') abnormalFindings.push('gözlük ihtiyacı')
  if (data.nightBlindness === 'Vardır') abnormalFindings.push('gece körlüğü')
  if (data.screenUsage === 'Çalışamaz') abnormalFindings.push('ekranlı araç kullanım kısıtı')
  if (data.highAltitude === 'Vardır') abnormalFindings.push('yüksekte çalışma kısıtı')

  ;(data.extraFindings ?? []).forEach((f) => {
    if (f.value === 'İşaretsiz') return
    if (f.value === 'Vardır' || f.value === 'Hayır' || f.value === 'Yetersiz' || f.value === 'Anormal' || f.value === 'Daralmış' || f.value === 'Çalışamaz') {
      abnormalFindings.push(f.label.toLowerCase())
    }
  })

  // Sonuç cümlesi
  const hasRefractionAbnormal = isEshel
    ? (!evaluateVisualAcuity(data.rightEye.visualAcuity).isNormal || !evaluateVisualAcuity(data.leftEye.visualAcuity).isNormal)
    : (analyzeEye(data.rightEye, 'Sağ').isAbnormal || analyzeEye(data.leftEye, 'Sol').isAbnormal)
  const hasAbnormal = abnormalFindings.length > 0 || hasRefractionAbnormal

  if (hasAbnormal) {
    const issues: string[] = []
    if (hasRefractionAbnormal) issues.push(isEshel ? 'görme azlığı' : 'kırma kusuru/ görme azlığı')
    if (abnormalFindings.length > 0) issues.push(abnormalFindings.join(', '))
    parts.push(`Bulgular: ${issues.join('; ')} mevcuttur`)
    parts.push('İş sağlığı ve güvenliği açısından mevcut görevinde çalışmasında sakınca vardır, ileri oftalmolojik değerlendirme önerilir.')
  } else {
    parts.push('Klinik bulgular normal sınırlardadır')
    parts.push('İş sağlığı ve güvenliği açısından mevcut görevinde çalışmasında göz muayenesi yönünden sakınca yoktur.')
  }

  return parts.join('. ') + '.'
}

export function EyeExaminationModal({ isOpen, onClose, service, onSave }: EyeExaminationModalProps) {
  const [data, setData] = useState<EyeExaminationData>({ ...defaultData })
  const { canApproveEyeExamination } = useAuth()
  const [templates, setTemplates] = useState<Template[]>(loadTemplates)
  const [openPopover, setOpenPopover] = useState<TemplateCategory | null>(null)
  const [newTemplateText, setNewTemplateText] = useState('')
  const [showExtraFindings, setShowExtraFindings] = useState(false)
  const [manualFindingLabel, setManualFindingLabel] = useState('')
  const [manualFindingValues, setManualFindingValues] = useState('Yoktur, Vardır, İşaretsiz')

  useEffect(() => {
    if (isOpen && service) {
      setData(parseEyeExaminationData(service))
      setOpenPopover(null)
      setNewTemplateText('')
      setShowExtraFindings(false)
    }
  }, [isOpen, service])

  const updateEyeField = (side: 'rightEye' | 'leftEye', field: keyof EyeExaminationData['rightEye'], value: string) => {
    setData((prev) => ({ ...prev, [side]: { ...prev[side], [field]: value } }))
  }

  const handleGenerateComment = () => {
    const comment = generateComment(data)
    setData((prev) => ({ ...prev, resultText: comment }))
  }

  const handleGenerateShortComment = () => {
    const comment = generateShortComment(data)
    setData((prev) => ({ ...prev, resultText: comment }))
  }

  const addTemplate = (category: TemplateCategory) => {
    const text = newTemplateText.trim()
    if (!text) return
    const newTemplates = [...templates, { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, category, text }]
    setTemplates(newTemplates)
    saveTemplates(newTemplates)
    setNewTemplateText('')
  }

  const deleteTemplate = (id: string) => {
    const newTemplates = templates.filter((t) => t.id !== id)
    setTemplates(newTemplates)
    saveTemplates(newTemplates)
  }

  const applyTemplate = (category: TemplateCategory, text: string) => {
    setData((prev) => {
      const current = prev[category] ?? ''
      const next = current.trim() ? `${current.trim()} ${text}` : text
      return { ...prev, [category]: next }
    })
  }

  const addExtraFinding = (label: string, values: string[]) => {
    const id = `ef_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setData((prev) => ({
      ...prev,
      extraFindings: [...(prev.extraFindings ?? []), { id, label, value: values[values.length - 1] }],
    }))
    setShowExtraFindings(false)
  }

  const addManualExtraFinding = () => {
    const label = manualFindingLabel.trim()
    if (!label) return
    // Aynı isimde bulgu var mı kontrol et
    if ((data.extraFindings ?? []).some((f) => f.label.toLowerCase() === label.toLowerCase())) {
      return
    }
    const values = manualFindingValues
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
    if (values.length === 0) return
    const id = `ef_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setData((prev) => ({
      ...prev,
      extraFindings: [...(prev.extraFindings ?? []), { id, label, value: values[values.length - 1], values }],
    }))
    setManualFindingLabel('')
    setManualFindingValues('Yoktur, Vardır, İşaretsiz')
    setShowExtraFindings(false)
  }

  const updateExtraFinding = (id: string, value: string) => {
    setData((prev) => ({
      ...prev,
      extraFindings: (prev.extraFindings ?? []).map((f) => (f.id === id ? { ...f, value } : f)),
    }))
  }

  const removeExtraFinding = (id: string) => {
    setData((prev) => ({
      ...prev,
      extraFindings: (prev.extraFindings ?? []).filter((f) => f.id !== id),
    }))
  }

  const handleClear = () => {
    setData({
      ...defaultData,
      examinationMode: data.examinationMode,
      rightEye: { ...EMPTY_EYE_FIELDS },
      leftEye: { ...EMPTY_EYE_FIELDS },
      extraFindings: [],
    })
  }

  const handleFillNormal = () => {
    const isEshel = data.examinationMode === 'eshel'
    const normalEye = {
      sph: isEshel ? '' : '0',
      cyl: isEshel ? '' : '0',
      ax: isEshel ? '' : '0',
      visualAcuity: '10/10',
      visualAcuityWithGlasses: '10/10',
      eyePressure: '',
    }
    setData({
      ...defaultData,
      examinationMode: data.examinationMode,
      rightEye: { ...normalEye },
      leftEye: { ...normalEye },
      colorBlindness: 'Yoktur',
      needsGlasses: 'İşaretsiz',
      nightBlindness: 'İşaretsiz',
      screenUsage: 'İşaretsiz',
      highAltitude: 'İşaretsiz',
      extraFindings: [],
      evaluation: '',
      diagnosis: '',
      conclusion: '',
      resultStatus: 'Sonuç Normal',
      resultText: 'Sağlam.',
    })
  }

  const handleSave = (approve?: boolean) => {
    const resultText = data.resultText?.trim() || generateComment(data)
    onSave(JSON.stringify(data), resultText, approve)
    onClose()
  }

  const renderEyeBox = (side: 'rightEye' | 'leftEye', title: string, themeColor: string, bgColor: string) => {
    const isEshel = data.examinationMode === 'eshel'
    // Eshel modunda sadece görme keskinliği alanları gösterilir
    const visibleFields = isEshel
      ? EYE_FIELDS.filter((f) => f.key === 'visualAcuity' || f.key === 'visualAcuityWithGlasses')
      : EYE_FIELDS
    return (
    <div className={`rounded-xl border p-2 ${bgColor}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`w-2 h-2 rounded-full ${themeColor}`} />
        <h3 className="text-xs font-bold text-slate-700">{title}</h3>
      </div>
      <div className={`grid gap-1.5 ${isEshel ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {visibleFields.map((field) => (
          <div key={field.key}>
            <label className="block text-[9px] font-medium text-slate-500 mb-0.5 truncate" title={field.label}>{field.label}</label>
            <input
              value={data[side][field.key]}
              onChange={(e) => updateEyeField(side, field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
        ))}
      </div>
    </div>
    )
  }

  const renderSegment = (label: string, field: keyof EyeExaminationData, values: string[]) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
      <span className="text-[11px] font-semibold text-slate-600 shrink-0 w-full sm:w-40">{label}</span>
      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
        {values.map((v) => (
          <button
            key={v}
            onClick={() => setData((prev) => ({ ...prev, [field]: v }))}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
              data[field] === v
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )

  const renderTextareaWithTemplates = (
    label: string,
    field: TemplateCategory,
    value: string,
    onChange: (v: string) => void,
    rows = 2,
  ) => {
    const fieldTemplates = templates.filter((t) => t.category === field)
    const isOpen = openPopover === field
    return (
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[11px] font-semibold text-slate-600">{label}</label>
          <button
            type="button"
            onClick={() => setOpenPopover(isOpen ? null : field)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Şablon seç"
          >
            <ClipboardList className="w-3 h-3" />
            Şablon
          </button>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full px-3 py-2 text-xs leading-relaxed border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder={`${label}...`}
        />
        {/* Hızlı şablon rozetleri — textarea altında */}
        {fieldTemplates.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {fieldTemplates.slice(0, 6).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => applyTemplate(field, t.text)}
                className="px-1.5 py-0.5 text-[9px] font-medium text-slate-600 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded transition-colors max-w-[140px] truncate"
                title={t.text}
              >
                {t.text.length > 28 ? `${t.text.slice(0, 28)}…` : t.text}
              </button>
            ))}
            {fieldTemplates.length > 6 && (
              <button
                type="button"
                onClick={() => setOpenPopover(isOpen ? null : field)}
                className="px-1.5 py-0.5 text-[9px] font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                +{fieldTemplates.length - 6} daha
              </button>
            )}
          </div>
        )}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenPopover(null)} />
            <div className="absolute right-0 bottom-full mb-1 z-50 w-72 bg-white rounded-xl border border-slate-200 shadow-xl max-h-64 flex flex-col">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-bold text-slate-700">Şablonlar</span>
                <span className="text-[9px] text-slate-400">{fieldTemplates.length} kayıt</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                {fieldTemplates.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-4">Henüz şablon eklenmedi.</p>
                ) : (
                  fieldTemplates.map((t) => (
                    <div
                      key={t.id}
                      className="group flex items-start gap-1.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => applyTemplate(field, t.text)}
                        className="flex-1 text-left text-[10px] text-slate-700 leading-relaxed line-clamp-3 hover:text-blue-700"
                      >
                        {t.text}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(t.id)}
                        className="shrink-0 p-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Sil"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-slate-100 shrink-0">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newTemplateText}
                    onChange={(e) => setNewTemplateText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTemplate(field)
                      }
                    }}
                    placeholder="Yeni şablon..."
                    className="flex-1 px-2 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => addTemplate(field)}
                    className="shrink-0 p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    title="Ekle"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Göz Muayenesi" size="2xl">
      <div className="space-y-3">
        {/* Göz Parametreleri + Muayene Türü ortada */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
          {renderEyeBox('leftEye', 'Sol Göz', 'bg-blue-400', 'bg-blue-50 border-blue-100')}
          {/* Muayene Türü — ortada dikey */}
          <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-200 p-2 gap-1.5 md:min-w-[120px]">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide text-center">Muayene Türü</span>
            <button
              type="button"
              onClick={() => setData((p) => ({ ...p, examinationMode: 'otorefraktometre' }))}
              className={`w-full px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                data.examinationMode !== 'eshel'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Otorefr.
            </button>
            <button
              type="button"
              onClick={() => setData((p) => ({ ...p, examinationMode: 'eshel' }))}
              className={`w-full px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                data.examinationMode === 'eshel'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Eşhel
            </button>
            {data.examinationMode === 'eshel' && (
              <span className="text-[8px] text-slate-400 text-center leading-tight">Sadece görme keskinliği</span>
            )}
          </div>
          {renderEyeBox('rightEye', 'Sağ Göz', 'bg-red-400', 'bg-red-50 border-red-100')}
        </div>

        {/* Bulgular */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5">
          <h3 className="text-xs font-bold text-slate-700">Bulgular</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2.5">
            {TRIO_OPTIONS.map((opt) => renderSegment(opt.label, opt.key, opt.values))}
            {renderSegment(SCREEN_OPTIONS.label, SCREEN_OPTIONS.key, SCREEN_OPTIONS.values)}
            {(data.extraFindings ?? []).map((f) => {
              const opt = EXTRA_FINDING_OPTIONS.find((o) => o.label === f.label)
              const values = opt?.values ?? f.values ?? ['Yoktur', 'Vardır', 'İşaretsiz']
              return (
                <div key={f.id} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <div className="flex items-center gap-1 shrink-0 w-full sm:w-40">
                    <span className="text-[11px] font-semibold text-slate-600 truncate flex-1" title={f.label}>{f.label}</span>
                    <button
                      type="button"
                      onClick={() => removeExtraFinding(f.id)}
                      className="shrink-0 p-0.5 text-slate-300 hover:text-red-500 rounded transition-colors"
                      title="Kaldır"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                    {values.map((v) => (
                      <button
                        key={v}
                        onClick={() => updateExtraFinding(f.id, v)}
                        className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                          f.value === v
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          {/* + Bulgular ekle */}
          <div className="relative pt-1">
            <button
              type="button"
              onClick={() => setShowExtraFindings(!showExtraFindings)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Bulgular Ekle
            </button>
            {showExtraFindings && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExtraFindings(false)} />
                <div className="absolute left-0 bottom-full mb-1 z-50 w-72 bg-white rounded-xl border border-slate-200 shadow-xl max-h-72 flex flex-col">
                  <div className="px-3 py-2 border-b border-slate-100 shrink-0">
                    <span className="text-[10px] font-bold text-slate-700">Eklenebilecek Bulgular</span>
                  </div>
                  {/* Hazır bulgular */}
                  <div className="p-1.5 overflow-y-auto">
                    {EXTRA_FINDING_OPTIONS
                      .filter((opt) => !(data.extraFindings ?? []).some((f) => f.label === opt.label))
                      .map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => addExtraFinding(opt.label, opt.values)}
                          className="w-full text-left px-2 py-1.5 text-[10px] text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    {EXTRA_FINDING_OPTIONS.every((opt) => (data.extraFindings ?? []).some((f) => f.label === opt.label)) && (
                      <p className="text-[10px] text-slate-400 text-center py-2">Tüm hazır bulgular eklendi.</p>
                    )}
                  </div>
                  {/* Manuel ekleme */}
                  <div className="border-t border-slate-100 p-2 space-y-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-slate-600">Manuel Bulgu Ekle</span>
                    <input
                      type="text"
                      value={manualFindingLabel}
                      onChange={(e) => setManualFindingLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualExtraFinding() } }}
                      placeholder="Bulgu adı (Örn: Pterjium)"
                      className="w-full px-2 py-1.5 text-[10px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={manualFindingValues}
                      onChange={(e) => setManualFindingValues(e.target.value)}
                      placeholder="Seçenekler (virgülle ayırın)"
                      className="w-full px-2 py-1.5 text-[10px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addManualExtraFinding}
                      disabled={!manualFindingLabel.trim()}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Ekle
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Değerlendirme / Tanı */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderTextareaWithTemplates('Değerlendirme', 'evaluation', data.evaluation, (v) => setData((p) => ({ ...p, evaluation: v })))}
          {renderTextareaWithTemplates('Tanı', 'diagnosis', data.diagnosis, (v) => setData((p) => ({ ...p, diagnosis: v })))}
        </div>

        {/* Sonuç Yorumu */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold text-slate-600">Sonuç Yorumu</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleGenerateComment}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                title="Verilerden detaylı profesyonel yorum oluştur"
              >
                <MessageSquare className="w-3 h-3" />
                Detaylı
              </button>
              <button
                type="button"
                onClick={handleGenerateShortComment}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium text-teal-600 hover:bg-teal-50 rounded transition-colors"
                title="Verilerden kısa özet yorum oluştur"
              >
                <MessageSquare className="w-3 h-3" />
                Kısa
              </button>
              <button
                type="button"
                onClick={() => setOpenPopover(openPopover === 'resultText' ? null : 'resultText')}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Şablon seç"
              >
                <ClipboardList className="w-3 h-3" />
                Şablon
              </button>
            </div>
          </div>
          <textarea
            value={data.resultText}
            onChange={(e) => setData((p) => ({ ...p, resultText: e.target.value }))}
            rows={8}
            className="w-full px-3 py-2 text-xs leading-relaxed border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            placeholder="Sonuç yorumu..."
          />
          {/* Hızlı şablon rozetleri */}
          {templates.filter((t) => t.category === 'resultText').length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {templates.filter((t) => t.category === 'resultText').slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate('resultText', t.text)}
                  className="px-1.5 py-0.5 text-[9px] font-medium text-slate-600 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded transition-colors max-w-[140px] truncate"
                  title={t.text}
                >
                  {t.text.length > 28 ? `${t.text.slice(0, 28)}…` : t.text}
                </button>
              ))}
              {templates.filter((t) => t.category === 'resultText').length > 6 && (
                <button
                  type="button"
                  onClick={() => setOpenPopover('resultText')}
                  className="px-1.5 py-0.5 text-[9px] font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  +{templates.filter((t) => t.category === 'resultText').length - 6} daha
                </button>
              )}
            </div>
          )}
          {/* Şablon popover */}
          {openPopover === 'resultText' && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenPopover(null)} />
              <div className="absolute right-0 bottom-full mb-1 z-50 w-72 bg-white rounded-xl border border-slate-200 shadow-xl max-h-64 flex flex-col">
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-bold text-slate-700">Sonuç Yorumu Şablonları</span>
                  <span className="text-[9px] text-slate-400">{templates.filter((t) => t.category === 'resultText').length} kayıt</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                  {templates.filter((t) => t.category === 'resultText').length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-4">Henüz şablon eklenmedi.</p>
                  ) : (
                    templates.filter((t) => t.category === 'resultText').map((t) => (
                      <div key={t.id} className="group flex items-start gap-1.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                        <button
                          type="button"
                          onClick={() => applyTemplate('resultText', t.text)}
                          className="flex-1 text-left text-[10px] text-slate-700 leading-relaxed line-clamp-3 hover:text-blue-700"
                        >
                          {t.text}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTemplate(t.id)}
                          className="shrink-0 p-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Sil"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-slate-100 shrink-0">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newTemplateText}
                      onChange={(e) => setNewTemplateText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTemplate('resultText')
                        }
                      }}
                      placeholder="Yeni şablon..."
                      className="flex-1 px-2 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => addTemplate('resultText')}
                      className="shrink-0 p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title="Ekle"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Eraser className="w-3.5 h-3.5" />
              Temizle
            </button>
            <button
              type="button"
              onClick={handleFillNormal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 border border-slate-200 rounded-lg hover:bg-emerald-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Normal
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
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
            {canApproveEyeExamination && (
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
      </div>
    </Modal>
  )
}
