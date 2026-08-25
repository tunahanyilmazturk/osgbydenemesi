import type { PatientDetail, Protocol } from '@/shared/types'

type ShowToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void
type SortField = 'protocolNo' | 'patientName' | 'company' | 'tc'
type SortConfig = { field: SortField; direction: 'asc' | 'desc' } | null

interface UseLabSelectionHandlersParams {
  selectedProtocolId: number | null
  selectedProtocolIds: number[]
  selectedServiceIds: number[]
  lastSelectedProtocolId: number | null
  lastSelectedServiceId: number | null
  selectedServices: { id: number }[]
  searchFilteredProtocols: Protocol[]
  protocols: Protocol[]
  patients: PatientDetail[]
  setSelectedProtocolId: (id: number | null) => void
  setSelectedProtocolIds: React.Dispatch<React.SetStateAction<number[]>>
  setSelectedServiceIds: React.Dispatch<React.SetStateAction<number[]>>
  setLastSelectedProtocolId: (id: number | null) => void
  setLastSelectedServiceId: (id: number | null) => void
  setServicePage: (page: number) => void
  setServiceStatusFilter: (filter: string | null) => void
  setSortConfig: React.Dispatch<React.SetStateAction<SortConfig>>
  showToast: ShowToast
}

export function useLabSelectionHandlers({
  selectedProtocolId,
  selectedProtocolIds,
  selectedServiceIds,
  lastSelectedProtocolId,
  lastSelectedServiceId,
  selectedServices,
  searchFilteredProtocols,
  protocols,
  patients,
  setSelectedProtocolId,
  setSelectedProtocolIds,
  setSelectedServiceIds,
  setLastSelectedProtocolId,
  setLastSelectedServiceId,
  setServicePage,
  setServiceStatusFilter,
  setSortConfig,
  showToast,
}: UseLabSelectionHandlersParams) {
  const selectAllServices = () => {
    const all = selectedServices.map((s) => s.id)
    const next = selectedServiceIds.length === all.length && all.length > 0 ? [] : all
    setSelectedServiceIds(next)
    setLastSelectedServiceId(next[next.length - 1] ?? null)
  }

  const selectAllProtocols = () => {
    const all = searchFilteredProtocols.map((p) => p.id)
    const next = selectedProtocolIds.length === all.length && all.length > 0 ? [] : all
    setSelectedProtocolIds(next)
    setLastSelectedProtocolId(next[next.length - 1] ?? null)
  }

  const handleProtocolCardClick = (e: React.MouseEvent | React.KeyboardEvent, id: number) => {
    // Shift seçiminde aktif protokolü değiştirme — sadece seçim aralığını güncelle
    if (e.shiftKey) {
      const anchorId = lastSelectedProtocolId ?? selectedProtocolId
      if (anchorId === null) {
        // İlk tıklama — normal seçim yap
        setSelectedProtocolId(id)
        setSelectedServiceIds([])
        setServicePage(1)
        setServiceStatusFilter(null)
        setSelectedProtocolIds([id])
        setLastSelectedProtocolId(id)
        return
      }
      const ids = searchFilteredProtocols.map((p) => p.id)
      const start = ids.indexOf(anchorId)
      const end = ids.indexOf(id)
      if (start === -1 || end === -1) {
        // Anchor bulunamadı — normal seçim yap
        setSelectedProtocolIds([id])
        setLastSelectedProtocolId(id)
        return
      }
      const range = ids.slice(Math.min(start, end), Math.max(start, end) + 1)
      // Shift seçiminde önceki seçimi temizle, sadece aralığı seç
      setSelectedProtocolIds(range)
      setLastSelectedProtocolId(id)
      return
    }

    // Aktif protokol olarak ayarla
    setSelectedProtocolId(id)
    setSelectedServiceIds([])
    setServicePage(1)
    setServiceStatusFilter(null)

    if (e.ctrlKey || e.metaKey) {
      setSelectedProtocolIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        setLastSelectedProtocolId(id)
        return next
      })
    } else {
      setSelectedProtocolIds([id])
      setLastSelectedProtocolId(id)
    }

    // Ödeme kontrolü — ödeme eksikse uyarı göster
    const protocol = protocols.find((p) => p.id === id)
    if (protocol) {
      const totalServicePrice = protocol.services.reduce((sum, s) => sum + (s.totalPrice || 0), 0)
      const totalPaid = protocol.payments.reduce((sum, pmt) => sum + (pmt.amount || 0), 0)
      if (totalServicePrice > 0 && totalPaid < totalServicePrice) {
        const remaining = totalServicePrice - totalPaid
        const patient = patients.find((pt) => pt.id === protocol.patientId)
        showToast(
          'warning',
          `${patient?.name ?? 'Hasta'} adlı kişinin ödemesi tamamlanmadı. Kalan: ${remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
        )
      }
    }
  }

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (prev?.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { field, direction: 'asc' }
    })
  }

  const handleRowClick = (e: React.MouseEvent, id: number) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
      return
    }
    if (e.shiftKey) {
      const anchorId = lastSelectedServiceId ?? (selectedServiceIds.length > 0 ? selectedServiceIds[selectedServiceIds.length - 1] : null)
      if (anchorId === null) {
        setSelectedServiceIds([id])
        setLastSelectedServiceId(id)
        return
      }
      const ids = selectedServices.map((s) => s.id)
      const start = ids.indexOf(anchorId)
      const end = ids.indexOf(id)
      if (start === -1 || end === -1) {
        setSelectedServiceIds([id])
        setLastSelectedServiceId(id)
        return
      }
      const range = ids.slice(Math.min(start, end), Math.max(start, end) + 1)
      setSelectedServiceIds(range)
      setLastSelectedServiceId(id)
      return
    }
    if (e.ctrlKey || e.metaKey) {
      setSelectedServiceIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        setLastSelectedServiceId(id)
        return next
      })
    } else {
      setSelectedServiceIds([id])
      setLastSelectedServiceId(id)
    }
  }

  return {
    selectAllServices,
    selectAllProtocols,
    handleProtocolCardClick,
    handleSort,
    handleRowClick,
  }
}
