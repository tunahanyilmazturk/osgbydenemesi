import { useState } from 'react'
import { Barcode, Check, Printer, RotateCcw, Save, Settings2 } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { useToast } from '@/state/ToastContext'
import { useProtocols } from '@/state/ProtocolsContext'
import { DEFAULT_BARCODE_SETTINGS, formatBarcode, loadBarcodeSettings, saveBarcodeSettings, type BarcodeSettings } from '@/shared/lib/barcodeSettings'

export function BarcodeSettings() {
  const { showToast } = useToast()
  const { protocols } = useProtocols()
  const [form, setForm] = useState<BarcodeSettings>(loadBarcodeSettings)

  const update = <K extends keyof BarcodeSettings>(key: K, value: BarcodeSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault()
    const normalized = {
      ...form,
      prefix: form.prefix.trim(),
      numberLength: Math.min(10, Math.max(1, Math.round(form.numberLength))),
      startNumber: Math.max(0, Math.round(form.startNumber)),
      copies: Math.min(10, Math.max(1, Math.round(form.copies))),
      labelWidth: Math.max(20, form.labelWidth),
      labelHeight: Math.max(10, form.labelHeight),
    }
    setForm(normalized)
    saveBarcodeSettings(normalized)
    showToast('success', 'Barkod ayarları kaydedildi', 'Yeni oluşturulacak barkodlarda geçerli olacaktır.')
  }

  const handleReset = () => {
    setForm(DEFAULT_BARCODE_SETTINGS)
    saveBarcodeSettings(DEFAULT_BARCODE_SETTINGS)
    showToast('info', 'Varsayılan ayarlara dönüldü')
  }

  const maxExistingSequence = protocols.reduce((max, protocol) =>
    protocol.services.reduce((serviceMax, service) => {
      const numericPart = Number(service.barcode.slice(-form.numberLength)) || 0
      return Math.max(serviceMax, numericPart)
    }, max), 0)
  const nextSequence = Math.max(form.startNumber, maxExistingSequence + 1)
  const sampleBarcode = formatBarcode(nextSequence, form)

  return (
    <div className="viewport-scroll space-y-3">
      <PageHeader
        title="Barkod Ayarları"
        subtitle="Barkod numarası, yazdırma ve etiket görünüm ayarlarını tek yerden yönetin."
      />

      <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 space-y-4">
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Barcode className="w-5 h-5 text-blue-600" /></div>
              <div><h2 className="text-sm font-bold text-slate-800">Numaralandırma</h2><p className="text-xs text-slate-400">Yeni hizmetlere otomatik atanacak barkod formatı</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input size="sm" label="Barkod Ön Eki" value={form.prefix} onChange={(e) => update('prefix', e.target.value.replace(/\s/g, ''))} placeholder="92" />
              <Input size="sm" label="Başlangıç Sırası" type="number" min="0" value={form.startNumber} onChange={(e) => update('startNumber', Number(e.target.value) || 0)} />
              <Input size="sm" label="Sıra Hane Sayısı" type="number" min="1" max="10" value={form.numberLength} onChange={(e) => update('numberLength', Number(e.target.value) || 1)} />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800"><span className="font-medium">Bir sonraki barkod:</span> <strong className="font-bold">{sampleBarcode}</strong> <span className="text-blue-600">(mevcut son sıra: {maxExistingSequence || '—'})</span><br /><span className="text-[10px] text-blue-600">Mevcut barkodlar değiştirilmez, ayarlar yeni barkodlarda uygulanır.</span></div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center"><Printer className="w-5 h-5 text-violet-600" /></div>
              <div><h2 className="text-sm font-bold text-slate-800">Yazdırma</h2><p className="text-xs text-slate-400">Barkod yazıcı ve çıktı davranışı</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select size="sm" label="Yazdırma Yöntemi" value={form.printerType} onChange={(e) => update('printerType', e.target.value as BarcodeSettings['printerType'])} options={[{ value: 'infoMed', label: 'InfoMed Barkod Yazıcı' }, { value: 'browser', label: 'Tarayıcı Yazdırma Penceresi' }]} />
              <Input size="sm" label="Kopya Sayısı" type="number" min="1" max="10" value={form.copies} onChange={(e) => update('copies', Number(e.target.value) || 1)} />
            </div>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60 cursor-pointer"><input type="checkbox" checked={form.autoPrint} onChange={(e) => update('autoPrint', e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><span><span className="block text-xs font-medium text-slate-700">Barkodu otomatik yazdır</span><span className="block text-[10px] text-slate-400 mt-0.5">Yeni barkod oluşturulduğunda yazdırma işlemini başlatır.</span></span></label>
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100"><div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center"><Settings2 className="w-5 h-5 text-emerald-600" /></div><div><h2 className="text-sm font-bold text-slate-800">Etiket İçeriği</h2><p className="text-xs text-slate-400">Barkod etiketinde gösterilecek bilgiler</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Toggle label="Hasta Adı" checked={form.showPatientName} onChange={(value) => update('showPatientName', value)} />
              <Toggle label="Firma Adı" checked={form.showCompanyName} onChange={(value) => update('showCompanyName', value)} />
              <Toggle label="Protokol Numarası" checked={form.showProtocolNo} onChange={(value) => update('showProtocolNo', value)} />
              <Toggle label="Hizmet Adı" checked={form.showServiceName} onChange={(value) => update('showServiceName', value)} />
              <Toggle label="Barkod Numarası" checked={form.showBarcodeNumber} onChange={(value) => update('showBarcodeNumber', value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"><Input size="sm" label="Etiket Genişliği (mm)" type="number" min="20" value={form.labelWidth} onChange={(e) => update('labelWidth', Number(e.target.value) || 20)} /><Input size="sm" label="Etiket Yüksekliği (mm)" type="number" min="10" value={form.labelHeight} onChange={(e) => update('labelHeight', Number(e.target.value) || 10)} /></div>
          </section>

          <div className="flex justify-end gap-2"><button type="button" onClick={handleReset} className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50"><RotateCcw className="w-4 h-4" />Varsayılanlara Dön</button><button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"><Save className="w-4 h-4" />Ayarları Kaydet</button></div>
        </div>

        <aside className="xl:col-span-4"><div className="bg-slate-900 rounded-2xl shadow-sm p-5 text-white sticky top-4"><div className="flex items-center justify-between mb-5"><div><h2 className="text-sm font-bold">Etiket Önizleme</h2><p className="text-[10px] text-slate-400 mt-1">Ayarlara göre örnek görünüm</p></div><Barcode className="w-5 h-5 text-blue-300" /></div><div className="bg-white text-slate-800 rounded-xl p-4 mx-auto" style={{ maxWidth: `${Math.min(320, form.labelWidth * 4)}px` }}><div className="text-center space-y-1">{form.showCompanyName && <p className="text-[9px] font-semibold truncate">ÇET-KA OSGB</p>}{form.showPatientName && <p className="text-[10px] font-bold truncate">Ahmet Yılmaz</p>}{form.showServiceName && <p className="text-[9px] text-slate-500 truncate">Tam Kan Sayımı (Hemogram)</p>}{form.showProtocolNo && <p className="text-[8px] text-slate-500">Protokol: 2026000001</p>}<div className="h-12 flex items-end justify-center gap-px pt-2 overflow-hidden">{Array.from({ length: 42 }, (_, index) => <span key={index} className="bg-slate-900" style={{ width: index % 5 === 0 ? 3 : 1, height: `${20 + (index * 17) % 25}px` }} />)}</div>{form.showBarcodeNumber && <p className="text-[10px] font-mono tracking-widest">{sampleBarcode}</p>}</div></div><div className="mt-5 grid grid-cols-2 gap-2 text-center"><div className="p-2 bg-white/10 rounded-lg"><p className="text-[10px] text-slate-400">Boyut</p><p className="text-xs font-semibold mt-1">{form.labelWidth} × {form.labelHeight} mm</p></div><div className="p-2 bg-white/10 rounded-lg"><p className="text-[10px] text-slate-400">Kopya</p><p className="text-xs font-semibold mt-1">{form.copies}</p></div></div></div></aside>
      </form>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60 cursor-pointer hover:bg-slate-50"><span className="text-xs font-medium text-slate-700">{label}</span><span className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" /><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}>{checked && <Check className="w-3 h-3 text-blue-600 m-0.5" />}</span></span></label>
}
