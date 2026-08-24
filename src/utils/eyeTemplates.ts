export const EYE_TEMPLATE_STORAGE_KEY = 'cetka-eye-templates'

export type EyeTemplateCategory = 'evaluation' | 'diagnosis' | 'resultText'

export interface EyeTemplate {
  id: string
  category: EyeTemplateCategory
  text: string
}

export const EYE_TEMPLATE_CATEGORIES: { key: EyeTemplateCategory; label: string; color: string; icon: string }[] = [
  { key: 'evaluation', label: 'Değerlendirme Şablonları', color: 'blue', icon: '📋' },
  { key: 'diagnosis', label: 'Tanı Şablonları', color: 'amber', icon: '🏥' },
  { key: 'resultText', label: 'Sonuç Yorumu Şablonları', color: 'emerald', icon: '✅' },
]

export function loadEyeTemplates(): EyeTemplate[] {
  try {
    const raw = localStorage.getItem(EYE_TEMPLATE_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as EyeTemplate[]
  } catch {
    // ignore
  }
  return []
}

export function saveEyeTemplates(templates: EyeTemplate[]): void {
  localStorage.setItem(EYE_TEMPLATE_STORAGE_KEY, JSON.stringify(templates))
}

export function addEyeTemplate(category: EyeTemplateCategory, text: string): EyeTemplate | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const templates = loadEyeTemplates()
  const newTemplate: EyeTemplate = {
    id: `et_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    category,
    text: trimmed,
  }
  saveEyeTemplates([...templates, newTemplate])
  return newTemplate
}

export function updateEyeTemplate(id: string, text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  const templates = loadEyeTemplates()
  const idx = templates.findIndex((t) => t.id === id)
  if (idx === -1) return false
  templates[idx] = { ...templates[idx], text: trimmed }
  saveEyeTemplates(templates)
  return true
}

export function deleteEyeTemplate(id: string): void {
  const templates = loadEyeTemplates().filter((t) => t.id !== id)
  saveEyeTemplates(templates)
}

export function getEyeTemplatesByCategory(category: EyeTemplateCategory): EyeTemplate[] {
  return loadEyeTemplates().filter((t) => t.category === category)
}
