export const statusOptions = ['Tümü', 'Barkod Verildi', 'İşlem Bekliyor', 'Numune Kabul', 'Sonuç Bekleniyor', 'Sonuç Girildi', 'Onaylandı']

export interface ServiceMeta {
  unit: string
  range: string
  type: 'numeric' | 'text'
}

export const serviceMeta: Record<string, ServiceMeta> = {
  'Tam Kan Sayımı (Hemogram - CBC)': { unit: '', range: '', type: 'text' },
  'GLİKOZ (Biyokimya-AKS/Açlık Kan Şekeri)': { unit: 'mg/dL', range: '70 - 110', type: 'numeric' },
  'KREATİNİN (kanda)': { unit: 'mg/dL', range: '0.74 - 1.35', type: 'numeric' },
  'TOTAL KOLESTEROL': { unit: 'mg/dL', range: '0 - 200', type: 'numeric' },
  'TRİGLİSERİD': { unit: 'mg/dL', range: '0 - 150', type: 'numeric' },
  'AST / SGOT (Aspartat Amino Transferaz)': { unit: 'U/L', range: '0 - 40', type: 'numeric' },
  'ALT / SGPT (Alanin Amino Transferaz)': { unit: 'U/L', range: '0 - 50', type: 'numeric' },
  'HbA1c / Hemoglobin A1C': { unit: '%', range: '4.0 - 6.0', type: 'numeric' },
  'KAN GRUBU': { unit: '', range: '', type: 'text' },
  'ÜRE': { unit: 'mg/dL', range: '10 - 50', type: 'numeric' },
  'PA AKCİĞER GRAFİSİ (Posteroanterior)': { unit: '', range: 'Normal sınırlarda', type: 'text' },
  'EKG (ELEKTROKARDİYOGRAFİ)': { unit: '', range: 'Normal sınırlarda', type: 'text' },
  'İşitme Testi (ODYOMETRİ)': { unit: 'dB', range: '0 - 25', type: 'numeric' },
  'Solunum Fonksiyon Testi (SFT)': { unit: '%', range: '80 - 120', type: 'numeric' },
  'GÖZ TARAMASI (otorefraktometre)': { unit: '', range: '', type: 'text' },
  'Hbs-Ag (Elisa)': { unit: '', range: 'Negatif', type: 'text' },
  'Anti-HIV 1/2 (Elisa)': { unit: '', range: 'Negatif', type: 'text' },
  'Anti-HCV (Elisa)': { unit: '', range: 'Negatif', type: 'text' },
  'Anti-HBc-Ab (Elisa)': { unit: '', range: 'Negatif', type: 'text' },
}

export function formatDateTime(iso?: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function getMeta(name: string): ServiceMeta {
  return serviceMeta[name] ?? { unit: '', range: '', type: 'numeric' }
}

export function calculateHL(result: string, range: string): 'Yüksek' | 'Düşük' | 'Normal' | '' {
  if (!result || !range) return ''
  const val = Number(result.replace(',', '.'))
  if (isNaN(val)) return ''
  const parts = range.replace(/\s/g, '').split(/[-â€“]/)
  if (parts.length !== 2) return ''
  const [min, max] = parts.map((p) => Number(p.replace(',', '.')))
  if (isNaN(min) || isNaN(max)) return ''
  if (val > max) return 'Yüksek'
  if (val < min) return 'Düşük'
  return 'Normal'
}

export function getResultText(result: string, meta: ServiceMeta): string {
  if (!result) return ''
  if (meta.type === 'text') return result
  const hl = calculateHL(result, meta.range)
  if (hl === 'Yüksek') return 'Yüksek'
  if (hl === 'Düşük') return 'Düşük'
  return 'Normal Sınırlarda'
}

export function getLabName(group: string): string {
  if (group === 'Radyoloji' || group === 'Odyometri') return 'CETKA Görüntüleme'
  return 'CETKA Lab'
}

export function statusColor(status: string) {
  switch (status) {
    case 'Onaylandı':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300'
    case 'Sonuç Girildi':
      return 'bg-sky-50 text-sky-700 border-sky-300'
    case 'Numune Kabul':
      return 'bg-amber-50 text-amber-700 border-amber-300'
    case 'İşlem Bekliyor':
      return 'bg-slate-50 text-slate-500 border-slate-300'
    case 'Barkod Verildi':
      return 'bg-violet-50 text-violet-700 border-violet-300'
    case 'Sonuç Bekleniyor':
      return 'bg-rose-50 text-rose-700 border-rose-300'
    default:
      return 'bg-slate-50 text-slate-500 border-slate-300'
  }
}

// Durum rozeti için ikon bilgisi — her duruma uygun nokta/renk
export function statusDot(status: string): string {
  switch (status) {
    case 'Onaylandı':
      return 'bg-emerald-500'
    case 'Sonuç Girildi':
      return 'bg-sky-500'
    case 'Numune Kabul':
      return 'bg-amber-500'
    case 'İşlem Bekliyor':
      return 'bg-slate-400'
    case 'Barkod Verildi':
      return 'bg-violet-500'
    case 'Sonuç Bekleniyor':
      return 'bg-rose-500'
    default:
      return 'bg-slate-400'
  }
}

export function initialResult(status: string, meta: ServiceMeta): string {
  if (status === 'Onaylandı' || status === 'Sonuç Girildi' || status === 'Numune Kabul') return ''
  if (meta.type === 'text') {
    if (meta.range === 'Negatif') return 'Negatif'
    if (meta.range === 'Normal sınırlarda') return 'Normal sınırlarda'
    return ''
  }
  return ''
}
