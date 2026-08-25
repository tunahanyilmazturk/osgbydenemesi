# HanTech OSGB Frontend Mimarisi

## Ağustos 2026 Yapısal Denetim Özeti

İlk incelemede uygulama kabuğu, route tanımları ve yetki kontrolü tek `App.tsx` dosyasındaydı; provider zinciri `main.tsx` içine gömülüydü; menü ve başlık bilgileri 549 satırlık layout içinde tutuluyordu. Ortak tipler tek dosyada, genel yardımcılar `utils`, global durum `context` altında ve bazı route olmayan modallar `pages` altında bulunuyordu. Ayrıca tüm ekranlar ilk açılış paketine dahil ediliyordu.

Uygulanan düzenlemeden sonra:

- Ana route paketi 1.132,47 kB'dan 292,48 kB'a düştü (yaklaşık %74 küçülme).
- Ekranlar ayrı lazy chunk'lara bölündü.
- Başlangıçtaki 30 lint uyarısının tamamı giderildi; lint hata ve uyarısı bulunmuyor.
- Build ve TypeScript strict kontrolü başarılı.
- Eski derin göreli importlar `@/` alias'ına geçirildi.
- Karışık `definitions`, `context`, `utils` ve kök `components` klasörleri kaldırıldı.

React 19 uyumu için modal formları açılışta yeniden mount edilir, filtre sayfalamaları kullanıcı olaylarında sıfırlanır ve türetilmiş seçimler effect ile state'e kopyalanmaz. Dış laboratuvar verisi saniyelik polling yerine storage/custom event aboneliğiyle senkronize edilir.

Ön yüz işlev denetiminde boş bırakılmış route'lar tamamlandı: Laboratuvar ekranı canlı hizmet özeti ve işlem bağlantıları sunar; Hızlı Onay sonucu girilmiş hizmetleri toplu onaylar; Fatura İcmal aylık firma toplamlarını hesaplar ve Excel'e aktarır; OSGB ve Ek-2 tanımları ortak, kalıcı CRUD bileşenini kullanır. Route'a bağlı olmayan eski placeholder dosyaları kaldırıldı.

SMS bağlantılarının hedefi olan `/sonuc/:protocolNo` ekranı yalnızca onaylı sonuçları gösterir, kimlik numarasını maskeler ve mevcut PDF raporlarını açar. SMS loguna arama/durum filtresi; kurum ayarlarına tüm `cetka-` verilerini doğrulanmış JSON dosyasıyla yedekleme ve geri yükleme akışı eklendi.

## Katmanlar

```text
src/
├── app/                  # Uygulama başlangıcı, router, layout ve merkezi config
├── features/             # Birden fazla sayfanın kullandığı iş yetenekleri
├── pages/                # URL ile açılan ekranlar; alan bazında gruplanır
├── shared/               # İş alanından bağımsız UI, yardımcılar ve ortak tipler
├── state/                # Global React Context'leri ve başlangıç verileri
├── index.css             # Global stil girişi
└── main.tsx              # Yalnızca React uygulamasını mount eder
```

## Bağımlılık Yönü

```text
app → pages → features → shared
          ↘ state ↗
```

- `shared`, `pages` veya `features` içinden `app` katmanına import yapılmaz.
- Bir sayfaya özel bileşen `pages/<alan>/components` altında kalır.
- Birden fazla sayfanın kullandığı iş bileşeni `features/<özellik>` altına taşınır.
- Genel bileşenler `shared/components/ui`, genel yardımcılar `shared/lib` altında tutulur.
- Global uygulama durumu yalnızca `state` altındaki provider ve hook'larla yönetilir.

## Import Standardı

Uygulama içi importlarda `@/` alias'ı kullanılır:

```ts
import { Modal } from '@/shared/components/ui/Modal'
import { useProtocols } from '@/state/ProtocolsContext'
```

Aynı klasördeki küçük modüller dışında derin `../../..` importları kullanılmaz.

## Sayfa Standardı

```text
pages/<alan>/
├── <PageName>.tsx        # Route ekranı
├── components/           # Yalnızca bu alanın kullandığı bileşenler
├── hooks/                # Yalnızca bu alanın kullandığı hook'lar
├── lib/                  # Saf alan yardımcıları
└── data/                 # Sabit/başlangıç verileri
```

Yeni route eklerken sayfayı doğru alana koyun, `app/router/AppRouter.tsx` içinde lazy route ekleyin, menü gerekiyorsa `app/config/navigation.tsx` dosyasını güncelleyin ve `npm run check` çalıştırın.

## Global Durum Standardı

- Context dosyaları `<Domain>Context.tsx` olarak adlandırılır.
- Dışarıya provider ve `use<Domain>()` hook'u sunulur.
- Provider sırası `app/AppProviders.tsx` dosyasında tek noktadan yönetilir.
- Kalıcı veri anahtarları `cetka-` önekini korur; migration olmadan değiştirilmez.

## Bakım Riski Taşıyan Büyük Dosyalar

Sonraki geliştirmelerde aşağıdaki dosyalara yeni sorumluluk eklemek yerine form bölümleri, tablolar ve state hook'ları ayrılmalıdır:

1. `features/examinations/eye-examination/components/EyeExaminationModal.tsx`
2. `features/examinations/audiometry/components/AudiometryModal.tsx`
3. `pages/external-labs/ExternalLabSendNew.tsx`
4. `pages/services/ServiceDefinitions.tsx`
5. `pages/users/Users.tsx`
6. `pages/doctors/Doctors.tsx`

## Performans

Route ekranları `React.lazy` ile ayrılmıştır. PDF ve ZIP üretim bağımlılıkları yalnızca ilgili işlem istendiğinde dinamik yüklenir. PDF özelliklerinde yeni büyük bağımlılıklar feature içinde dinamik yüklenmelidir.
