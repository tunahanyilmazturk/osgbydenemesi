import { Banknote, CreditCard, FileText, Filter, RefreshCcw, Wallet } from 'lucide-react'

interface AccountingSummaryProps {
  totalsByType: Record<string, number>
  grandTotal: number
}

interface SummaryCard {
  key: string
  label: string
  icon: typeof Banknote
  bg: string
  text: string
  border: string
}

export function AccountingSummary({ totalsByType, grandTotal }: AccountingSummaryProps) {
  const summaryCards: SummaryCard[] = [
    {
      key: 'Nakit',
      label: 'Nakit',
      icon: Banknote,
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-200',
    },
    {
      key: 'Eft/Havale',
      label: 'Eft/Havale',
      icon: RefreshCcw,
      bg: 'bg-violet-50',
      text: 'text-violet-600',
      border: 'border-violet-200',
    },
    {
      key: 'Kart',
      label: 'Kart',
      icon: CreditCard,
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
    },
    {
      key: 'Kuruma Fatura',
      label: 'Kuruma Fatura',
      icon: FileText,
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      border: 'border-indigo-200',
    },
    {
      key: 'İndirim',
      label: 'İndirim',
      icon: Filter,
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-200',
    },
    {
      key: 'toplam',
      label: 'Genel Toplam',
      icon: Wallet,
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-200',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {summaryCards.map((card) => {
        const value = card.key === 'toplam' ? grandTotal : (totalsByType[card.key] ?? 0)
        const Icon = card.icon
        return (
          <div
            key={card.key}
            className={`rounded-2xl border p-3 ${card.bg} ${card.border}`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-slate-500">{card.label}</p>
              <Icon className={`w-3.5 h-3.5 ${card.text}`} />
            </div>
            <p className={`text-lg font-bold ${card.text}`}>
              ₺{value.toFixed(2)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
