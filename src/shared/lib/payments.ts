export const PAYMENT_TYPES = ['Nakit', 'Kart', 'Kuruma Fatura', 'İndirim', 'Eft/Havale'] as const

const PAYMENT_TYPE_ALIASES: Record<string, string> = {
  'Kredi Kartı': 'Kart',
  'Kurumu Fatura': 'Kuruma Fatura',
}

export function normalizePaymentType(value: string): string {
  return PAYMENT_TYPE_ALIASES[value] ?? value
}
