# AGENTS.md — Devin Geliştirme Rehberi

Bu dosya, Devin (veya başka AI asistan) projeye devam ederken bağlam kazanması için hazırlanmıştır.

## Proje Özeti

**HanTech OSGB Yönetim Sistemi** — İş Sağlığı ve Güvenliği yönetim sistemi.
React 19 + TypeScript + Vite + Tailwind CSS. Backend yok — tüm veriler `localStorage`'da.

## Geliştirme Komutları

```bash
npm run dev      # Dev server (localhost:5173)
npm run build    # TypeScript build + Vite bundle (hata kontrolü için)
npm run lint     # Oxlint (lint hataları)
```

**Önemli:** Her değişiklikten sonra `npm run build` çalıştır — TS hatalarını yakalar.
Lint genelde uyarı verir, hata sayısı 0 olmalı.

## Mimari Kurallar

### Sayfa Yapısı (pages-based)
- Her modül `src/pages/[module]/` altında
- Modüle özel alt bileşenler `src/pages/[module]/components/` altında
- Paylaşılan UI bileşenleri `src/components/ui/` altında

### Context Pattern
- Tüm state `src/context/` altındaki Context provider'larda
- Her context `localStorage`'a otomatik kaydeder (`useEffect` ile)
- Veri çekmek için custom hook: `useProtocols()`, `usePatients()`, `useCompanies()`, vb.

### Routing
- Route'lar `src/App.tsx`'te
- Menü öğeleri `src/components/Layout.tsx`'te `staticMenuItems` array'inde
- Sayfa başlıkları `pathToTitle` map'inde

### Marka Ayrımı
- **Marka (yazılım):** HanTech — sidebar üst, login, dashboard hero'da
- **Kurum (kullanıcı):** Çet-Ka OSGB — `localStorage`'dan dinamik, uygulama içi yerlerde
- **Kurum adı:** `loadInstitutionName()` yardımcı fonksiyonu ile çekilir

## Mevcut Durum (Son Güncelleme)

### Tamamlanan Özellikler
1. ✅ Pages-based refactoring (tüm modüller taşındı)
2. ✅ Lab.tsx modularization (labUtils.ts, BarcodeModal.tsx çıkarıldı)
3. ✅ "Ana Sayfa" yeniden adlandırma (eski "Göstergeler")
4. ✅ Dashboard hero header (gradient + kompakt istatistikler + grafikler)
5. ✅ Marka ayrımı (HanTech vs kurum)
6. ✅ Sonuç İşlemleri'nde kopyalama butonları (protokol no, hasta ad, TC, firma)
7. ✅ SMS bildirim sistemi:
   - Firma ayarında "Sonuçlar hazır olunca SMS gönder" checkbox
   - Otomatik tetikleme (onay sonrası)
   - Önizleme modalı (SmsPreviewModal.tsx)
   - Ayrı SMS Ayarları sayfası (/ayarlar/sms)
   - Şablon editörü + değişkenler + canlı önizleme
   - 3 sağlayıcı: NetGSM, Mutlucell, İletimerkezi
   - SMS logu (localStorage)

### Klasör Yapısı
```
src/pages/
├── dashboard/Dashboard.tsx
├── patients/Patients.tsx
├── lab/Lab.tsx + components/ (BarcodeModal, SmsPreviewModal)
├── accounting/ (Accounting, CashMovements, Debtors, Vezne)
├── companies/ (Companies, NewCompany + components/)
├── settings/ (Settings, SmsSettings)
├── definitions/ (Doctors, Services, Packages, vb.)
└── ...
```

## Devam Edilebilecek Konular

- [ ] Web sonuç sayfası (`/sonuc/:protocolNo`) — SMS linkinden açılacak PDF görüntüleme
- [ ] SMS logu için filtreleme/arama
- [ ] Gerçek SMS API test (şu an log modunda)
- [ ] Rapor çıktılarında kurum logosu entegrasyonu
- [ ] Kullanıcı yönetimi sayfası tam implementasyon
- [ ] Backup/restore (localStorage verilerini dışa/içe aktarma)

## Önemli Dosyalar

| Dosya | Açıklama |
|---|---|
| `src/App.tsx` | Tüm route'lar |
| `src/components/Layout.tsx` | Sidebar menü + topbar |
| `src/components/Login.tsx` | Giriş sayfası (HanTech markası) |
| `src/context/AuthContext.tsx` | Kullanıcı/rol/menü yetki |
| `src/utils/sms.ts` | SMS gönderim + şablon + log |
| `src/pages/settings/SmsSettings.tsx` | SMS yönetim sayfası |
| `src/pages/lab/Lab.tsx` | Sonuç işlemleri (büyük dosya ~2000 satır) |

## Stil Kuralları

- Tailwind CSS class'ları kullanılır
- Koyu tema sidebar'da (`bg-slate-900`), açık tema içerikte
- Font boyutları: `text-xs` (12px), `text-[10px]`, `text-[11px]` yaygın
- Kartlar: `rounded-2xl border border-slate-100 shadow-sm`
- Butonlar: `rounded-lg` + hover transition

## Dikkat Edilecekler

- `Lab.tsx` çok büyük (~2000 satır) — dikkatli düzenle
- `localStorage` anahtarları `cetka-` prefix'li
- TypeScript `strict` mode — kullanılmayan değişkenler hata verir
- Oxlint `no-unused-vars` kuralı aktif
- Türkçe karakterler dosya içeriğinde UTF-8 olmalı
