export const PERMISSION_GROUPS = [
  {
    id: 'dashboard',
    label: 'Ana Sayfa',
    description: 'Özet göstergeler ve yönetim paneli',
    items: [
      { label: 'Ana Sayfa', description: 'Özet kartları ve grafikleri görüntüler.', permissions: [{ key: 'dashboard.view', label: 'Görüntüle' }] },
    ],
  },
  {
    id: 'patients',
    label: 'Hasta Kayıt Kabul',
    description: 'Hasta kartları ve protokol işlemleri',
    items: [
      { label: 'Hasta Listesi', description: 'Hasta kayıtlarını listeler ve inceler.', permissions: [{ key: 'patients.view', label: 'Görüntüle' }, { key: 'patients.manage', label: 'Ekle / Düzenle' }] },
      { label: 'Protokoller', description: 'Hasta protokollerini ve detaylarını yönetir.', permissions: [{ key: 'protocols.view', label: 'Görüntüle' }, { key: 'protocols.manage', label: 'Oluştur / Düzenle' }] },
    ],
  },
  {
    id: 'laboratory',
    label: 'Laboratuvar İşlemleri',
    description: 'Sonuç, onay ve dış laboratuvar süreçleri',
    items: [
      { label: 'Sonuç İşlemleri', description: 'Hasta sonuç ekranını kullanır.', permissions: [{ key: 'lab.results.view', label: 'Görüntüle' }, { key: 'lab.results.manage', label: 'Sonuç Gir / Düzenle' }, { key: 'lab.results.approve', label: 'Onayla' }] },
      { label: 'Laboratuvar', description: 'Laboratuvar çalışma listesini kullanır.', permissions: [{ key: 'lab.workspace.view', label: 'Görüntüle' }, { key: 'lab.workspace.manage', label: 'Yönet' }] },
      { label: 'Hızlı Onay', description: 'Toplu sonuç onay ekranına erişir.', permissions: [{ key: 'lab.quickApproval.view', label: 'Görüntüle' }, { key: 'lab.quickApproval.manage', label: 'Onayla' }] },
      { label: 'Dış Lab Gönderim', description: 'Dış laboratuvara gönderim oluşturur.', permissions: [{ key: 'lab.externalSend.view', label: 'Görüntüle' }, { key: 'lab.externalSend.manage', label: 'Gönderim Yap' }] },
      { label: 'Dış Lab İzlem', description: 'Gönderilen testleri ve sonuçları izler.', permissions: [{ key: 'lab.externalTrack.view', label: 'Görüntüle' }, { key: 'lab.externalTrack.manage', label: 'Güncelle' }] },
      { label: 'N.Red Nedenleri', description: 'Numune ret nedenlerini yönetir.', permissions: [{ key: 'lab.rejectionReasons.view', label: 'Görüntüle' }, { key: 'lab.rejectionReasons.manage', label: 'Yönet' }] },
      { label: 'Muayene Onayları', description: 'Uzmanlık muayenelerinde onay yetkisi verir.', permissions: [{ key: 'examinations.audiometry.approve', label: 'Odyometri' }, { key: 'examinations.eye.approve', label: 'Göz Muayenesi' }] },
    ],
  },
  {
    id: 'accounting',
    label: 'Ön Muhasebe',
    description: 'Kasa, borç ve fatura süreçleri',
    items: [
      { label: 'Kasa Raporu', description: 'Kasa özetini ve raporları görüntüler.', permissions: [{ key: 'accounting.report.view', label: 'Görüntüle' }, { key: 'accounting.report.export', label: 'Yazdır / Aktar' }] },
      { label: 'Kasa Transfer', description: 'Kasalar arası para transferlerini yönetir.', permissions: [{ key: 'accounting.transfer.view', label: 'Görüntüle' }, { key: 'accounting.transfer.manage', label: 'Transfer Yap' }] },
      { label: 'Kasa Hareketleri', description: 'Gelir ve gider hareketlerini yönetir.', permissions: [{ key: 'accounting.movements.view', label: 'Görüntüle' }, { key: 'accounting.movements.manage', label: 'Ekle / Düzenle' }] },
      { label: 'Borçlu Hastalar', description: 'Hasta borçlarını ve tahsilatları yönetir.', permissions: [{ key: 'accounting.debtors.view', label: 'Görüntüle' }, { key: 'accounting.debtors.manage', label: 'Tahsilat Yap' }] },
      { label: 'Fatura İcmal', description: 'Firma bazlı fatura icmallerini görüntüler.', permissions: [{ key: 'accounting.invoice.view', label: 'Görüntüle' }, { key: 'accounting.invoice.export', label: 'Yazdır / Aktar' }] },
    ],
  },
  {
    id: 'statistics',
    label: 'İstatistikler',
    description: 'Gün sonu ve analiz raporları',
    items: [
      { label: 'Gün Sonu Raporu', description: 'İstatistik ve rapor ekranını kullanır.', permissions: [{ key: 'statistics.view', label: 'Görüntüle' }, { key: 'statistics.export', label: 'Yazdır / Aktar' }] },
    ],
  },
  {
    id: 'settings',
    label: 'Genel Ayarlar',
    description: 'Kurum ve sistem tanımları',
    items: [
      { label: 'Kurum Bilgileri', description: 'Kurum bilgileri ve logosu.', permissions: [{ key: 'settings.institution.view', label: 'Görüntüle' }, { key: 'settings.institution.manage', label: 'Düzenle' }] },
      { label: 'SMS Ayarları', description: 'SMS sağlayıcısı, şablonlar ve kayıtlar.', permissions: [{ key: 'settings.sms.view', label: 'Görüntüle' }, { key: 'settings.sms.manage', label: 'Düzenle' }] },
      { label: 'Barkod Ayarları', description: 'Barkod tasarımı ve yazdırma ayarları.', permissions: [{ key: 'settings.barcode.view', label: 'Görüntüle' }, { key: 'settings.barcode.manage', label: 'Düzenle' }] },
      { label: 'Göz Muayenesi Şablonları', description: 'Göz muayenesi metin şablonları.', permissions: [{ key: 'settings.eyeTemplates.view', label: 'Görüntüle' }, { key: 'settings.eyeTemplates.manage', label: 'Yönet' }] },
      { label: 'Doktor Tanımları', description: 'Doktorlar, branşlar ve kaşeler.', permissions: [{ key: 'settings.doctors.view', label: 'Görüntüle' }, { key: 'settings.doctors.manage', label: 'Yönet' }] },
      { label: 'Hizmet Tüp Tipleri', description: 'Numune tüp tipi tanımları.', permissions: [{ key: 'settings.tubeTypes.view', label: 'Görüntüle' }, { key: 'settings.tubeTypes.manage', label: 'Yönet' }] },
      { label: 'Hizmet Tanımları', description: 'Tetkik ve hizmet kataloğu.', permissions: [{ key: 'settings.services.view', label: 'Görüntüle' }, { key: 'settings.services.manage', label: 'Yönet' }] },
      { label: 'Hizmet Paketleri', description: 'Paket içerikleri ve fiyatları.', permissions: [{ key: 'settings.packages.view', label: 'Görüntüle' }, { key: 'settings.packages.manage', label: 'Yönet' }] },
      { label: 'Firma Tanımları', description: 'Firmalar, fiyatlar ve anlaşmalar.', permissions: [{ key: 'settings.companies.view', label: 'Görüntüle' }, { key: 'settings.companies.manage', label: 'Yönet' }] },
      { label: 'OSGB Tanımları', description: 'OSGB kayıt ve iletişim bilgileri.', permissions: [{ key: 'settings.osgb.view', label: 'Görüntüle' }, { key: 'settings.osgb.manage', label: 'Yönet' }] },
      { label: 'Muayene Türleri', description: 'Muayene tipi tanımları.', permissions: [{ key: 'settings.examTypes.view', label: 'Görüntüle' }, { key: 'settings.examTypes.manage', label: 'Yönet' }] },
      { label: 'Dış Laboratuvarlar', description: 'Dış laboratuvar bağlantı tanımları.', permissions: [{ key: 'settings.externalLabs.view', label: 'Görüntüle' }, { key: 'settings.externalLabs.manage', label: 'Yönet' }] },
      { label: 'Kasa Tanımları', description: 'Kasa ve ödeme noktaları.', permissions: [{ key: 'settings.cash.view', label: 'Görüntüle' }, { key: 'settings.cash.manage', label: 'Yönet' }] },
      { label: 'Web Sonuç Kullanıcıları', description: 'Firma web sonuç hesapları.', permissions: [{ key: 'settings.webUsers.view', label: 'Görüntüle' }, { key: 'settings.webUsers.manage', label: 'Yönet' }] },
      { label: 'Ek-2 Ayarları', description: 'Test sonuçlarının Ek-2 alanlarına aktarım eşleştirmeleri.', permissions: [{ key: 'settings.ek2.view', label: 'Görüntüle' }, { key: 'settings.ek2.manage', label: 'Yönet' }] },
      { label: 'Kullanıcı Yönetimi', description: 'Kullanıcıları ve rolleri yönetir.', permissions: [{ key: 'settings.users.view', label: 'Görüntüle' }, { key: 'settings.users.manage', label: 'Yönet' }] },
    ],
  },
] as const

export type PermissionKey = typeof PERMISSION_GROUPS[number]['items'][number]['permissions'][number]['key']

export const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_GROUPS.flatMap((group) =>
  group.items.flatMap((item) => item.permissions.map((permission) => permission.key)),
)

export const VIEW_PERMISSIONS: PermissionKey[] = ALL_PERMISSIONS.filter((permission) => permission.endsWith('.view'))

const MANAGE_REQUIREMENTS: Partial<Record<PermissionKey, PermissionKey>> = {
  'protocols.view': 'patients.view',
  'patients.manage': 'patients.view',
  'protocols.manage': 'protocols.view',
  'lab.results.manage': 'lab.results.view',
  'lab.results.approve': 'lab.results.view',
  'examinations.audiometry.approve': 'lab.results.view',
  'examinations.eye.approve': 'lab.results.view',
  'lab.workspace.manage': 'lab.workspace.view',
  'lab.quickApproval.manage': 'lab.quickApproval.view',
  'lab.externalSend.manage': 'lab.externalSend.view',
  'lab.externalTrack.manage': 'lab.externalTrack.view',
  'lab.rejectionReasons.manage': 'lab.rejectionReasons.view',
  'accounting.report.export': 'accounting.report.view',
  'accounting.transfer.manage': 'accounting.transfer.view',
  'accounting.movements.manage': 'accounting.movements.view',
  'accounting.debtors.manage': 'accounting.debtors.view',
  'accounting.invoice.export': 'accounting.invoice.view',
  'statistics.export': 'statistics.view',
  'settings.institution.manage': 'settings.institution.view',
  'settings.sms.manage': 'settings.sms.view',
  'settings.barcode.manage': 'settings.barcode.view',
  'settings.eyeTemplates.manage': 'settings.eyeTemplates.view',
  'settings.doctors.manage': 'settings.doctors.view',
  'settings.tubeTypes.manage': 'settings.tubeTypes.view',
  'settings.services.manage': 'settings.services.view',
  'settings.packages.manage': 'settings.packages.view',
  'settings.companies.manage': 'settings.companies.view',
  'settings.osgb.manage': 'settings.osgb.view',
  'settings.examTypes.manage': 'settings.examTypes.view',
  'settings.externalLabs.manage': 'settings.externalLabs.view',
  'settings.cash.manage': 'settings.cash.view',
  'settings.webUsers.manage': 'settings.webUsers.view',
  'settings.ek2.manage': 'settings.ek2.view',
  'settings.users.manage': 'settings.users.view',
}

export function normalizePermissions(permissions: PermissionKey[]): PermissionKey[] {
  const valid = new Set(permissions.filter((permission) => ALL_PERMISSIONS.includes(permission)))
  let changed = true
  while (changed) {
    changed = false
    for (const permission of Array.from(valid)) {
      const requirement = MANAGE_REQUIREMENTS[permission]
      if (requirement && !valid.has(requirement)) {
        valid.add(requirement)
        changed = true
      }
    }
  }
  return ALL_PERMISSIONS.filter((permission) => valid.has(permission))
}

export function togglePermission(current: PermissionKey[], permission: PermissionKey): PermissionKey[] {
  const next = new Set(current)
  if (next.has(permission)) {
    next.delete(permission)
    let changed = true
    while (changed) {
      changed = false
      for (const [dependent, requirement] of Object.entries(MANAGE_REQUIREMENTS) as Array<[PermissionKey, PermissionKey]>) {
        if (!next.has(requirement) && next.delete(dependent)) changed = true
      }
    }
  } else {
    next.add(permission)
  }
  return normalizePermissions(Array.from(next))
}

const ROUTE_RULES: Array<{ pattern: RegExp; permission: PermissionKey }> = [
  { pattern: /^\/$/, permission: 'dashboard.view' },
  { pattern: /^\/hasta-kayit\/yeni$/, permission: 'patients.manage' },
  { pattern: /^\/hasta-kayit\/protokol\/[^/]+\/yeni$/, permission: 'protocols.manage' },
  { pattern: /^\/hasta-kayit\/protokol\/[^/]+(?:\/[^/]+)?$/, permission: 'protocols.view' },
  { pattern: /^\/hasta-kayit$/, permission: 'patients.view' },
  { pattern: /^\/laboratuvar$/, permission: 'lab.results.view' },
  { pattern: /^\/laboratuvar\/laboratuvar$/, permission: 'lab.workspace.view' },
  { pattern: /^\/laboratuvar\/hizli-onay$/, permission: 'lab.quickApproval.view' },
  { pattern: /^\/laboratuvar\/dis-lab-gonderim\/yeni$/, permission: 'lab.externalSend.manage' },
  { pattern: /^\/laboratuvar\/dis-lab-gonderim$/, permission: 'lab.externalSend.view' },
  { pattern: /^\/laboratuvar\/dis-lab-izlem$/, permission: 'lab.externalTrack.view' },
  { pattern: /^\/laboratuvar\/nred-nedenleri$/, permission: 'lab.rejectionReasons.view' },
  { pattern: /^\/muhasebe(?:\/kasa-raporu)?$/, permission: 'accounting.report.view' },
  { pattern: /^\/muhasebe\/transfer$/, permission: 'accounting.transfer.view' },
  { pattern: /^\/muhasebe\/hareketler$/, permission: 'accounting.movements.view' },
  { pattern: /^\/muhasebe\/borclular$/, permission: 'accounting.debtors.view' },
  { pattern: /^\/muhasebe\/fatura-icmal$/, permission: 'accounting.invoice.view' },
  { pattern: /^\/istatistikler$/, permission: 'statistics.view' },
  { pattern: /^\/ayarlar$/, permission: 'settings.institution.view' },
  { pattern: /^\/ayarlar\/sms$/, permission: 'settings.sms.view' },
  { pattern: /^\/ayarlar\/barkod$/, permission: 'settings.barcode.view' },
  { pattern: /^\/ayarlar\/goz-muayenesi-sablonlari$/, permission: 'settings.eyeTemplates.view' },
  { pattern: /^\/ayarlar\/doktorlar$/, permission: 'settings.doctors.view' },
  { pattern: /^\/ayarlar\/hizmet-tup-tipleri$/, permission: 'settings.tubeTypes.view' },
  { pattern: /^\/ayarlar\/hizmetler$/, permission: 'settings.services.view' },
  { pattern: /^\/ayarlar\/paketler\/(?:yeni|duzenle\/[^/]+)$/, permission: 'settings.packages.manage' },
  { pattern: /^\/ayarlar\/paketler$/, permission: 'settings.packages.view' },
  { pattern: /^\/ayarlar\/firmalar\/(?:yeni|duzenle\/[^/]+)$/, permission: 'settings.companies.manage' },
  { pattern: /^\/ayarlar\/firmalar$/, permission: 'settings.companies.view' },
  { pattern: /^\/ayarlar\/osgb$/, permission: 'settings.osgb.view' },
  { pattern: /^\/ayarlar\/muayene-turleri$/, permission: 'settings.examTypes.view' },
  { pattern: /^\/ayarlar\/dis-laboratuvarlar$/, permission: 'settings.externalLabs.view' },
  { pattern: /^\/ayarlar\/kasalar$/, permission: 'settings.cash.view' },
  { pattern: /^\/ayarlar\/web-sonuc-kullanicilari$/, permission: 'settings.webUsers.view' },
  { pattern: /^\/ayarlar\/ek2-rapor-tanimlari$/, permission: 'settings.ek2.view' },
  { pattern: /^\/ayarlar\/kullanicilar$/, permission: 'settings.users.view' },
]

export function getRoutePermission(pathname: string): PermissionKey | null {
  return ROUTE_RULES.find((rule) => rule.pattern.test(pathname))?.permission ?? null
}

export function getFirstAccessiblePath(permissions: PermissionKey[]): string {
  const preferredPaths = [
    '/', '/hasta-kayit', '/laboratuvar', '/laboratuvar/laboratuvar', '/laboratuvar/hizli-onay',
    '/laboratuvar/dis-lab-gonderim', '/laboratuvar/dis-lab-izlem', '/laboratuvar/nred-nedenleri',
    '/muhasebe/kasa-raporu', '/muhasebe/transfer', '/muhasebe/hareketler', '/muhasebe/borclular',
    '/muhasebe/fatura-icmal', '/istatistikler', '/ayarlar', '/ayarlar/sms', '/ayarlar/barkod',
    '/ayarlar/goz-muayenesi-sablonlari', '/ayarlar/doktorlar', '/ayarlar/hizmet-tup-tipleri',
    '/ayarlar/hizmetler', '/ayarlar/paketler', '/ayarlar/firmalar', '/ayarlar/osgb',
    '/ayarlar/muayene-turleri', '/ayarlar/dis-laboratuvarlar', '/ayarlar/kasalar',
    '/ayarlar/web-sonuc-kullanicilari', '/ayarlar/ek2-rapor-tanimlari', '/ayarlar/kullanicilar',
  ]
  return preferredPaths.find((path) => {
    const permission = getRoutePermission(path)
    return permission ? permissions.includes(permission) : false
  }) ?? '/giris'
}
