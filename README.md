# HanTech OSGB Yönetim Sistemi

İş Sağlığı ve Güvenliği (OSGB) yönetim sistemi — hasta kayıt, protokol, laboratuvar, muhasebe ve raporlama süreçlerini tek çatı altında toplar.

## Özellikler

- **Ana Sayfa (Dashboard)** — Hero header, istatistikler, bekleyen işler, grafikler, son protokoller
- **Hasta Kayıt Kabul** — Hasta listesi, yeni hasta, protokol kartı
- **Laboratuvar İşlemleri** — Sonuç işlemleri, hızlı onay, dış lab gönderim/izlem, barkod yazdırma
- **Ön Muhasebe** — Kasa raporu, transfer, hareketler, borçlu hastalar, fatura icmal
- **İstatistikler** — Gün sonu raporu
- **Ayarlar** — Kurum bilgileri, SMS ayarları, doktor/hizmet/firma/OSGB tanımları, kullanıcı yönetimi
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
├── App.tsx                  # Router + route tanımları
├── main.tsx                 # Entry point
├── index.css                # Tailwind + global stiller
├── components/              # Paylaşılan bileşenler
│   ├── ui/                  # UI primitives (Input, Modal, CopyButton, Charts, StatCard)
│   ├── Layout.tsx           # Sidebar + topbar + menü
│   ├── Login.tsx            # Giriş sayfası
│   └── ...
├── context/                 # React Context providers
│   ├── AuthContext.tsx      # Kullanıcı/rol/yetki
│   ├── ProtocolsContext.tsx # Protokol/hizmet/ödeme
│   ├── PatientsContext.tsx  # Hasta kayıtları
│   ├── CompaniesContext.tsx # Firma tanımları
│   ├── ServicesContext.tsx  # Hizmet katalog
│   └── ...
├── pages/                   # Sayfalar (module-based)
│   ├── dashboard/           # Ana Sayfa
│   ├── patients/            # Hasta Kayıt
│   ├── lab/                 # Laboratuvar (+ components/)
│   ├── accounting/          # Muhasebe
│   ├── companies/           # Firma tanımları (+ components/)
│   ├── settings/            # Kurum bilgileri + SMS ayarları
│   └── ...
├── data/                    # Mock/seed verileri
├── types/                   # TypeScript tip tanımları
└── utils/                   # Yardımcı fonksiyonlar
    ├── sms.ts               # SMS gönderim + şablon + log
    ├── storage.ts           # localStorage yardımcıları
    └── ...
```

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
| `cetka-sms-log` | SMS gönderim logu |

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
```

### Yeni Sayfa Ekleme
1. `src/pages/[module]/[PageName].tsx` oluştur
2. `src/App.tsx`'e route ekle
3. `src/components/Layout.tsx`'te `staticMenuItems` ve `pathToTitle`'a ekle

### SMS Entegrasyonu
- Ayarlar → SMS Ayarları sayfasından sağlayıcı/şablon/test yapılandırılır
- Firma ayarında "Sonuçlar hazır olunca SMS gönder" işaretlenirse otomatik tetiklenir
- `src/utils/sms.ts` içinde NetGSM/Mutlucell/İletimerkezi API entegrasyonu

## Lisans

Özel proje — tüm hakları saklıdır.
