import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, formatDateLocal } from '@/shared/lib/date'

interface DateRangeFilterProps {
  startDate: string
  endDate: string
  today: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
}

export function DateRangeFilter({ startDate, endDate, today, onStartDateChange, onEndDateChange }: DateRangeFilterProps) {
  const shiftDay = (days: number) => {
    onStartDateChange(addDays(startDate || today, days))
    onEndDateChange(addDays(endDate || today, days))
  }

  const setRange = (start: Date, end: string) => {
    onStartDateChange(formatDateLocal(start))
    onEndDateChange(end)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-slate-600">Tarih Aralığı</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => shiftDay(-1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500" title="Önceki gün">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <input type="date" value={startDate} onChange={(event) => { const value = event.target.value; onStartDateChange(value); if (endDate && value > endDate) onEndDateChange(value) }} className="w-[105px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500" />
        <span className="text-[10px] text-slate-400">—</span>
        <input type="date" value={endDate} onChange={(event) => { const value = event.target.value; onEndDateChange(value); if (startDate && value < startDate) onStartDateChange(value) }} className="w-[105px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 focus:outline-none focus:border-blue-500" />
        <button type="button" onClick={() => shiftDay(1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500" title="Sonraki gün">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setRange(new Date(`${today}T00:00:00`), today)} className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">Bugün</button>
        <button type="button" onClick={() => { const date = new Date(`${today}T00:00:00`); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); setRange(date, today) }} className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">Bu Hafta</button>
        <button type="button" onClick={() => { const date = new Date(`${today}T00:00:00`); setRange(new Date(date.getFullYear(), date.getMonth(), 1), today) }} className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">Bu Ay</button>
      </div>
    </div>
  )
}
