import { useMemo } from 'react'
import { User } from 'lucide-react'
import { useProtocols } from '@/state/ProtocolsContext'
import { Modal } from '@/shared/components/ui/Modal'
import { ServiceSelector } from '@/pages/protocols/components/ServiceSelector'
import type { CompanyService } from '@/state/CompaniesContext'
import type { PatientDetail, Protocol, ProtocolService } from '@/shared/types'

interface ServiceModalProps {
  isOpen: boolean
  onClose: () => void
  patient: PatientDetail
  protocol: Protocol
  companyServices?: CompanyService[]
  onAddService: (service: Omit<ProtocolService, 'id' | 'protocolId' | 'barcode' | 'totalPrice'>) => void
  onRemoveService: (serviceId: number) => void
}

export function ServiceModal({ isOpen, onClose, patient, protocol, companyServices, onAddService, onRemoveService }: ServiceModalProps) {
  const { updateServiceInProtocol } = useProtocols()

  const selectedServices = useMemo(
    () =>
      protocol.services.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        group: s.group,
        price: s.price,
        vatRate: s.vatRate,
        totalPrice: s.totalPrice,
        status: s.status,
        recordedBy: s.recordedBy,
      })),
    [protocol.services]
  )

  const handleUpdateService = (serviceId: number, updates: { price?: number; vatRate?: number }) => {
    updateServiceInProtocol(protocol.id, serviceId, updates)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hizmet Ekle"
      subtitle={
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-xs font-bold text-slate-800 truncate">{patient.name}</span>
          <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
            {protocol.company} — {protocol.protocolNo}
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-medium bg-slate-100 text-slate-600 rounded shrink-0">
            {protocol.examType}
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white rounded shrink-0">
            {protocol.services.length} hizmet
          </span>
        </div>
      }
      size="2xl"
    >
      <div className="h-[520px]">
        <ServiceSelector
          company={protocol.company}
          companyServices={companyServices}
          selectedServices={selectedServices}
          onAddService={onAddService}
          onRemoveService={onRemoveService}
          onUpdateService={handleUpdateService}
        />
      </div>
    </Modal>
  )
}
