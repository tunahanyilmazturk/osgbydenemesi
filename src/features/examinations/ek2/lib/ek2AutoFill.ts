import { normalizeServiceName } from '@/shared/lib/specialServices'
import { loadEk2Settings, resolveEk2TransferTarget } from '@/features/examinations/ek2/lib/ek2Settings'
import type { Ek2Data, ProtocolService, TetanusVaccinationData } from '@/shared/types'

type LaboratoryFindingKey = 'blood' | 'urine' | 'radiology' | 'audiometry' | 'sft' | 'eye' | 'psychological' | 'other'

export interface Ek2AutomaticValues {
  laboratoryFindings: Record<LaboratoryFindingKey, string>
  bloodGroup: string
  tetanus: string
  sourceCount: number
}

function formatDate(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleDateString('tr-TR')
}

function readSpecialResult(service: ProtocolService): string {
  for (const raw of [service.audiometryData, service.eyeExaminationData]) {
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as { resultText?: unknown }
      if (typeof parsed.resultText === 'string' && parsed.resultText.trim()) return parsed.resultText.trim()
    } catch {
      // Geçersiz eski kayıt atlanır.
    }
  }
  return ''
}

function meaningfulResult(value?: string): string {
  const trimmed = value?.trim() ?? ''
  return ['Tamamlandı', 'Taslak', 'Formu Doldur'].includes(trimmed) ? '' : trimmed
}

function serviceResultLine(service: ProtocolService): string {
  const result = meaningfulResult(service.result)
  const resultText = meaningfulResult(service.resultText) || readSpecialResult(service)
  if (!result && !resultText) return ''
  const values = [result]
  if (resultText && normalizeServiceName(resultText) !== normalizeServiceName(result)) values.push(resultText)
  return `${service.name}: ${values.filter(Boolean).join(' | ')}`
}

function readTetanus(service: ProtocolService): string {
  if (!service.tetanusVaccinationData) return ''
  try {
    const data = JSON.parse(service.tetanusVaccinationData) as Partial<TetanusVaccinationData>
    const date = formatDate(data.applicationDate || service.approvedAt || service.processDate)
    return `${date ? `${date} tarihinde ` : ''}tetanoz aşısı uygulanmıştır${service.status === 'Onaylandı' ? ' (onaylı kayıt).' : '.'}`
  } catch {
    return ''
  }
}

export function buildEk2AutomaticValues(services: ProtocolService[]): Ek2AutomaticValues {
  const findings: Record<LaboratoryFindingKey, string[]> = {
    blood: [], urine: [], radiology: [], audiometry: [], sft: [], eye: [], psychological: [], other: [],
  }
  const settings = loadEk2Settings()
  const seen = new Set<string>()
  let bloodGroup = ''
  let tetanus = ''
  let sourceCount = 0

  for (const service of services) {
    const normalizedName = normalizeServiceName(service.name)
    if (normalizedName.includes('ek 2') || normalizedName.includes('periyodik muayene formu')) continue
    const target = resolveEk2TransferTarget(service, settings)
    if (target === 'none') continue
    if (target === 'tetanus') {
      if (!tetanus) tetanus = readTetanus(service)
      continue
    }

    const line = serviceResultLine(service)
    if (!line) continue
    const identity = service.code > 0 ? `code:${service.code}` : `name:${normalizedName}`
    if (seen.has(identity)) continue
    seen.add(identity)

    if (target === 'bloodGroup') {
      if (!bloodGroup) bloodGroup = meaningfulResult(service.result) || meaningfulResult(service.resultText)
      continue
    }
    findings[target].push(line)
    sourceCount += 1
  }

  return {
    laboratoryFindings: Object.fromEntries(Object.entries(findings).map(([key, lines]) => [key, lines.join('\n')])) as Record<LaboratoryFindingKey, string>,
    bloodGroup,
    tetanus,
    sourceCount,
  }
}

export function applyEk2AutomaticValues(data: Ek2Data, automatic: Ek2AutomaticValues): Ek2Data {
  const previousAutomatic = data.automaticValues
  const laboratoryFindings = { ...data.laboratoryFindings }
  for (const [key, generated] of Object.entries(automatic.laboratoryFindings)) {
    const current = laboratoryFindings[key] ?? ''
    const previousGenerated = previousAutomatic?.laboratoryFindings?.[key] ?? ''
    if (!current || current === previousGenerated) laboratoryFindings[key] = generated
  }
  const bloodGroup = !data.bloodGroup || data.bloodGroup === previousAutomatic?.bloodGroup ? automatic.bloodGroup : data.bloodGroup
  const tetanus = !data.immunization.tetanus || data.immunization.tetanus === previousAutomatic?.tetanus ? automatic.tetanus : data.immunization.tetanus
  return {
    ...data,
    bloodGroup,
    immunization: { ...data.immunization, tetanus },
    laboratoryFindings,
    automaticValues: {
      laboratoryFindings: automatic.laboratoryFindings,
      bloodGroup: automatic.bloodGroup,
      tetanus: automatic.tetanus,
      syncedAt: new Date().toISOString(),
    },
  }
}
