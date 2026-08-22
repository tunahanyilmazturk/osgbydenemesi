const styles: Record<string, string> = {
  Bekliyor: 'bg-amber-100 text-amber-700',
  'Numune Bekliyor': 'bg-amber-100 text-amber-700',
  Tamamlandı: 'bg-emerald-100 text-emerald-700',
  'Sonuç Bekleniyor': 'bg-blue-100 text-blue-700',
  'Sonuç Girildi': 'bg-violet-100 text-violet-700',
  'Numune Kabul': 'bg-indigo-100 text-indigo-700',
  Onaylandı: 'bg-emerald-100 text-emerald-700',
  'Barkod Verildi': 'bg-sky-100 text-sky-700',
}

const labels: Record<string, string> = {
  Bekliyor: 'Bekliyor',
  'Numune Bekliyor': 'Numune Bek.',
  Tamamlandı: 'Tamamlandı',
  'Sonuç Bekleniyor': 'Sonuç Bek.',
  'Sonuç Girildi': 'Sonuç Gir.',
  'Numune Kabul': 'Kabul',
  Onaylandı: 'Onaylandı',
  'Barkod Verildi': 'Barkod',
}

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = styles[status] ?? 'bg-slate-100 text-slate-700'
  const label = labels[status] ?? status
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${style}`} title={status}>
      {label}
    </span>
  )
}
