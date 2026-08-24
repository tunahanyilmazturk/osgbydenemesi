import { useMemo, useState } from 'react'
import { ArrowLeft, Barcode, Mail, Phone, Plus, Printer, Trash2, User } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePatients } from '../../context/PatientsContext'
import { useProtocols } from '../../context/ProtocolsContext'
import { useCompanies } from '../../context/CompaniesContext'
import { useConfirm } from '../../context/ConfirmContext'
import { ServiceModal } from '../../pages/protocols/components/ServiceModal'
import { VezneTransactions } from '../../pages/vezne/components/VezneTransactions'
import { PageHeader } from '../../components/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { ProtocolService } from '../../types'

type SubTab = 'protokol' | 'vezne'

export function ProtocolDetail() {
  const { patientId, protocolId } = useParams<{ patientId: string; protocolId: string }>()
  const navigate = useNavigate()
  const { patients } = usePatients()
  const { protocols, addServiceToProtocol, removeServiceFromProtocol, updateServiceInProtocol } = useProtocols()
  const { companies: companyList } = useCompanies()
  const confirm = useConfirm()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('protokol')
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([])
  const [lastSelectedServiceId, setLastSelectedServiceId] = useState<number | null>(null)

  const startEditPrice = (service: { id: number; price: number }) => {
    if (!protocol) return
    setEditingServiceId(service.id)
    setEditPrice(service.price.toFixed(2))
  }

  const cancelEditPrice = () => {
    setEditingServiceId(null)
    setEditPrice('')
  }

  const saveEditPrice = (serviceId: number) => {
    if (!protocol) return
    const price = Number(editPrice)
    if (isNaN(price) || price < 0) {
      cancelEditPrice()
      return
    }
    updateServiceInProtocol(protocol.id, serviceId, { price })
    setEditingServiceId(null)
    setEditPrice('')
  }

  const patient = useMemo(
    () => patients.find((p) => p.id === Number(patientId)),
    [patients, patientId]
  )

  const protocol = useMemo(
    () => protocols.find((p) => p.id === Number(protocolId)),
    [protocols, protocolId]
  )

  const handleAddService = (
    service: Omit<ProtocolService, 'id' | 'protocolId' | 'barcode' | 'totalPrice'>
  ) => {
    if (!protocol) return
    addServiceToProtocol(protocol.id, service)
  }

  const handleDeleteService = async (serviceId: number) => {
    if (!protocol) return
    if (protocol.payments.length > 0) {
      await confirm({
        title: 'Ödeme Kaydı Mevcut',
        message: 'Bu protokolde tahsilat kaydı bulunmaktadır. Testi silmeden önce Vezne sekmesinden tahsilatları silmelisiniz.',
        confirmText: 'Anladım',
        confirmVariant: 'primary',
      })
      return
    }
    const ok = await confirm({
      title: 'Hizmet Sil',
      message: 'Hizmeti silmek istediğinize emin misiniz?',
      skipKey: 'delete-service',
    })
    if (ok) {
      removeServiceFromProtocol(protocol.id, serviceId)
      setSelectedServiceIds((prev) => prev.filter((id) => id !== serviceId))
    }
  }

  function formatDateTime(iso?: string) {
    if (!iso) return '-'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const handleRowClick = (e: React.MouseEvent, id: number) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'BUTTON') {
      return
    }
    if (e.ctrlKey || e.metaKey) {
      setSelectedServiceIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        setLastSelectedServiceId(id)
        return next
      })
    } else if (e.shiftKey && lastSelectedServiceId !== null) {
      const ids = protocol?.services.map((s) => s.id) ?? []
      const start = ids.indexOf(lastSelectedServiceId)
      const end = ids.indexOf(id)
      if (start === -1 || end === -1) {
        setSelectedServiceIds([id])
        setLastSelectedServiceId(id)
        return
      }
      const range = ids.slice(Math.min(start, end), Math.max(start, end) + 1)
      setSelectedServiceIds((prev) => Array.from(new Set([...prev, ...range])))
      setLastSelectedServiceId(id)
    } else {
      setSelectedServiceIds([id])
      setLastSelectedServiceId(id)
    }
  }

  const handlePrintSelectedBarcodes = () => {
    if (!patient || !protocol || selectedServiceIds.length === 0) return
    const selectedServicesList = protocol.services.filter((s) => selectedServiceIds.includes(s.id))
    if (selectedServicesList.length === 0) return
    const baseValues = [
      '',
      '1',
      protocol.company,
      protocol.company,
      patient.name,
      formatDateTime(selectedServicesList[0].processDate),
      protocol.protocolNo,
      '',
      patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('tr-TR') : '',
      patient.gender || '',
    ]
    const serviceValues: string[] = []
    selectedServicesList.forEach((service) => {
      serviceValues.push(service.group, service.name, service.barcode || '')
    })
    const values = [...baseValues, ...serviceValues, '']
    const params = values.map(encodeURIComponent).join(encodeURIComponent('|'))
    const url = `infoMedBarkodPrinter:${params}`
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.click()
  }

  const selectAllServices = () => {
    const all = protocol?.services.map((s) => s.id) ?? []
    const next = selectedServiceIds.length === all.length && all.length > 0 ? [] : all
    setSelectedServiceIds(next)
    setLastSelectedServiceId(next[next.length - 1] ?? null)
  }

  const hasSelection = selectedServiceIds.length > 0

  if (!patient || !protocol || protocol.patientId !== patient.id) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <p className="text-slate-600">Kayıt bulunamadı.</p>
        <button
          onClick={() => navigate('/hasta-kayit')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
        >
          Listeye Dön
        </button>
      </div>
    )
  }

  const totalAmount = protocol.services.reduce((sum, s) => sum + s.totalPrice, 0)

  const printServiceDetail = () => {
    const birthDate = patient.birthDate
      ? new Date(patient.birthDate).toLocaleDateString('tr-TR')
      : '-'

    const rows = [
      { label: 'Firma Adı:', value: protocol.company },
      { label: 'TC Kimlik No:', value: patient.tc },
      { label: 'Adı Soyadı:', value: patient.name },
      { label: 'D. Tarihi/ Cinsiyet:', value: `${birthDate} / ${patient.gender}` },
      { label: 'İşyeri Hekimi:', value: '-' },
    ]

    const serviceRows = protocol.services
      .map((s) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${s.name}</td></tr>`)
      .join('')

    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>Hizmet Detay - ${patient.name}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1e293b; padding: 40px; background: #fff; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    td { padding: 10px 12px; border: 1px solid #cbd5e1; font-size: 14px; }
    td:first-child { background: #f1f5f9; font-weight: 600; width: 160px; }
    h3 { background: #e2e8f0; padding: 10px 12px; font-size: 16px; margin: 0 0 0; border: 1px solid #cbd5e1; border-bottom: none; }
    .services-table td { border: 1px solid #cbd5e1; border-top: none; }
    @media print { @page { margin: 2cm; } body { padding: 0; } }
  </style>
</head>
<body onload="window.print()">
  <table>
    ${rows.map((r) => `<tr><td>${r.label}</td><td>${r.value}</td></tr>`).join('')}
  </table>
  <h3>Hizmet Dökümü</h3>
  <table class="services-table">
    <tbody>${serviceRows || '<tr><td style="padding:10px 12px;">Henüz hizmet eklenmemiş.</td></tr>'}</tbody>
  </table>
</body>
</html>
    `.trim()

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const genderColor =
    patient.gender === 'Kadın'
      ? 'bg-pink-100 text-pink-600 border-pink-200'
      : 'bg-blue-100 text-blue-600 border-blue-200'

  const menuItems = [
    { label: 'Kimlik Kartı', path: `/hasta-kayit/protokol/${patient.id}` },
    { label: 'Protokol Listesi', path: `/hasta-kayit/protokol/${patient.id}` },
    { label: 'Hizmet Ekle/Sil', active: true },
    { label: 'Durum Değiştir' },
    { label: 'Toplu Barkod', onClick: handlePrintSelectedBarcodes },
    { label: 'Hizmet Detay' },
    { label: 'Diğer İşlemler' },
  ]

  return (
    <div className="space-y-2">
      <PageHeader
        title="Protokol Detay"
        subtitle={`${patient.name} - Protokol No: ${protocol.protocolNo}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/hasta-kayit')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Hasta Listesine Dön
            </button>
            <button
              onClick={() => navigate(`/hasta-kayit/protokol/${patient.id}/yeni`)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Protokol
            </button>
          </div>
        }
      />

      {/* Patient card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${genderColor}`}>
            <User className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-800">{patient.name}</h2>
            <p className="text-xs text-slate-500">
              {patient.tc} — [{protocol.protocolNo}]
            </p>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-600">
              {patient.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-blue-500" />
                  {patient.phone}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  {patient.email}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
              <span>Cinsiyet: {patient.gender}</span>
              <span>
                Doğum: {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('tr-TR') : '-'}
              </span>
              <span>Firma: {protocol.company}</span>
              <span>Muayene: {protocol.examType}</span>
            </div>
          </div>
        </div>

        {/* Top menu tabs */}
        <div className="flex flex-wrap gap-1 mt-4 border-b border-slate-100 pb-1">
          {menuItems.map((item) =>
            item.path ? (
              <button
                key={item.label}
                onClick={() => navigate(item.path!)}
                className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-50"
              >
                {item.label}
              </button>
            ) : (
              <button
                key={item.label}
                onClick={
                  item.label === 'Hizmet Ekle/Sil'
                    ? () => setIsModalOpen(true)
                    : item.label === 'Hizmet Detay'
                      ? printServiceDetail
                      : item.label === 'Toplu Barkod'
                        ? handlePrintSelectedBarcodes
                        : undefined
                }
                disabled={
                  !item.active &&
                  item.label !== 'Hizmet Ekle/Sil' &&
                  item.label !== 'Hizmet Detay' &&
                  item.label !== 'Toplu Barkod'
                }
                className={`px-3 py-2 text-xs font-medium rounded-lg ${
                  item.active
                    ? 'text-blue-600 bg-blue-50'
                    : item.label === 'Hizmet Ekle/Sil' || item.label === 'Hizmet Detay' || item.label === 'Toplu Barkod'
                      ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      : 'text-slate-400 cursor-not-allowed'
                }`}
              >
                {item.label}
              </button>
            )
          )}
        </div>

        {/* Sub tabs */}
        <div className="flex gap-2 mt-2 border-b border-slate-100">
          <button
            onClick={() => setActiveSubTab('protokol')}
            className={`px-3 py-1.5 text-xs font-medium -mb-px ${
              activeSubTab === 'protokol'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Protokol Detay
          </button>
          <button
            onClick={() => setActiveSubTab('vezne')}
            className={`px-3 py-1.5 text-xs font-medium -mb-px ${
              activeSubTab === 'vezne'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Vezne İşlemleri
          </button>
        </div>
      </div>

      {activeSubTab === 'protokol' ? (
        <>
          {/* Service actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={selectAllServices}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Barcode className="w-3.5 h-3.5" />
              {selectedServiceIds.length > 0 ? 'Seçimi Temizle' : 'Tümünü Seç'}
            </button>
            <button
              onClick={handlePrintSelectedBarcodes}
              disabled={!hasSelection}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="w-3.5 h-3.5" />
              Barkod Yazdır
            </button>
            {hasSelection && (
              <span className="text-xs text-slate-500">
                {selectedServiceIds.length} test seçildi
              </span>
            )}
          </div>

          {/* Services table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-fixed w-full text-left text-[10px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5 font-medium w-24">Durum</th>
                    <th className="px-2 py-1.5 font-medium w-24">Barkod</th>
                    <th className="px-2 py-1.5 font-medium w-28">İşlem Tarihi</th>
                    <th className="px-2 py-1.5 font-medium w-24">Grubu</th>
                    <th className="px-2 py-1.5 font-medium">Hizmet</th>
                    <th className="px-2 py-1.5 font-medium text-right w-20">Fiyatı</th>
                    <th className="px-2 py-1.5 font-medium text-right w-12">KDV</th>
                    <th className="px-2 py-1.5 font-medium text-right w-20">Toplam</th>
                    <th className="px-2 py-1.5 font-medium w-24">Kayıt Yapan</th>
                    <th className="px-2 py-1.5 font-medium text-right w-12">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {protocol.services.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-500 text-xs">
                        Henüz hizmet eklenmemiş.
                      </td>
                    </tr>
                  ) : (
                    protocol.services.map((service) => (
                      <tr
                        key={service.id}
                        onClick={(e) => handleRowClick(e, service.id)}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          selectedServiceIds.includes(service.id) ? 'bg-blue-50 hover:bg-blue-100' : ''
                        }`}
                      >
                        <td className="px-2 py-1.5 align-middle">
                          <StatusBadge status={service.status} />
                        </td>
                        <td className="px-2 py-1.5 font-mono text-slate-600 truncate">{service.barcode}</td>
                        <td className="px-2 py-1.5 text-slate-600 truncate">
                          {formatDateTime(service.processDate)}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 truncate">{service.group}</td>
                        <td className="px-2 py-1.5 text-slate-800 font-medium truncate" title={service.name}>
                          {service.name}
                        </td>
                        <td className="px-2 py-1.5 text-right text-slate-600">
                          {editingServiceId === service.id ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              onBlur={() => saveEditPrice(service.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditPrice(service.id)
                                if (e.key === 'Escape') cancelEditPrice()
                              }}
                              autoFocus
                              className="w-20 px-1.5 py-1 text-right text-[10px] bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-500"
                            />
                          ) : (
                            <button
                              onClick={() => startEditPrice(service)}
                              className="hover:text-blue-600 hover:underline font-mono"
                              title="Fiyatı düzenlemek için tıklayın"
                            >
                              ₺{service.price.toFixed(2)}
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-right text-slate-600">%{service.vatRate}</td>
                        <td className="px-2 py-1.5 text-right font-medium text-slate-800">
                          ₺{service.totalPrice.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 truncate" title={service.recordedBy}>
                          {service.recordedBy}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-slate-100 flex justify-end items-center gap-4 bg-slate-50">
              <span className="text-xs text-slate-500">
                Hizmet Sayısı: <span className="font-semibold text-slate-800">{protocol.services.length}</span>
              </span>
              <span className="text-xs font-semibold text-slate-800">
                Toplam: ₺{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

        </>
      ) : (
        <VezneTransactions protocol={protocol} />
      )}

      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patient={patient}
        protocol={protocol}
        companyServices={companyList.find((c) => c.name === protocol.company)?.companyServices ?? []}
        onAddService={handleAddService}
        onRemoveService={handleDeleteService}
      />
    </div>
  )
}
