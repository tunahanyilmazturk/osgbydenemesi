export function normalizeServiceName(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function isAudiometryServiceName(value: string): boolean {
  const normalized = normalizeServiceName(value)
  return normalized.includes('odyometri') && (normalized.includes('isitme') || normalized.includes('odyo'))
}

export function isEyeExaminationServiceName(value: string): boolean {
  const normalized = normalizeServiceName(value)
  return normalized.includes('goz') && (
    normalized.includes('tarama') || normalized.includes('otorefraktometre')
  )
}

export function isSameServiceName(left: string, right: string): boolean {
  return normalizeServiceName(left) === normalizeServiceName(right)
}
