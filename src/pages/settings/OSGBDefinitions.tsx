import { PageHeader } from '@/shared/components/PageHeader'
import { SimpleDefinitionManager, type SimpleDefinition } from '@/features/definitions/components/SimpleDefinitionManager'

const defaults: SimpleDefinition[] = [
  { id: 'osgb-main', code: 'OSGB-001', name: 'Çet-Ka OSGB', description: 'Ana iş sağlığı ve güvenliği birimi', isActive: true },
]

export function OSGBDefinitions() {
  return (
    <div className="viewport-page">
      <PageHeader
        title="OSGB Tanımları"
        subtitle="İş sağlığı ve güvenliği birimi tanımlarını yönetin."
      />
      <SimpleDefinitionManager storageKey="cetka-osgb-definitions" itemLabel="OSGB Tanımı" defaults={defaults} />
    </div>
  )
}
