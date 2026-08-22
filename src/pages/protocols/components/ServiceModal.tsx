import { useMemo } from 'react'
import { useProtocols } from '../../../context/ProtocolsContext'
import { Modal } from '../../../components/ui/Modal'
import { ServiceSelector } from './ServiceSelector'
import type { PatientDetail, Protocol, ProtocolService } from '../../../types'

interface ServiceModalProps {
  isOpen: boolean
  onClose: () => void
  patient: PatientDetail
  protocol: Protocol
  onAddService: (service: Omit<ProtocolService, 'id' | 'protocolId' | 'barcode' | 'totalPrice'>) => void
  onRemoveService: (serviceId: number) => void
}

export function ServiceModal({ isOpen, onClose, patient, protocol, onAddService, onRemoveService }: ServiceModalProps) {
  const { updateServiceInProtocol } = useProtocols()

  const selectedServices = useMemo(
    () =>
      protocol.services.map((s) => ({
        id: s.id,
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
    <Modal isOpen={isOpen} onClose={onClose} title={patient.name} size="xl">
      <div className="h-[75vh]">
        <ServiceSelector
          company={protocol.company}
          selectedServices={selectedServices}
          onAddService={onAddService}
          onRemoveService={onRemoveService}
          onUpdateService={handleUpdateService}
        />
      </div>
    </Modal>
  )
}
