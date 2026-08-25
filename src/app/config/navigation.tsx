import type { ReactNode } from 'react'
import { Activity, BarChart3, FlaskConical, Settings, Users, Wallet } from 'lucide-react'

export interface NavigationItem {
  path: string
  label: string
  icon: ReactNode
  children?: Array<{ path: string; label: string }>
}

export const navigationItems: NavigationItem[] = [
  { path: '/', label: 'Ana Sayfa', icon: <BarChart3 className="w-4 h-4" /> },
  {
    path: '/hasta-kayit',
    label: 'Hasta Kayıt Kabul',
    icon: <Users className="w-4 h-4" />,
    children: [
      { path: '/hasta-kayit', label: 'Hasta Listesi' },
      { path: '/hasta-kayit/yeni', label: 'Yeni Hasta' },
    ],
  },
  {
    path: '/laboratuvar',
    label: 'Laboratuvar İşlemleri',
    icon: <FlaskConical className="w-4 h-4" />,
    children: [
      { path: '/laboratuvar', label: 'Sonuç İşlemleri' },
      { path: '/laboratuvar/laboratuvar', label: 'Laboratuvar' },
      { path: '/laboratuvar/hizli-onay', label: 'Hızlı Onay' },
      { path: '/laboratuvar/dis-lab-gonderim', label: 'Dış Lab Gönderim' },
      { path: '/laboratuvar/dis-lab-izlem', label: 'Dış Lab İzlem' },
      { path: '/laboratuvar/nred-nedenleri', label: 'N.Red Nedenleri' },
    ],
  },
  {
    path: '/muhasebe',
    label: 'Ön Muhasebe',
    icon: <Wallet className="w-4 h-4" />,
    children: [
      { path: '/muhasebe/kasa-raporu', label: 'Kasa Raporu' },
      { path: '/muhasebe/transfer', label: 'Kasa Transfer' },
      { path: '/muhasebe/hareketler', label: 'Kasa Hareketleri' },
      { path: '/muhasebe/borclular', label: 'Borçlu Hastalar' },
      { path: '/muhasebe/fatura-icmal', label: 'Fatura İcmal' },
    ],
  },
  {
    path: '/istatistikler',
    label: 'İstatistikler',
    icon: <Activity className="w-4 h-4" />,
    children: [{ path: '/istatistikler', label: 'Gün Sonu Raporu' }],
  },
  {
    path: '/ayarlar',
    label: 'Genel Ayarlar',
    icon: <Settings className="w-4 h-4" />,
    children: [
      { path: '/ayarlar', label: 'Kurum Bilgileri' },
      { path: '/ayarlar/sms', label: 'SMS Ayarları' },
      { path: '/ayarlar/barkod', label: 'Barkod Ayarları' },
      { path: '/ayarlar/goz-muayenesi-sablonlari', label: 'Göz Muayenesi Şablonları' },
      { path: '/ayarlar/doktorlar', label: 'Doktor Tanımları' },
      { path: '/ayarlar/hizmet-tup-tipleri', label: 'Hizmet Tüp Tipi Tanımları' },
      { path: '/ayarlar/hizmetler', label: 'Hizmet Tanımları' },
      { path: '/ayarlar/paketler', label: 'Hizmet Paketleri' },
      { path: '/ayarlar/firmalar', label: 'Firma Tanımları' },
      { path: '/ayarlar/osgb', label: 'OSGB Tanımları' },
      { path: '/ayarlar/muayene-turleri', label: 'Muayene Türü Tanımları' },
      { path: '/ayarlar/dis-laboratuvarlar', label: 'Dış Laboratuvar Tanımları' },
      { path: '/ayarlar/kasalar', label: 'Kasa Tanımları' },
      { path: '/ayarlar/web-sonuc-kullanicilari', label: 'Web Sonuç Kullanıcıları' },
      { path: '/ayarlar/ek2-rapor-tanimlari', label: 'Ek-2 Ayarları' },
      { path: '/ayarlar/kullanicilar', label: 'Kullanıcı Yönetimi' },
    ],
  },
]

const pageTitles: Record<string, string> = {
  '/': 'Ana Sayfa',
  '/hasta-kayit': 'Hasta Kayıt Kabul',
  '/hasta-kayit/yeni': 'Yeni Hasta Kaydı',
  '/laboratuvar': 'Sonuç İşlemleri',
  '/laboratuvar/laboratuvar': 'Laboratuvar',
  '/laboratuvar/hizli-onay': 'Hızlı Onay',
  '/laboratuvar/dis-lab-gonderim': 'Dış Lab Gönderim',
  '/laboratuvar/dis-lab-gonderim/yeni': 'Dış Laboratuvar',
  '/laboratuvar/dis-lab-izlem': 'Dış Lab İzlem',
  '/laboratuvar/nred-nedenleri': 'N.Red Nedenleri',
  '/muhasebe': 'Ön Muhasebe',
  '/muhasebe/kasa-raporu': 'Kasa Raporu',
  '/muhasebe/transfer': 'Kasa Transfer',
  '/muhasebe/hareketler': 'Kasa Hareketleri',
  '/muhasebe/borclular': 'Borçlu Hastalar',
  '/muhasebe/fatura-icmal': 'Fatura İcmal',
  '/istatistikler': 'İstatistikler',
  '/ayarlar': 'Kurum Bilgileri',
  '/ayarlar/sms': 'SMS Ayarları',
  '/ayarlar/barkod': 'Barkod Ayarları',
  '/ayarlar/goz-muayenesi-sablonlari': 'Göz Muayenesi Şablonları',
  '/ayarlar/doktorlar': 'Doktor Tanımları',
  '/ayarlar/hizmet-tup-tipleri': 'Hizmet Tüp Tipi Tanımları',
  '/ayarlar/hizmetler': 'Hizmet Tanımları',
  '/ayarlar/paketler': 'Hizmet Paketleri',
  '/ayarlar/paketler/yeni': 'Yeni Paket',
  '/ayarlar/firmalar': 'Firma Tanımları',
  '/ayarlar/firmalar/yeni': 'Yeni Firma',
  '/ayarlar/osgb': 'OSGB Tanımları',
  '/ayarlar/muayene-turleri': 'Muayene Türü Tanımları',
  '/ayarlar/dis-laboratuvarlar': 'Dış Laboratuvar Tanımları',
  '/ayarlar/kasalar': 'Kasa Tanımları',
  '/ayarlar/web-sonuc-kullanicilari': 'Web Sonuç Kullanıcıları',
  '/ayarlar/ek2-rapor-tanimlari': 'Ek-2 Ayarları',
  '/ayarlar/kullanicilar': 'Kullanıcı Yönetimi',
}

export function getPageTitle(pathname: string): string {
  if (/\/ayarlar\/firmalar\/duzenle\//.test(pathname)) return 'Firma Düzenle'
  if (/\/ayarlar\/paketler\/duzenle\//.test(pathname)) return 'Paket Düzenle'
  if (pathname.includes('/protokol/') && pathname.endsWith('/yeni')) return 'Yeni Protokol'
  if (/\/protokol\/\d+\/\d+$/.test(pathname)) return 'Protokol Detay'
  if (pathname.startsWith('/hasta-kayit/protokol/')) return 'Protokol Kartı'
  return pageTitles[pathname] ?? 'HanTech OSGB'
}

export function normalizeNavigationText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/İ/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ğ/g, 'g')
    .replace(/[^a-z0-9]/g, '')
}
