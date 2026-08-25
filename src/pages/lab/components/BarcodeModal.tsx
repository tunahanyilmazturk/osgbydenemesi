import { FlaskConical, Printer, Users } from 'lucide-react'
import { Modal } from '@/shared/components/ui/Modal'

export interface BarcodeTestItem {
  name: string
  group: string
  tubeTypeName: string
  count: number
  protocols: number
}

interface BarcodeModalProps {
  isOpen: boolean
  onClose: () => void
  protocolCount: number
  barcodeTestList: BarcodeTestItem[]
  selectedBarcodeTests: Set<string>
  setSelectedBarcodeTests: React.Dispatch<React.SetStateAction<Set<string>>>
  onPrint: () => void
}

export function BarcodeModal({
  isOpen,
  onClose,
  protocolCount,
  barcodeTestList,
  selectedBarcodeTests,
  setSelectedBarcodeTests,
  onPrint,
}: BarcodeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Toplu Barkod Yazdır — Test Seçimi"
      size="md"
    >
      <div className="space-y-3">
        {/* Özet bilgi */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] bg-slate-50 rounded-lg p-2.5">
          <span className="flex items-center gap-1 text-slate-600">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            {protocolCount} protokol
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1 text-slate-600">
            <FlaskConical className="w-3.5 h-3.5 text-blue-500" />
            {barcodeTestList.length} farklı test
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">
            {selectedBarcodeTests.size} test seçili
          </span>
        </div>

        {/* Hızlı seçim butonları */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedBarcodeTests(new Set(barcodeTestList.map((t) => t.name)))}
            className="px-2.5 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Tümünü Seç
          </button>
          <button
            onClick={() => setSelectedBarcodeTests(new Set())}
            className="px-2.5 py-1 text-[10px] font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Temizle
          </button>
          {/* Grup bazında hızlı seçim */}
          {Array.from(new Set(barcodeTestList.map((t) => t.group))).map((group) => (
            <button
              key={group}
              onClick={() => {
                setSelectedBarcodeTests((prev) => {
                  const next = new Set(prev)
                  barcodeTestList.filter((t) => t.group === group).forEach((t) => next.add(t.name))
                  return next
                })
              }}
              className="px-2.5 py-1 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {group}
            </button>
          ))}
        </div>

        {/* Test listesi — gruplara ayrılmış */}
        <div className="max-h-[400px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
          {barcodeTestList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FlaskConical className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500">Test bulunamadı.</p>
              <p className="text-[10px] text-slate-400 mt-1">Önce protokol seçin.</p>
            </div>
          ) : (
            (() => {
              const groups = Array.from(new Set(barcodeTestList.map((t) => t.group)))
              return groups.map((group) => {
                const testsInGroup = barcodeTestList.filter((t) => t.group === group)
                const allGroupSelected = testsInGroup.every((t) => selectedBarcodeTests.has(t.name))
                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 sticky top-0 z-10">
                      <input
                        type="checkbox"
                        checked={allGroupSelected}
                        onChange={(e) => {
                          setSelectedBarcodeTests((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) {
                              testsInGroup.forEach((t) => next.add(t.name))
                            } else {
                              testsInGroup.forEach((t) => next.delete(t.name))
                            }
                            return next
                          })
                        }}
                        className="w-3.5 h-3.5 accent-blue-600 cursor-pointer rounded"
                      />
                      <span className="text-[11px] font-bold text-slate-700">{group}</span>
                      <span className="text-[9px] text-slate-400">({testsInGroup.length} test)</span>
                    </div>
                    <div className="px-3 py-1 space-y-0.5">
                      {testsInGroup.map((test) => {
                        const isSelected = selectedBarcodeTests.has(test.name)
                        return (
                          <label
                            key={test.name}
                            className="flex items-center gap-2 py-1 px-1 rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedBarcodeTests((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(test.name)) {
                                    next.delete(test.name)
                                  } else {
                                    next.add(test.name)
                                  }
                                  return next
                                })
                              }}
                              className="w-3.5 h-3.5 accent-blue-600 cursor-pointer rounded"
                            />
                            <span className="text-[11px] text-slate-700 flex-1 truncate">{test.name}</span>
                            <span className="text-[9px] text-blue-600 shrink-0 truncate max-w-[150px]" title={`Tüp: ${test.tubeTypeName}`}>
                              Tüp: {test.tubeTypeName}
                            </span>
                            <span className="text-[9px] text-slate-400 shrink-0">
                              {test.protocols} protokolde · {test.count} adet
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            })()
          )}
        </div>

        {/* Alt butonlar */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] text-slate-400">
            {selectedBarcodeTests.size > 0
              ? `${selectedBarcodeTests.size} test seçili — barkodlar yazıcıya gönderilecek`
              : 'En az bir test seçin'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={onPrint}
              disabled={selectedBarcodeTests.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              {selectedBarcodeTests.size > 0 ? `${selectedBarcodeTests.size} Test Yazdır` : 'Yazdır'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
