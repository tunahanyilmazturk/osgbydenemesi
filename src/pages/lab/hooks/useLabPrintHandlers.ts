import { openAudiometryPdf } from '@/features/examinations/audiometry/lib/audiometryReport'
import { openEyeExaminationPdf } from '@/features/examinations/eye-examination/lib/eyeExaminationReport'
import { getSharedPdf } from '@/shared/lib/storage'
import { isAudiometryServiceName, isEyeExaminationServiceName } from '@/shared/lib/specialServices'
import type { AppUser } from '@/state/AuthContext'
import type { AudiometryData, EyeExaminationData, PatientDetail, Protocol, ProtocolService } from '@/shared/types'

type ShowToast = (type: 'success' | 'error' | 'info', title: string, message: string) => void

interface UseLabPrintHandlersParams {
  selectedProtocolIds: number[]
  selectedProtocolId: number | null
  protocols: Protocol[]
  patients: PatientDetail[]
  users: AppUser[]
  setShowPrintDropdown: (show: boolean) => void
  setIsPrintingAll: (show: boolean) => void
  setIsZippingAll: (show: boolean) => void
  showToast: ShowToast
}

export function resolvePdfData(service: ProtocolService): { data: string; name: string } | null {
  if (service.pdfId) {
    const shared = getSharedPdf(service.pdfId)
    if (shared) return { data: shared.data, name: shared.name }
    return null
  }
  if (service.pdfData) return { data: service.pdfData, name: service.pdfName ?? 'PDF' }
  return null
}

function openBlobInWindow(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob)
  const newWin = window.open(blobUrl, '_blank')
  if (!newWin) {
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } else {
    newWin.document.title = fileName
  }
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function safeFileName(s: string, maxLen: number): string {
  return s
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .trim()
    .slice(0, maxLen)
}

export function useLabPrintHandlers({
  selectedProtocolIds,
  selectedProtocolId,
  protocols,
  patients,
  users,
  setShowPrintDropdown,
  setIsPrintingAll,
  setIsZippingAll,
  showToast,
}: UseLabPrintHandlersParams) {
  const getOrderedIds = (): number[] => {
    const target = selectedProtocolIds.length > 0
      ? selectedProtocolIds
      : (selectedProtocolId ? [selectedProtocolId] : [])
    if (target.length === 0 || !selectedProtocolId) return target
    return target.includes(selectedProtocolId)
      ? [selectedProtocolId, ...target.filter((id) => id !== selectedProtocolId)]
      : target
  }

  const handlePrintSelectedResults = async () => {
    setShowPrintDropdown(false)
    const targetProtocolIds = getOrderedIds()
    if (targetProtocolIds.length === 0) return

    setIsPrintingAll(true)
    try {
      const { jsPDF } = await import('jspdf')
      const { PDFDocument } = await import('pdf-lib')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      let hasContent = false
      let reportCount = 0

      const uploadedPdfs: { bytes: Uint8Array; name: string }[] = []
      const protocolsMap = new Map(protocols.map((p) => [p.id, p]))

      for (const pid of targetProtocolIds) {
        const protocol = protocolsMap.get(pid)
        if (!protocol) continue
        const patient = patients.find((pt) => pt.id === protocol.patientId)
        if (!patient) continue

        for (const service of protocol.services) {
          if (service.status !== 'Onaylandı') continue

          const pdfInfo = resolvePdfData(service)
          if (pdfInfo) {
            try {
              const base64 = pdfInfo.data.split(',')[1]
              uploadedPdfs.push({ bytes: base64ToBytes(base64), name: pdfInfo.name })
              reportCount++
            } catch (err) {
              console.error('PDF yükleme hatası:', err)
            }
          } else if (isAudiometryServiceName(service.name) && service.audiometryData) {
            try {
              const data = JSON.parse(service.audiometryData) as AudiometryData
              await openAudiometryPdf({
                patient,
                protocol,
                service,
                data,
                recordedBy: service.recordedBy,
                recordedByStamp: service.recordedBy
                  ? users.find((u) => u.displayName === service.recordedBy)?.stamp
                  : undefined,
                approvedBy: service.approvedBy,
                approvedAt: service.approvedAt,
                approvedByStamp: service.approvedBy
                  ? users.find((u) => u.displayName === service.approvedBy)?.stamp
                  : undefined,
              }, doc, !hasContent)
              hasContent = true
              reportCount++
            } catch (err) {
              console.error('Odyometri PDF hatası:', err)
            }
          } else if (isEyeExaminationServiceName(service.name) && service.eyeExaminationData) {
            try {
              const data = JSON.parse(service.eyeExaminationData) as EyeExaminationData
              await openEyeExaminationPdf({
                patient,
                protocol,
                service,
                data,
                recordedBy: service.recordedBy,
                approvedBy: service.approvedBy,
                approvedAt: service.approvedAt,
                approvedByStamp: service.approvedBy
                  ? users.find((u) => u.displayName === service.approvedBy)?.stamp
                  : undefined,
              }, doc, !hasContent)
              hasContent = true
              reportCount++
            } catch (err) {
              console.error('Göz PDF hatası:', err)
            }
          }
        }
      }

      if (reportCount === 0) {
        showToast('info', 'Yazdırılacak rapor yok', 'Seçili protokollerde onaylı rapor bulunamadı.')
        return
      }

      const dateStr = new Date().toISOString().slice(0, 10)
      const fileName = `Sonuclar_${dateStr}.pdf`

      if (hasContent && uploadedPdfs.length > 0) {
        const jsPdfBytes = doc.output('arraybuffer')
        const merged = await PDFDocument.create()
        const jsPdfDoc = await PDFDocument.load(jsPdfBytes)
        const jsPages = await merged.copyPages(jsPdfDoc, jsPdfDoc.getPageIndices())
        jsPages.forEach((p) => merged.addPage(p))
        for (const { bytes } of uploadedPdfs) {
          try {
            const pdfDoc = await PDFDocument.load(bytes)
            const pages = await merged.copyPages(pdfDoc, pdfDoc.getPageIndices())
            pages.forEach((p) => merged.addPage(p))
          } catch (err) {
            console.error('PDF birleştirme hatası:', err)
          }
        }
        const mergedBytes = await merged.save()
        openBlobInWindow(new Blob([mergedBytes as BlobPart], { type: 'application/pdf' }), fileName)
        showToast('success', 'Sonuçlar yazdırıldı', `${reportCount} rapor (odyometri/göz + yüklenen PDF) tek PDF olarak açıldı.`)
      } else if (hasContent) {
        doc.setProperties({ title: fileName, subject: `${reportCount} onaylı rapor`, author: 'CETKA' })
        openBlobInWindow(doc.output('blob'), fileName)
        showToast('success', 'Sonuçlar yazdırıldı', `${reportCount} onaylı rapor tek PDF olarak açıldı.`)
      } else if (uploadedPdfs.length > 0) {
        const merged = await PDFDocument.create()
        for (const { bytes } of uploadedPdfs) {
          try {
            const pdfDoc = await PDFDocument.load(bytes)
            const pages = await merged.copyPages(pdfDoc, pdfDoc.getPageIndices())
            pages.forEach((p) => merged.addPage(p))
          } catch (err) {
            console.error('PDF birleştirme hatası:', err)
          }
        }
        const mergedBytes = await merged.save()
        openBlobInWindow(new Blob([mergedBytes as BlobPart], { type: 'application/pdf' }), fileName)
        showToast('success', 'Sonuçlar yazdırıldı', `${uploadedPdfs.length} yüklenen PDF tek dosyada birleştirildi.`)
      }
    } catch (error) {
      showToast('error', 'PDF oluşturulamadı', error instanceof Error ? error.message : 'Bilinmeyen hata')
    } finally {
      setIsPrintingAll(false)
    }
  }

  const handleDownloadResultsAsZip = async () => {
    setShowPrintDropdown(false)
    const targetProtocolIds = getOrderedIds()
    if (targetProtocolIds.length === 0) return

    setIsZippingAll(true)
    try {
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      const protocolsMap = new Map(protocols.map((p) => [p.id, p]))
      let fileCount = 0
      const usedNames = new Set<string>()

      for (const pid of targetProtocolIds) {
        const protocol = protocolsMap.get(pid)
        if (!protocol) continue
        const patient = patients.find((pt) => pt.id === protocol.patientId)
        if (!patient) continue

        for (const service of protocol.services) {
          if (service.status !== 'Onaylandı') continue

          let blob: Blob | undefined
          let fileBase = ''
          const safeName = safeFileName(patient.name, 30)

          if (isAudiometryServiceName(service.name) && service.audiometryData) {
            try {
              const data = JSON.parse(service.audiometryData) as AudiometryData
              const result = await openAudiometryPdf({
                patient,
                protocol,
                service,
                data,
                recordedBy: service.recordedBy,
                recordedByStamp: service.recordedBy
                  ? users.find((u) => u.displayName === service.recordedBy)?.stamp
                  : undefined,
                approvedBy: service.approvedBy,
                approvedAt: service.approvedAt,
                approvedByStamp: service.approvedBy
                  ? users.find((u) => u.displayName === service.approvedBy)?.stamp
                  : undefined,
              }, undefined, false, true)
              if (result instanceof Blob) blob = result
              fileBase = `Odyometri_${safeName}`
            } catch (err) {
              console.error('Odyometri ZIP hatası:', err)
            }
          } else if (isEyeExaminationServiceName(service.name) && service.eyeExaminationData) {
            try {
              const data = JSON.parse(service.eyeExaminationData) as EyeExaminationData
              const result = await openEyeExaminationPdf({
                patient,
                protocol,
                service,
                data,
                recordedBy: service.recordedBy,
                approvedBy: service.approvedBy,
                approvedAt: service.approvedAt,
                approvedByStamp: service.approvedBy
                  ? users.find((u) => u.displayName === service.approvedBy)?.stamp
                  : undefined,
              }, undefined, false, true)
              if (result instanceof Blob) blob = result
              fileBase = `Goz_${safeName}`
            } catch (err) {
              console.error('Göz ZIP hatası:', err)
            }
          } else if (resolvePdfData(service)) {
            try {
              const pdfInfo = resolvePdfData(service)!
              const base64 = pdfInfo.data.split(',')[1]
              blob = new Blob([base64ToBytes(base64) as BlobPart], { type: 'application/pdf' })
              const safeServiceName = safeFileName(service.name, 20)
              fileBase = `PDF_${safeName}_${safeServiceName}`
            } catch (err) {
              console.error('PDF ZIP hatası:', err)
            }
          }

          if (blob) {
            let fileName = `${fileBase}.pdf`
            let counter = 1
            while (usedNames.has(fileName)) {
              fileName = `${fileBase}_${counter}.pdf`
              counter++
            }
            usedNames.add(fileName)
            zip.file(fileName, blob)
            fileCount++
          }
        }
      }

      if (fileCount === 0) {
        showToast('info', 'İndirilecek rapor yok', 'Seçili protokollerde onaylı rapor bulunamadı.')
        return
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = `Sonuclar_${dateStr}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('success', 'ZIP indirildi', `${fileCount} rapor ZIP olarak indirildi.`)
    } catch (error) {
      showToast('error', 'ZIP oluşturulamadı', error instanceof Error ? error.message : 'Bilinmeyen hata')
    } finally {
      setIsZippingAll(false)
    }
  }

  const handleDownloadResultsAsZipByCompany = async () => {
    setShowPrintDropdown(false)
    const targetProtocolIds = getOrderedIds()
    if (targetProtocolIds.length === 0) return

    setIsZippingAll(true)
    try {
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      const protocolsMap = new Map(protocols.map((p) => [p.id, p]))
      const usedNames = new Set<string>()
      let fileCount = 0

      for (const pid of targetProtocolIds) {
        const protocol = protocolsMap.get(pid)
        if (!protocol) continue
        const patient = patients.find((pt) => pt.id === protocol.patientId)
        if (!patient) continue

        const approvedServices = protocol.services.filter((s) => s.status === 'Onaylandı')
        if (approvedServices.length === 0) continue

        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        let hasContent = false
        let testCount = 0
        const uploadedPdfs: Uint8Array[] = []

        for (const service of approvedServices) {
          const pdfInfo = resolvePdfData(service)
          if (pdfInfo) {
            try {
              const base64 = pdfInfo.data.split(',')[1]
              uploadedPdfs.push(base64ToBytes(base64))
              testCount++
            } catch (err) {
              console.error('PDF yükleme hatası:', err)
            }
          } else if (isAudiometryServiceName(service.name) && service.audiometryData) {
            try {
              const data = JSON.parse(service.audiometryData) as AudiometryData
              await openAudiometryPdf({
                patient,
                protocol,
                service,
                data,
                recordedBy: service.recordedBy,
                recordedByStamp: service.recordedBy
                  ? users.find((u) => u.displayName === service.recordedBy)?.stamp
                  : undefined,
                approvedBy: service.approvedBy,
                approvedAt: service.approvedAt,
                approvedByStamp: service.approvedBy
                  ? users.find((u) => u.displayName === service.approvedBy)?.stamp
                  : undefined,
              }, doc, !hasContent)
              hasContent = true
              testCount++
            } catch (err) {
              console.error('Odyometri ZIP hatası:', err)
            }
          } else if (isEyeExaminationServiceName(service.name) && service.eyeExaminationData) {
            try {
              const data = JSON.parse(service.eyeExaminationData) as EyeExaminationData
              await openEyeExaminationPdf({
                patient,
                protocol,
                service,
                data,
                recordedBy: service.recordedBy,
                approvedBy: service.approvedBy,
                approvedAt: service.approvedAt,
                approvedByStamp: service.approvedBy
                  ? users.find((u) => u.displayName === service.approvedBy)?.stamp
                  : undefined,
              }, doc, !hasContent)
              hasContent = true
              testCount++
            } catch (err) {
              console.error('Göz ZIP hatası:', err)
            }
          }
        }

        if (testCount > 0) {
          let blob: Blob
          if (hasContent && uploadedPdfs.length > 0) {
            const { PDFDocument } = await import('pdf-lib')
            const jsPdfBytes = doc.output('arraybuffer')
            const merged = await PDFDocument.create()
            const jsPdfDoc = await PDFDocument.load(jsPdfBytes)
            const jsPages = await merged.copyPages(jsPdfDoc, jsPdfDoc.getPageIndices())
            jsPages.forEach((p) => merged.addPage(p))
            for (const bytes of uploadedPdfs) {
              try {
                const pdfDoc = await PDFDocument.load(bytes)
                const pages = await merged.copyPages(pdfDoc, pdfDoc.getPageIndices())
                pages.forEach((p) => merged.addPage(p))
              } catch (err) {
                console.error('PDF birleştirme hatası:', err)
              }
            }
            const mergedBytes = await merged.save()
            blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' })
          } else if (hasContent) {
            blob = doc.output('blob')
          } else {
            const { PDFDocument } = await import('pdf-lib')
            const merged = await PDFDocument.create()
            for (const bytes of uploadedPdfs) {
              try {
                const pdfDoc = await PDFDocument.load(bytes)
                const pages = await merged.copyPages(pdfDoc, pdfDoc.getPageIndices())
                pages.forEach((p) => merged.addPage(p))
              } catch (err) {
                console.error('PDF birleştirme hatası:', err)
              }
            }
            const mergedBytes = await merged.save()
            blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' })
          }
          const safeCompany = protocol.company
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 40) || 'BilinmeyenFirma'
          const safePatient = safeFileName(patient.name, 30) || 'BilinmeyenHasta'
          const fileBase = `${safePatient}_${protocol.protocolNo}`

          let fileName = `${fileBase}.pdf`
          let counter = 1
          while (usedNames.has(`${safeCompany}/${fileName}`)) {
            fileName = `${fileBase}_${counter}.pdf`
            counter++
          }
          usedNames.add(`${safeCompany}/${fileName}`)

          const folder = zip.folder(safeCompany)
          folder?.file(fileName, blob)
          fileCount++
        }
      }

      if (fileCount === 0) {
        showToast('info', 'İndirilecek rapor yok', 'Seçili protokollerde onaylı rapor bulunamadı.')
        return
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      const dateStr = new Date().toISOString().slice(0, 10)
      a.download = `Sonuclar_FirmaBazli_${dateStr}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('success', 'ZIP indirildi', `${fileCount} hastanın raporları firma bazlı klasörlerde ZIP olarak indirildi.`)
    } catch (error) {
      showToast('error', 'ZIP oluşturulamadı', error instanceof Error ? error.message : 'Bilinmeyen hata')
    } finally {
      setIsZippingAll(false)
    }
  }

  return {
    handlePrintSelectedResults,
    handleDownloadResultsAsZip,
    handleDownloadResultsAsZipByCompany,
  }
}
