import { useState } from 'react'
import { Check, ChevronDown, Eye, KeyRound, ShieldCheck } from 'lucide-react'
import { ALL_PERMISSIONS, PERMISSION_GROUPS, VIEW_PERMISSIONS, normalizePermissions, togglePermission, type PermissionKey } from '@/app/config/permissions'

interface PermissionMatrixProps {
  value: PermissionKey[]
  onChange: (permissions: PermissionKey[]) => void
  readOnly?: boolean
}

export function PermissionMatrix({ value, onChange, readOnly = false }: PermissionMatrixProps) {
  const [expanded, setExpanded] = useState<string[]>(['patients'])
  const selected = new Set(value)

  const setGroup = (groupId: string, enabled: boolean) => {
    if (readOnly) return
    const group = PERMISSION_GROUPS.find((item) => item.id === groupId)
    if (!group) return
    const next = new Set(value)
    group.items.forEach((item) => item.permissions.forEach((permission) => {
      if (enabled) next.add(permission.key)
      else next.delete(permission.key)
    }))
    onChange(normalizePermissions(Array.from(next)))
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-slate-800">Ayrıntılı Yetki Matrisi</p>
          <p className="text-[10px] text-slate-500">{value.length} / {ALL_PERMISSIONS.length} yetki seçili</p>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => onChange(VIEW_PERMISSIONS)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700">
              <Eye className="h-3 w-3" /> Sadece görüntüleme
            </button>
            <button type="button" onClick={() => onChange(ALL_PERMISSIONS)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100">
              <ShieldCheck className="h-3 w-3" /> Tüm yetkiler
            </button>
            <button type="button" onClick={() => onChange([])} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-red-600">
              Temizle
            </button>
          </div>
        )}
      </div>

      <div className="max-h-[46vh] space-y-1.5 overflow-y-auto p-2">
        {PERMISSION_GROUPS.map((group) => {
          const groupPermissions = group.items.flatMap((item) => item.permissions.map((permission) => permission.key))
          const selectedCount = groupPermissions.filter((permission) => selected.has(permission)).length
          const isExpanded = expanded.includes(group.id)
          const allSelected = selectedCount === groupPermissions.length
          return (
            <section key={group.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-2 px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => setExpanded((previous) => previous.includes(group.id) ? previous.filter((id) => id !== group.id) : [...previous, group.id])}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  aria-expanded={isExpanded}
                >
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-slate-800">{group.label}</p>
                    <p className="truncate text-[9px] text-slate-500">{group.description}</p>
                  </div>
                </button>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-600">{selectedCount}/{groupPermissions.length}</span>
                {!readOnly && (
                  <button type="button" onClick={() => setGroup(group.id, !allSelected)} className={`rounded-md border px-2 py-1 text-[9px] font-medium ${allSelected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-blue-200'}`}>
                    {allSelected ? 'Kaldır' : 'Tümünü seç'}
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {group.items.map((item) => (
                    <div key={item.label} className="grid gap-2 px-3 py-2 sm:grid-cols-[minmax(150px,1fr)_minmax(220px,auto)] sm:items-center">
                      <div>
                        <p className="text-[11px] font-medium text-slate-700">{item.label}</p>
                        <p className="text-[9px] leading-4 text-slate-400">{item.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 sm:justify-end">
                        {item.permissions.map((permission) => {
                          const active = selected.has(permission.key)
                          return (
                            <button
                              key={permission.key}
                              type="button"
                              disabled={readOnly}
                              aria-pressed={active}
                              onClick={() => onChange(togglePermission(value, permission.key))}
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-medium transition-colors ${active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'} disabled:cursor-default`}
                            >
                              {active ? <Check className="h-3 w-3" /> : <KeyRound className="h-3 w-3" />}
                              {permission.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
