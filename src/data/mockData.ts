import type { Activity, PatientDetail, Protocol, QuickAction, ScheduleItem, StatItem } from '../types'
import { nowLocalDate } from '../utils/date'

const today = () => nowLocalDate()

const yesterday = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const stats: StatItem[] = [
  {
    label: 'Bugünkü Hasta',
    value: 43,
    change: '+12%',
    trend: 'up',
    icon: 'Users',
    color: 'bg-blue-600',
  },
  {
    label: 'Bugünkü Hizmet',
    value: 591,
    change: '+8%',
    trend: 'up',
    icon: 'Activity',
    color: 'bg-emerald-600',
  },
  {
    label: 'Bekleyen Sonuç',
    value: 18,
    change: '-5%',
    trend: 'down',
    icon: 'FlaskConical',
    color: 'bg-amber-600',
  },
  {
    label: 'Tahsilat (Bugün)',
    value: '₺24.850',
    change: '+18%',
    trend: 'up',
    icon: 'Wallet',
    color: 'bg-violet-600',
  },
]

export const quickActions: QuickAction[] = [
  { label: 'Yeni Hasta', icon: 'UserPlus', color: 'bg-blue-600 hover:bg-blue-700' },
  { label: 'Protokol Oluştur', icon: 'FileText', color: 'bg-emerald-600 hover:bg-emerald-700' },
  { label: 'Sonuç Girişi', icon: 'FlaskConical', color: 'bg-amber-600 hover:bg-amber-700' },
  { label: 'Rapor Al', icon: 'Stethoscope', color: 'bg-violet-600 hover:bg-violet-700' },
]

export const todaySchedule: ScheduleItem[] = [
  { title: 'Ahmet Yılmaz - İşe Giriş Muayenesi', time: '11:30' },
  { title: 'ABC İnşaat toplu protokol onayı', time: '12:00' },
  { title: 'Laboratuvar sonuç kontrolü', time: '13:30' },
  { title: 'XYZ Lojistik fatura kesimi', time: '15:00' },
]

export const activities: Activity[] = [
  { text: 'Mehmet Kaya için protokol oluşturuldu', time: '5 dk önce' },
  { text: 'ABC İnşaat firmasına 12 hasta kaydı eklendi', time: '12 dk önce' },
  { text: 'Laboratuvar sonuçları güncellendi', time: '28 dk önce' },
  { text: 'XYZ Lojistik faturası hazırlandı', time: '1 saat önce' },
]

export const allPatients: PatientDetail[] = [
  {
    id: 1,
    name: 'Ahmet Yılmaz',
    tc: '12345678901',
    company: 'ABC İnşaat',
    type: 'İşe Giriş',
    status: 'Bekliyor',
    time: '09:15',
    createdAt: `${yesterday()}T09:15`,
    phone: '0555 123 45 67',
    email: 'ahmet.yilmaz@email.com',
    birthDate: '1985-04-12',
    gender: 'Erkek',
    address: 'İstanbul, Kadıköy',
  },
  {
    id: 2,
    name: 'Mehmet Kaya',
    tc: '23456789012',
    company: 'XYZ Lojistik',
    type: 'Periyodik',
    status: 'Tamamlandı',
    time: '09:42',
    createdAt: `${yesterday()}T09:42`,
    phone: '0532 987 65 43',
    email: 'mehmet.kaya@email.com',
    birthDate: '1979-11-03',
    gender: 'Erkek',
    address: 'İstanbul, Maltepe',
  },
  {
    id: 3,
    name: 'Ayşe Demir',
    tc: '34567890123',
    company: 'MNO Tekstil',
    type: 'İşe Dönüş',
    status: 'Sonuç Bekleniyor',
    time: '10:05',
    createdAt: `${yesterday()}T10:05`,
    phone: '0544 555 44 33',
    email: 'ayse.demir@email.com',
    birthDate: '1990-02-25',
    gender: 'Kadın',
    address: 'İstanbul, Üsküdar',
  },
  {
    id: 4,
    name: 'Fatma Şahin',
    tc: '45678901234',
    company: 'ABC İnşaat',
    type: 'İşe Giriş',
    status: 'Bekliyor',
    time: '10:38',
    createdAt: `${today()}T10:38`,
    phone: '0507 222 11 00',
    email: 'fatma.sahin@email.com',
    birthDate: '1988-07-19',
    gender: 'Kadın',
    address: 'İstanbul, Ataşehir',
  },
  {
    id: 5,
    name: 'Hasan Çelik',
    tc: '56789012345',
    company: 'XYZ Lojistik',
    type: 'Periyodik',
    status: 'Tamamlandı',
    time: '11:20',
    createdAt: `${today()}T11:20`,
    phone: '0553 444 33 22',
    email: 'hasan.celik@email.com',
    birthDate: '1982-09-30',
    gender: 'Erkek',
    address: 'İstanbul, Kartal',
  },
  {
    id: 6,
    name: 'Zeynep Kılıç',
    tc: '67890123456',
    company: 'DEF Danışmanlık',
    type: 'İş Değişikliği',
    status: 'Bekliyor',
    time: '11:45',
    createdAt: `${today()}T11:45`,
    phone: '0536 777 88 99',
    email: 'zeynep.kilic@email.com',
    birthDate: '1993-12-10',
    gender: 'Kadın',
    address: 'İstanbul, Beşiktaş',
  },
]

export const allProtocols: Protocol[] = [
  {
    id: 1,
    patientId: 1,
    protocolNo: `${new Date().getFullYear()}000001`,
    protocolDate: `${yesterday()}T09:15`,
    status: 'Tamamlandı',
    company: 'ABC İnşaat',
    examType: 'İşe Giriş',
    department: 'İnşaat',
    occupation: 'Mühendis',
    description: 'Periyodik kontrol',
    services: [
      { id: 101, protocolId: 1, name: 'Tam Kan Sayımı (Hemogram - CBC)', group: 'Hematoloji', status: 'Tamamlandı', barcode: '920001', processDate: `${yesterday()}T09:20`, price: 50, vatRate: 0, totalPrice: 50, recordedBy: 'Kullanıcı' },
      { id: 102, protocolId: 1, name: 'GLİKOZ (Biyokimya-AKS/Açlık Kan Şekeri)', group: 'Biyokimya', status: 'Tamamlandı', barcode: '920002', processDate: `${yesterday()}T09:25`, price: 30, vatRate: 0, totalPrice: 30, recordedBy: 'Kullanıcı' },
      { id: 103, protocolId: 1, name: 'PA AKCİĞER GRAFİSİ (Posteroanterior)', group: 'Radyoloji', status: 'Tamamlandı', barcode: '920003', processDate: `${yesterday()}T09:30`, price: 120, vatRate: 0, totalPrice: 120, recordedBy: 'Kullanıcı' },
      { id: 104, protocolId: 1, name: 'EKG (ELEKTROKARDİYOGRAFİ)', group: 'Radyoloji', status: 'Tamamlandı', barcode: '920004', processDate: `${yesterday()}T09:35`, price: 80, vatRate: 0, totalPrice: 80, recordedBy: 'Kullanıcı' },
    ],
    payments: [
      { id: 201, protocolId: 1, paymentDate: `${yesterday()}T09:40`, paymentType: 'Nakit', amount: 100, description: 'Kapora', recordedBy: 'Kullanıcı' },
      { id: 202, protocolId: 1, paymentDate: `${yesterday()}T09:45`, paymentType: 'Nakit', amount: 180, description: 'Kalan ödeme', recordedBy: 'Kullanıcı' },
    ],
  },
  {
    id: 2,
    patientId: 2,
    protocolNo: `${new Date().getFullYear()}000002`,
    protocolDate: `${yesterday()}T10:30`,
    status: 'Tamamlandı',
    company: 'XYZ Lojistik',
    examType: 'Periyodik',
    department: 'Lojistik',
    occupation: 'Şoför',
    description: 'Yıllık periyodik muayene',
    services: [
      { id: 105, protocolId: 2, name: 'Tam Kan Sayımı (Hemogram - CBC)', group: 'Hematoloji', status: 'Tamamlandı', barcode: '920005', processDate: `${yesterday()}T10:35`, price: 40, vatRate: 0, totalPrice: 40, recordedBy: 'Kullanıcı' },
      { id: 106, protocolId: 2, name: 'KAN GRUBU', group: 'Hematoloji', status: 'Tamamlandı', barcode: '920006', processDate: `${yesterday()}T10:40`, price: 25, vatRate: 0, totalPrice: 25, recordedBy: 'Kullanıcı' },
    ],
    payments: [
      { id: 203, protocolId: 2, paymentDate: `${yesterday()}T10:45`, paymentType: 'Kart', amount: 65, description: 'Tam ödeme', recordedBy: 'Kullanıcı' },
    ],
  },
  {
    id: 3,
    patientId: 3,
    protocolNo: `${new Date().getFullYear()}000003`,
    protocolDate: `${yesterday()}T11:00`,
    status: 'Bekliyor',
    company: 'MNO Tekstil',
    examType: 'İşe Dönüş',
    department: 'Üretim',
    occupation: 'Operatör',
    description: 'İşe dönüş kontrolü',
    services: [
      { id: 107, protocolId: 3, name: 'Tam Kan Sayımı (Hemogram - CBC)', group: 'Hematoloji', status: 'Sonuç Bekleniyor', barcode: '920007', processDate: `${yesterday()}T11:05`, price: 45, vatRate: 0, totalPrice: 45, recordedBy: 'Kullanıcı' },
      { id: 108, protocolId: 3, name: 'GLİKOZ (Biyokimya-AKS/Açlık Kan Şekeri)', group: 'Biyokimya', status: 'Sonuç Bekleniyor', barcode: '920008', processDate: `${yesterday()}T11:10`, price: 25, vatRate: 0, totalPrice: 25, recordedBy: 'Kullanıcı' },
      { id: 109, protocolId: 3, name: 'PA AKCİĞER GRAFİSİ (Posteroanterior)', group: 'Radyoloji', status: 'Sonuç Bekleniyor', barcode: '920009', processDate: `${yesterday()}T11:15`, price: 100, vatRate: 0, totalPrice: 100, recordedBy: 'Kullanıcı' },
      { id: 110, protocolId: 3, name: 'EKG (ELEKTROKARDİYOGRAFİ)', group: 'Radyoloji', status: 'Sonuç Bekleniyor', barcode: '920010', processDate: `${yesterday()}T11:20`, price: 70, vatRate: 0, totalPrice: 70, recordedBy: 'Kullanıcı' },
      { id: 111, protocolId: 3, name: 'İşitme Testi (ODYOMETRİ)', group: 'Odyometri', status: 'Sonuç Bekleniyor', barcode: '920011', processDate: `${yesterday()}T11:25`, price: 60, vatRate: 0, totalPrice: 60, recordedBy: 'Kullanıcı' },
      { id: 112, protocolId: 3, name: 'GÖZ TARAMASI (otorefraktometre)', group: 'Odyometri', status: 'Sonuç Bekleniyor', barcode: '920012', processDate: `${yesterday()}T11:30`, price: 50, vatRate: 0, totalPrice: 50, recordedBy: 'Kullanıcı' },
    ],
    payments: [
      { id: 204, protocolId: 3, paymentDate: `${yesterday()}T11:35`, paymentType: 'Kuruma Fatura', amount: 0, description: 'Faturaya eklenecek', recordedBy: 'Kullanıcı' },
    ],
  },
  {
    id: 4,
    patientId: 4,
    protocolNo: `${new Date().getFullYear()}000004`,
    protocolDate: `${today()}T09:00`,
    status: 'Bekliyor',
    company: 'ABC İnşaat',
    examType: 'İşe Giriş',
    department: 'İnşaat',
    occupation: 'Formen',
    description: 'Yeni işe giriş',
    services: [
      { id: 113, protocolId: 4, name: 'Tam Kan Sayımı (Hemogram - CBC)', group: 'Hematoloji', status: 'Numune Bekliyor', barcode: '920013', processDate: `${today()}T09:05`, price: 50, vatRate: 0, totalPrice: 50, recordedBy: 'Kullanıcı' },
      { id: 114, protocolId: 4, name: 'GLİKOZ (Biyokimya-AKS/Açlık Kan Şekeri)', group: 'Biyokimya', status: 'Numune Bekliyor', barcode: '920014', processDate: `${today()}T09:10`, price: 30, vatRate: 0, totalPrice: 30, recordedBy: 'Kullanıcı' },
      { id: 115, protocolId: 4, name: 'PA AKCİĞER GRAFİSİ (Posteroanterior)', group: 'Radyoloji', status: 'Numune Bekliyor', barcode: '920015', processDate: `${today()}T09:15`, price: 120, vatRate: 0, totalPrice: 120, recordedBy: 'Kullanıcı' },
    ],
    payments: [
      { id: 205, protocolId: 4, paymentDate: `${today()}T09:20`, paymentType: 'Nakit', amount: 100, description: 'Kapora', recordedBy: 'Kullanıcı' },
    ],
  },
  {
    id: 5,
    patientId: 5,
    protocolNo: `${new Date().getFullYear()}000005`,
    protocolDate: `${today()}T10:00`,
    status: 'Bekliyor',
    company: 'XYZ Lojistik',
    examType: 'Periyodik',
    department: 'Lojistik',
    occupation: 'Depo Görevlisi',
    description: 'Periyodik muayene',
    services: [
      { id: 116, protocolId: 5, name: 'Tam Kan Sayımı (Hemogram - CBC)', group: 'Hematoloji', status: 'Numune Bekliyor', barcode: '920016', processDate: `${today()}T10:05`, price: 40, vatRate: 0, totalPrice: 40, recordedBy: 'Kullanıcı' },
      { id: 117, protocolId: 5, name: 'KAN GRUBU', group: 'Hematoloji', status: 'Numune Bekliyor', barcode: '920017', processDate: `${today()}T10:10`, price: 25, vatRate: 0, totalPrice: 25, recordedBy: 'Kullanıcı' },
    ],
    payments: [],
  },
  {
    id: 6,
    patientId: 6,
    protocolNo: `${new Date().getFullYear()}000006`,
    protocolDate: `${today()}T11:00`,
    status: 'Bekliyor',
    company: 'DEF Danışmanlık',
    examType: 'İş Değişikliği',
    department: 'Ofis',
    occupation: 'Danışman',
    description: 'İş değişikliği muayenesi',
    services: [
      { id: 118, protocolId: 6, name: 'Tam Kan Sayımı (Hemogram - CBC)', group: 'Hematoloji', status: 'Numune Bekliyor', barcode: '920018', processDate: `${today()}T11:05`, price: 50, vatRate: 0, totalPrice: 50, recordedBy: 'Kullanıcı' },
      { id: 119, protocolId: 6, name: 'EKG (ELEKTROKARDİYOGRAFİ)', group: 'Radyoloji', status: 'Numune Bekliyor', barcode: '920019', processDate: `${today()}T11:10`, price: 80, vatRate: 0, totalPrice: 80, recordedBy: 'Kullanıcı' },
    ],
    payments: [
      { id: 206, protocolId: 6, paymentDate: `${today()}T11:15`, paymentType: 'Nakit', amount: 60, description: 'Kapora', recordedBy: 'Kullanıcı' },
    ],
  },
  {
    id: 7,
    patientId: 1,
    protocolNo: `${new Date().getFullYear()}000007`,
    protocolDate: `${today()}T12:00`,
    status: 'Tamamlandı',
    company: 'ABC İnşaat',
    examType: 'Periyodik',
    department: 'İnşaat',
    occupation: 'Mühendis',
    description: 'Periyodik kontrol',
    services: [
      { id: 120, protocolId: 7, name: 'PA AKCİĞER GRAFİSİ (Posteroanterior)', group: 'Radyoloji', status: 'Tamamlandı', barcode: '920020', processDate: `${today()}T12:05`, price: 120, vatRate: 0, totalPrice: 120, recordedBy: 'Kullanıcı' },
    ],
    payments: [
      { id: 207, protocolId: 7, paymentDate: `${today()}T12:10`, paymentType: 'Kart', amount: 120, description: 'Tam ödeme', recordedBy: 'Kullanıcı' },
    ],
  },
]
