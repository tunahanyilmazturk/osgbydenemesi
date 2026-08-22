import { PageHeader } from '../../components/PageHeader'
import { PagePlaceholder } from '../../components/PagePlaceholder'

export function WebResultUsers() {
  return (
    <div>
      <PageHeader
        title="Web Sonuç Kullanıcıları"
        subtitle="Web üzerinden sonuç görüntüleyen kullanıcıları tanımlayın."
      />
      <PagePlaceholder
        title="Web Sonuç Kullanıcı Yönetimi"
        description="Kullanıcı listesi, ekleme ve yetki düzenleme ekranları burada olacak."
      />
    </div>
  )
}
