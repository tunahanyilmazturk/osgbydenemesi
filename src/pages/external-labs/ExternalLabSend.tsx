import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ChevronLeft, ChevronRight, Search, Send } from 'lucide-react'
import type { ExternalLabSendRecord } from '@/shared/types'
import { useExternalLabsStorage } from '@/pages/external-labs/hooks/useExternalLabsStorage'

const SENDS_KEY = 'cetka-external-lab-sends'

function formatDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function loadSends(): ExternalLabSendRecord[] {
  try {
    const raw = localStorage.getItem(SENDS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ExternalLabSendRecord[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return []
}

function saveSends(sends: ExternalLabSendRecord[]) {
  try {
    localStorage.setItem(SENDS_KEY, JSON.stringify(sends))
  } catch {
    // ignore
  }
}

export function ExternalLabSend() {
  const navigate = useNavigate()
  const today = new Date()
  const [startDate, setStartDate] = useState(formatDateInput(today))
  const [endDate, setEndDate] = useState(formatDateInput(today))
  const [labFilter, setLabFilter] = useState('Tümü')

  const [sends] = useState<ExternalLabSendRecord[]>(loadSends)
  const labs = useExternalLabsStorage()

  useEffect(() => {
    saveSends(sends)
  }, [sends])

  const labOptions = useMemo(() => {
    const names = new Set(labs.filter((l) => l.active).map((l) => l.name))
    sends.forEach((s) => names.add(s.externalLabName))
    return ['Tümü', ...Array.from(names).sort()]
  }, [labs, sends])

  const filteredSends = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`).getTime()
    const end = new Date(`${endDate}T23:59:59`).getTime()
    return sends.filter((s) => {
      const d = new Date(s.sendDate).getTime()
      const inRange = d >= start && d <= end
      const labOk = labFilter === 'Tümü' || s.externalLabName === labFilter
      return inRange && labOk
    })
  }, [sends, startDate, endDate, labFilter])

  const shiftDay = (days: number) => {
    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)
    start.setDate(start.getDate() + days)
    end.setDate(end.getDate() + days)
    setStartDate(formatDateInput(start))
    setEndDate(formatDateInput(end))
  }

  const handleSearch = () => {
    // Filtreleme zaten canlı; bu buton kullanıcı deneyimi için
  }

  const handleNewSend = () => {
    navigate('/laboratuvar/dis-lab-gonderim/yeni')
  }

  return (
    <div className="viewport-page">
      {/* Üst başlık ve yeni gönderim butonu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Dış Laboratuvar Gönderim Listesi</h1>
          <p className="text-xs text-slate-500">Dış laboratuvarlara gönderilen tetkikleri görüntüleyin ve filtreleyin.</p>
        </div>
        <button
          onClick={handleNewSend}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-blue-600 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Send className="w-4 h-4" />
          Dış Laboratuvara Yeni Gönderim
        </button>
      </div>

      {/* Filtre bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Tarih aralığı */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftDay(-1)}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              title="Önceki gün"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm text-slate-700 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm text-slate-700 focus:outline-none"
              />
            </div>
            <button
              onClick={() => shiftDay(1)}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              title="Sonraki gün"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Laboratuvar seçimi */}
          <div className="flex items-center gap-2 flex-1">
            <select
              value={labFilter}
              onChange={(e) => setLabFilter(e.target.value)}
              className="w-full lg:w-56 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500"
            >
              {labOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Sorgula */}
          <button
            onClick={handleSearch}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Search className="w-4 h-4" />
            Sorgula
          </button>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 min-h-0">
        <div className="overflow-x-auto">
          <table className="table-fixed w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium w-28">Durum</th>
                <th className="px-4 py-3 font-medium w-36">G.Tarihi</th>
                <th className="px-4 py-3 font-medium">Laboratuvar</th>
                <th className="px-4 py-3 font-medium w-28 text-center">Hasta Sayısı</th>
                <th className="px-4 py-3 font-medium w-28 text-center">Hizmet Sayısı</th>
                <th className="px-4 py-3 font-medium w-40">Gönderen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSends.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Seçilen tarih aralığında gönderim bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredSends.map((send) => (
                  <tr key={send.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                        {send.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(send.sendDate)}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium truncate" title={send.externalLabName}>
                      {send.externalLabName}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-center font-medium">{send.patientCount}</td>
                    <td className="px-4 py-3 text-slate-700 text-center font-medium">{send.serviceCount}</td>
                    <td className="px-4 py-3 text-slate-600 truncate" title={send.sentBy}>
                      {send.sentBy}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Özet */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Toplam {filteredSends.length} gönderim</span>
        <span>
          {filteredSends.reduce((sum, s) => sum + s.patientCount, 0)} hasta,{' '}
          {filteredSends.reduce((sum, s) => sum + s.serviceCount, 0)} hizmet
        </span>
      </div>
    </div>
  )
}
