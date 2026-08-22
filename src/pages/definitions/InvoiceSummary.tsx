import { FileText } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'

export function InvoiceSummary() {
  return (
    <div>
      <PageHeader
        title="Fatura İcmal"
        subtitle="Firma bazlı fatura icmal ve toplu faturalandırma işlemleri."
      />
      <div className="mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-slate-500 font-medium">Fatura İcmal modülü yakında aktif olacak.</h3>
        <p className="text-xs text-slate-400 mt-1">Aylık fatura özetleri ve icmal listeleri burada olacak.</p>
      </div>
    </div>
  )
}
