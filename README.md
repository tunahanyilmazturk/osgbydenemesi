# HanTech OSGB Yönetim Sistemi

İş Sağlığı ve Güvenliği (OSGB) yönetim sistemi — hasta kayıt, protokol, laboratuvar, muhasebe ve raporlama süreçlerini tek çatı altında toplar.

## Özellikler

- **Ana Sayfa (Dashboard)** — Hero header, istatistikler, bekleyen işler, grafikler, son protokoller
- **Hasta Kayıt Kabul** — Hasta listesi, yeni hasta, protokol kartı
- **Laboratuvar İşlemleri** — Sonuç işlemleri, hızlı onay, dış lab gönderim/izlem, barkod yazdırma
- **Ön Muhasebe** — Kasa raporu, transfer, hareketler, borçlu hastalar, fatura icmal
- **İstatistikler** — Gün sonu raporu
- **Ayarlar** — Kurum bilgileri, SMS/barkod ayarları, doktor/hizmet/firma/OSGB tanımları, kullanıcı yönetimi, web sonuç kullanıcıları
- **SMS Bildirim Sistemi** — Sonuç hazır olunca hastaya otomatik SMS (NetGSM/Mutlucell/İletimerkezi)

## Teknoloji

- **React 19** + **TypeScript**
- **Vite 8** — Build tool & dev server
- **Tailwind CSS 3** — Styling
- **React Router 7** — Routing
- **Lucide React** — İkonlar
- **jsPDF + JSZip** — PDF oluşturma ve arşivleme
- **Oxlint** — Linting

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusu (http://localhost:5173)
npm run dev

# Production build
npm run build

# Build önizleme
npm run preview

# Lint kontrolü
npm run lint
```

## Proje Yapısı

```
src/
├── app/                     # App, provider zinciri, router, layout, navigasyon
├── features/                # Paylaşılan iş yetenekleri (muayeneler, vezne)
├── pages/                   # Route ekranları ve ekrana özel alt modüller
├── shared/
│   ├── components/ui/       # Genel UI bileşenleri
│   ├── lib/                 # Tarih, storage, SMS, Excel vb. yardımcılar
│   └── types/               # Alan bazında ayrılmış ortak modeller
├── state/
│   └── fixtures/            # Context provider'ları ve başlangıç verileri
├── index.css                # Tailwind + global stiller
└── main.tsx                 # İnce uygulama giriş noktası
```

Ayrıntılı kurallar için [mimari rehberine](docs/ARCHITECTURE.md) bakın.

## Veri Saklama

Tüm veriler `localStorage`'da saklanır (backend gerektirmez):

| Anahtar | İçerik |
|---|---|
| `cetka-institution` | Kurum bilgileri + SMS ayarları |
| `cetka-protocols` | Protokol/hizmet/ödeme verileri |
| `cetka-patients` | Hasta kayıtları |
| `cetka-companies` | Firma tanımları |
| `cetka-services` | Hizmet katalog |
| `cetka-users` | Kullanıcı/rol tanımları |
| `cetka-web-result-users` | Web sonuç kullanıcıları ve erişim geçmişi |
| `cetka-sms-log` | SMS gönderim logu |
| `cetka-external-labs` | Dış laboratuvar tanımları |
| `cetka-external-lab-sends` | Dış laboratuvar gönderim kayıtları |

## Demo Hesaplar

| Kullanıcı | Şifre | Rol |
|---|---|---|
| `admin` | `admin123` | Admin (tüm menüler) |
| `odyometrist` | `odyo123` | Odyometrist (sınırlı menü) |

## Marka

- **Yazılım:** HanTech — OSGB Yönetim Sistemi
- **Kurum:** Çet-Ka OSGB (kullanıcı kurumu, Ayarlar'dan değiştirilebilir)

## Geliştirme

### Build Kontrolü
```bash
npm run build   # TypeScript + Vite build
npm run lint    # Oxlint kontrolü
npm run check   # Build + lint birlikte
```

### Yeni Sayfa Ekleme
1. `src/pages/[module]/[PageName].tsx` oluştur
2. `src/app/router/AppRouter.tsx` içine lazy route ekle
3. `src/app/config/navigation.tsx` içine menü ve başlık bilgisini ekle

### SMS Entegrasyonu
- Ayarlar → SMS Ayarları sayfasından sağlayıcı/şablon/test yapılandırılır
- Firma ayarında "Sonuçlar hazır olunca SMS gönder" işaretlenirse otomatik tetiklenir
- `src/shared/lib/sms.ts` içinde NetGSM/Mutlucell/İletimerkezi API entegrasyonu

## Lisans

Özel proje — tüm hakları saklıdır.
