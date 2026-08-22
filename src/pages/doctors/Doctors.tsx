import { useMemo, useRef, useState } from 'react'
import { Save, Trash2, UserPlus, X, Stethoscope, Upload, Pencil, Trash, UserCog } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { loadDoctors, saveDoctors, TEST_TYPES, type Doctor, type DoctorAssistant, type TestType } from '../../utils/doctors'
import { useServices } from '../../context/ServicesContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

// Test türü etiketini olduğu gibi göster — hizmet tanımlarıyla birebir aynı olmalı
function displayTestLabel(testType: string): string {
  return testType
}

// Doktor ünvanları — seçmeli
const DOCTOR_TITLES = [
  'Uzman Doktor',
  'Operatör Doktor',
  'Pratisyen Hekim',
  'Aile Hekimi',
  'Göz Hastalıkları Uzmanı',
  'KBB (Kulak Burun Boğaz) Uzmanı',
  'Dahiliye (İç Hastalıkları) Uzmanı',
  'Göğüs Hastalıkları Uzmanı',
  'Radyoloji Uzmanı',
  'Kardiyoloji Uzmanı',
  'Nöroloji Uzmanı',
  'Ortopedi Uzmanı',
  'Dermatoloji Uzmanı',
  'Psikiyatri Uzmanı',
  'Genel Cerrahi Uzmanı',
  'İş Sağlığı ve Güvenliği Uzmanı',
  'Odyometrist',
  'Hemşire',
  'Sağlık Teknikeri',
  'Diğer',
]

const EMPTY_DOCTOR: Omit<Doctor, 'id'> = {
  name: '',
  title: '',
  testType: 'GÖZ TARAMASI (otorefraktometre)',
  stamp: '',
  assistants: [],
}

const EMPTY_ASSISTANT: Omit<DoctorAssistant, 'id'> = {
  userId: '',
  testType: 'İşitme Testi (ODYOMETRİ)',
}

export function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>(loadDoctors())
  const { showToast } = useToast()
  const confirmDialog = useConfirm()
  const { catalog } = useServices()
  const { users, roles } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDoctor, setEditDoctor] = useState<Omit<Doctor, 'id'>>({ ...EMPTY_DOCTOR })
  const [newDoctor, setNewDoctor] = useState({ ...EMPTY_DOCTOR })
  const [error, setError] = useState('')
  const [editError, setEditError] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const editFileRef = useRef<HTMLInputElement | null>(null)

  // Dinamik test türleri — hizmet kataloğundan + sabit türler (tekrarsız)
  const availableTestTypes = useMemo(() => {
    const serviceNames = catalog
      .map((item) => item.name)
      .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
    return Array.from(new Set([...serviceNames, ...TEST_TYPES]))
  }, [catalog])

  // Asistan yönetimi — hangi doktora asistan ekleniyor
  const [assistantModalDoctorId, setAssistantModalDoctorId] = useState<string | null>(null)
  const [newAssistant, setNewAssistant] = useState<Omit<DoctorAssistant, 'id'>>({ ...EMPTY_ASSISTANT })
  const [assistantError, setAssistantError] = useState('')

  const persist = (updated: Doctor[]) => {
    setDoctors(updated)
    saveDoctors(updated)
  }

  const handleAdd = async () => {
    if (!newDoctor.name.trim()) {
      setError('Doktor adı zorunludur.')
      return
    }
    if (!newDoctor.testType) {
      setError('Test türü seçiniz.')
      return
    }
    // Aynı test türüne başka doktor atanmış mı? (tek persist ile çöz)
    const existing = doctors.find((d) => d.testType === newDoctor.testType)
    let baseList = doctors
    if (existing) {
      const ok = await confirmDialog({
        title: 'Üzerine Yazılsın mı?',
        message: `"${displayTestLabel(newDoctor.testType)}" testi zaten ${existing.name} doktoruna atanmış. Üzerine yazılsın mı?`,
        confirmText: 'Üzerine Yaz',
        cancelText: 'İptal',
        confirmVariant: 'danger',
      })
      if (!ok) return
      baseList = doctors.filter((d) => d.id !== existing.id)
    }
    const doctor: Doctor = {
      ...newDoctor,
      id: `doc_${Date.now()}`,
    }
    persist([...baseList, doctor])
    setNewDoctor({ ...EMPTY_DOCTOR })
    setShowAdd(false)
    setError('')
    showToast('success', 'Doktor eklendi.')
  }

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirmDialog({
      title: 'Doktor Sil',
      message: `${name} silinsin mi?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      confirmVariant: 'danger',
    })
    if (!ok) return
    persist(doctors.filter((d) => d.id !== id))
    showToast('success', 'Doktor silindi.')
  }

  const handleStartEdit = (doctor: Doctor) => {
    setEditingId(doctor.id)
    setEditDoctor({ name: doctor.name, title: doctor.title, testType: doctor.testType, stamp: doctor.stamp })
    setEditError('')
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    if (!editDoctor.name.trim()) {
      setEditError('Doktor adı zorunludur.')
      return
    }
    // Test türü değiştiyse çakışma kontrolü
    const current = doctors.find((d) => d.id === editingId)
    if (current && current.testType !== editDoctor.testType) {
      const conflict = doctors.find((d) => d.id !== editingId && d.testType === editDoctor.testType)
      if (conflict) {
        const ok = await confirmDialog({
          title: 'Üzerine Yazılsın mı?',
          message: `"${displayTestLabel(editDoctor.testType)}" testi zaten ${conflict.name} doktoruna atanmış. Üzerine yazılsın mı?`,
          confirmText: 'Üzerine Yaz',
          cancelText: 'İptal',
          confirmVariant: 'danger',
        })
        if (!ok) return
        persist(doctors.filter((d) => d.id !== conflict.id).map((d) => (d.id === editingId ? { ...d, ...editDoctor } : d)))
      } else {
        persist(doctors.map((d) => (d.id === editingId ? { ...d, ...editDoctor } : d)))
      }
    } else {
      persist(doctors.map((d) => (d.id === editingId ? { ...d, ...editDoctor } : d)))
    }
    setEditingId(null)
    setEditDoctor({ ...EMPTY_DOCTOR })
    setEditError('')
    showToast('success', 'Doktor güncellendi.')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditDoctor({ ...EMPTY_DOCTOR })
    setEditError('')
  }

  const handleStampUpload = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setNewDoctor((prev) => ({ ...prev, stamp: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleEditStampUpload = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setEditDoctor((prev) => ({ ...prev, stamp: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveStamp = (id: string) => {
    persist(doctors.map((d) => (d.id === id ? { ...d, stamp: '' } : d)))
  }

  // === ASISTAN YÖNETİMİ ===
  const openAssistantModal = (doctorId: string) => {
    setAssistantModalDoctorId(doctorId)
    setNewAssistant({ ...EMPTY_ASSISTANT })
    setAssistantError('')
  }

  const closeAssistantModal = () => {
    setAssistantModalDoctorId(null)
    setNewAssistant({ ...EMPTY_ASSISTANT })
    setAssistantError('')
  }

  const handleAddAssistant = () => {
    if (!assistantModalDoctorId) return
    if (!newAssistant.userId) {
      setAssistantError('Lütfen bir kullanıcı seçiniz.')
      return
    }
    if (!newAssistant.testType) {
      setAssistantError('Test türü seçiniz.')
      return
    }
    // Aynı kullanıcı zaten asistan olarak eklenmiş mi?
    const targetDoctor = doctors.find((d) => d.id === assistantModalDoctorId)
    const existing = targetDoctor?.assistants?.find((a) => a.userId === newAssistant.userId)
    if (existing) {
      setAssistantError('Bu kullanıcı zaten asistan olarak eklenmiş.')
      return
    }
    const assistant: DoctorAssistant = {
      ...newAssistant,
      id: `ast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    }
    persist(
      doctors.map((d) =>
        d.id === assistantModalDoctorId
          ? { ...d, assistants: [...(d.assistants ?? []), assistant] }
          : d
      )
    )
    showToast('success', 'Asistan eklendi.')
    closeAssistantModal()
  }

  const handleDeleteAssistant = async (doctorId: string, assistantId: string, assistantName: string) => {
    const ok = await confirmDialog({
      title: 'Asistan Sil',
      message: `${assistantName} silinsin mi?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      confirmVariant: 'danger',
    })
    if (!ok) return
    persist(
      doctors.map((d) =>
        d.id === doctorId
          ? { ...d, assistants: (d.assistants ?? []).filter((a) => a.id !== assistantId) }
          : d
      )
    )
    showToast('success', 'Asistan silindi.')
  }

  // Kullanıcı bilgisi helper
  const getUserInfo = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return { name: 'Bilinmeyen kullanıcı', roleName: '-', stamp: '' }
    const role = roles.find((r) => r.id === user.roleId)
    return {
      name: user.displayName,
      roleName: role?.name ?? '-',
      stamp: user.stamp ?? '',
    }
  }

  return (
    <div className="space-y-4 h-full flex flex-col min-h-0">
      <PageHeader
        title="Doktor Tanımları"
        subtitle="Doktorları yönetin, kaşe yükleyin ve test türleriyle eşleyin."
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Yeni Doktor
          </button>
        }
      />

      {/* Doktor Listesi */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex-1 min-h-0 overflow-y-auto">
        {doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Stethoscope className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">Henüz doktor eklenmedi</p>
            <p className="text-xs text-slate-400 mt-1">
              Doktor ekleyip test türüyle eşleyerek kaşelerini raporlara otomatik yerleştirin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {doctors.map((doctor) => {
              const isEditing = editingId === doctor.id
              return (
                <div
                  key={doctor.id}
                  className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  {isEditing ? (
                    /* ===== Düzenleme Modu ===== */
                    <div className="space-y-3">
                      {editError && (
                        <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg border border-red-200">
                          {editError}
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Adı Soyadı</label>
                        <input
                          type="text"
                          value={editDoctor.name}
                          onChange={(e) => setEditDoctor({ ...editDoctor, name: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Ünvan</label>
                        <select
                          value={editDoctor.title}
                          onChange={(e) => setEditDoctor({ ...editDoctor, title: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="">— Ünvan seçiniz —</option>
                          {DOCTOR_TITLES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Test Türü</label>
                        <SearchableSelect
                          value={editDoctor.testType}
                          onChange={(v) => setEditDoctor({ ...editDoctor, testType: v as TestType })}
                          options={availableTestTypes}
                          placeholder="— Test türü seçiniz —"
                          searchPlaceholder="Test ara..."
                        />
                      </div>
                      {/* Kaşe alanı (edit) */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">Kaşe</label>
                        <div className="relative h-20 bg-slate-50 rounded-lg border border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                          {editDoctor.stamp ? (
                            <img src={editDoctor.stamp} alt="Kaşe" className="h-full w-full object-contain" />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-slate-400">
                              <Upload className="w-4 h-4" />
                              <span className="text-[10px]">Kaşe yükle</span>
                            </div>
                          )}
                          <input
                            ref={editFileRef}
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleEditStampUpload(e.target.files?.[0] ?? null)}
                          />
                        </div>
                        {editDoctor.stamp && (
                          <button
                            onClick={() => setEditDoctor({ ...editDoctor, stamp: '' })}
                            className="mt-1 text-[10px] text-red-500 hover:text-red-600 font-medium"
                          >
                            Kaşeyi kaldır
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Kaydet
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ===== Görüntüleme Modu ===== */
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Stethoscope className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{doctor.name}</p>
                            {doctor.title && (
                              <p className="text-xs text-slate-500">{doctor.title}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(doctor)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Düzenle"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doctor.id, doctor.name)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                          {displayTestLabel(doctor.testType)}
                        </span>
                      </div>

                      {/* Kaşe alanı */}
                      <div className="relative h-24 bg-slate-50 rounded-lg border border-dashed border-slate-300 flex items-center justify-center overflow-hidden group">
                        {doctor.stamp ? (
                          <img
                            src={doctor.stamp}
                            alt="Kaşe"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <Upload className="w-5 h-5" />
                            <span className="text-[10px]">Kaşe yüklenmedi</span>
                          </div>
                        )}
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <span className="text-white text-xs font-medium">
                            {doctor.stamp ? 'Kaşeyi Değiştir' : 'Kaşe Yükle'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null
                              if (file) {
                                const reader = new FileReader()
                                reader.onload = () => {
                                  persist(doctors.map((d) => (d.id === doctor.id ? { ...d, stamp: reader.result as string } : d)))
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                          />
                        </label>
                      </div>
                      {doctor.stamp && (
                        <button
                          onClick={() => handleRemoveStamp(doctor.id)}
                          className="mt-1.5 flex items-center gap-1 text-[10px] text-red-500 hover:text-red-600 font-medium"
                        >
                          <Trash className="w-3 h-3" />
                          Kaşeyi Kaldır
                        </button>
                      )}

                      {/* Asistanlar bölümü */}
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                            <UserCog className="w-3 h-3" />
                            BAĞLI ASISTANLAR
                          </span>
                          <button
                            onClick={() => openAssistantModal(doctor.id)}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <UserPlus className="w-3 h-3" />
                            Ekle
                          </button>
                        </div>
                        {(doctor.assistants ?? []).length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic">Henüz asistan eklenmedi.</p>
                        ) : (
                          <div className="space-y-2">
                            {(doctor.assistants ?? []).map((ast) => {
                              const info = getUserInfo(ast.userId)
                              return (
                                <div key={ast.id} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                  <div className="flex items-start justify-between mb-1.5">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-slate-700 truncate">{info.name}</p>
                                      <p className="text-[10px] text-slate-500 truncate">{info.roleName}</p>
                                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-medium">
                                        {displayTestLabel(ast.testType)}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteAssistant(doctor.id, ast.id, info.name)}
                                      className="shrink-0 p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
                                      title="Sil"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {/* Asistan kaşesi — kullanıcıdan */}
                                  <div className="h-14 bg-white rounded border border-slate-200 flex items-center justify-center overflow-hidden">
                                    {info.stamp ? (
                                      <img src={info.stamp} alt="Kaşe" className="h-full w-full object-contain" />
                                    ) : (
                                      <span className="text-[9px] text-slate-400">Kullanıcı kaşesi yok (Kullanıcı Tanımları'ndan ekleyin)</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Yeni Doktor Ekleme Modalı */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">Yeni Doktor</h3>
                <p className="text-xs text-slate-500 mt-0.5">Doktor bilgileri ve bağlı asistanlar</p>
              </div>
              <button
                onClick={() => {
                  setShowAdd(false)
                  setNewDoctor({ ...EMPTY_DOCTOR })
                  setError('')
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && (
                <div className="mb-4 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Doktor Bilgileri */}
                <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" />
                    Doktor Bilgileri
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Adı Soyadı</label>
                      <input
                        type="text"
                        value={newDoctor.name}
                        onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                        placeholder="Örn: Dr. Ahmet Yılmaz"
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Ünvan</label>
                      <select
                        value={newDoctor.title}
                        onChange={(e) => setNewDoctor({ ...newDoctor, title: e.target.value })}
                        className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">— Ünvan seçiniz —</option>
                        {DOCTOR_TITLES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Test Türü</label>
                      <SearchableSelect
                        value={newDoctor.testType}
                        onChange={(v) => setNewDoctor({ ...newDoctor, testType: v as TestType })}
                        options={availableTestTypes}
                        placeholder="— Test türü seçiniz —"
                        searchPlaceholder="Test ara..."
                      />
                    </div>
                  </div>
                  {/* Doktor kaşesi */}
                  <div className="mt-3">
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Doktor Kaşesi</label>
                    <div className="relative h-20 bg-white rounded-lg border border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                      {newDoctor.stamp ? (
                        <img src={newDoctor.stamp} alt="Kaşe" className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <Upload className="w-5 h-5" />
                          <span className="text-[10px]">Kaşe görseli seçin</span>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => handleStampUpload(e.target.files?.[0] ?? null)}
                      />
                    </div>
                    {newDoctor.stamp && (
                      <button
                        onClick={() => setNewDoctor({ ...newDoctor, stamp: '' })}
                        className="mt-1 text-[10px] text-red-500 hover:text-red-600 font-medium"
                      >
                        Kaşeyi kaldır
                      </button>
                    )}
                  </div>
                </div>

                {/* Bağlı Asistanlar */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                      <UserCog className="w-3 h-3" />
                      Bağlı Asistanlar
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNewDoctor((prev) => ({
                          ...prev,
                          assistants: [
                            ...(prev.assistants ?? []),
                            { ...EMPTY_ASSISTANT, id: `ast_new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` },
                          ],
                        }))
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <UserPlus className="w-3 h-3" />
                      Asistan Ekle
                    </button>
                  </div>

                  {(newDoctor.assistants ?? []).length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2 text-center">
                      Henüz asistan eklenmedi. Doktor tek başına çalışıyorsa bu alanı boş bırakabilirsiniz.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(newDoctor.assistants ?? []).map((ast, idx) => {
                        const info = ast.userId ? getUserInfo(ast.userId) : null
                        return (
                          <div key={ast.id} className="bg-white rounded-lg p-2.5 border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-slate-500">Asistan #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewDoctor((prev) => ({
                                    ...prev,
                                    assistants: (prev.assistants ?? []).filter((a) => a.id !== ast.id),
                                  }))
                                }}
                                className="p-0.5 text-slate-300 hover:text-red-500 rounded transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <select
                              value={ast.userId}
                              onChange={(e) => {
                                setNewDoctor((prev) => ({
                                  ...prev,
                                  assistants: (prev.assistants ?? []).map((a) =>
                                    a.id === ast.id ? { ...a, userId: e.target.value } : a
                                  ),
                                }))
                              }}
                              className="w-full px-2 py-1.5 mb-2 bg-slate-50 border border-slate-200 rounded text-[11px] focus:outline-none focus:border-blue-500"
                            >
                              <option value="">— Kullanıcı seç —</option>
                              {users.filter((u) => u.isActive).map((u) => {
                                const role = roles.find((r) => r.id === u.roleId)
                                return (
                                  <option key={u.id} value={u.id}>
                                    {u.displayName} ({role?.name ?? '-'}){u.stamp ? ' ✓' : ''}
                                  </option>
                                )
                              })}
                            </select>
                            <SearchableSelect
                              value={ast.testType}
                              onChange={(v) => {
                                setNewDoctor((prev) => ({
                                  ...prev,
                                  assistants: (prev.assistants ?? []).map((a) =>
                                    a.id === ast.id ? { ...a, testType: v as TestType } : a
                                  ),
                                }))
                              }}
                              options={availableTestTypes}
                              placeholder="— Test seç —"
                              searchPlaceholder="Test ara..."
                              className="mb-2"
                            />
                            {/* Kullanıcı kaşesi önizleme */}
                            {info && (
                              <div className="h-12 bg-slate-50 rounded border border-slate-200 flex items-center justify-center overflow-hidden">
                                {info.stamp ? (
                                  <img src={info.stamp} alt="Kaşe" className="h-full w-full object-contain" />
                                ) : (
                                  <span className="text-[9px] text-slate-400">Kaşe yok</span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => {
                  setShowAdd(false)
                  setNewDoctor({ ...EMPTY_DOCTOR })
                  setError('')
                }}
                className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asistan Ekleme Modalı */}
      {assistantModalDoctorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-800">Bağlı Asistan Ekle</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {doctors.find((d) => d.id === assistantModalDoctorId)?.name} doktoruna bağlı asistan
                </p>
              </div>
              <button
                onClick={closeAssistantModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assistantError && (
              <div className="mb-4 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg border border-red-200">
                {assistantError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kullanıcı Seç</label>
                <select
                  value={newAssistant.userId}
                  onChange={(e) => setNewAssistant({ ...newAssistant, userId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                >
                  <option value="">— Kullanıcı seçiniz —</option>
                  {users.filter((u) => u.isActive).map((u) => {
                    const role = roles.find((r) => r.id === u.roleId)
                    return (
                      <option key={u.id} value={u.id}>
                        {u.displayName} ({role?.name ?? '-'}){u.stamp ? ' ✓ kaşe' : ''}
                      </option>
                    )
                  })}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Kullanıcının adı, rolü ve kaşesi otomatik olarak kullanılır. Kaşe yoksa Kullanıcı Tanımları'ndan ekleyebilirsiniz.
                </p>
              </div>

              {newAssistant.userId && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {(() => {
                    const info = getUserInfo(newAssistant.userId)
                    return (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {info.stamp ? (
                            <img src={info.stamp} alt="Kaşe" className="h-full w-full object-contain" />
                          ) : (
                            <Upload className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{info.name}</p>
                          <p className="text-xs text-slate-500">{info.roleName}</p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Test Türü</label>
                <SearchableSelect
                  value={newAssistant.testType}
                  onChange={(v) => setNewAssistant({ ...newAssistant, testType: v as TestType })}
                  options={availableTestTypes}
                  placeholder="— Test türü seçiniz —"
                  searchPlaceholder="Test ara..."
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Bu asistanın kaşesi, seçilen testin PDF raporunda doktor kaşesiyle birlikte yer alacak.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={closeAssistantModal}
                className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddAssistant}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
