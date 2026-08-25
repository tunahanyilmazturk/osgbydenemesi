interface BackupFile {
  app: 'hantech-osgb'
  version: 1
  exportedAt: string
  data: Record<string, string>
}

function collectCetkaData() {
  const data: Record<string, string> = {}
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith('cetka-')) {
      const value = localStorage.getItem(key)
      if (value !== null) data[key] = value
    }
  }
  return data
}

export function downloadLocalBackup() {
  const backup: BackupFile = { app: 'hantech-osgb', version: 1, exportedAt: new Date().toISOString(), data: collectCetkaData() }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `HanTech_Yedek_${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  return Object.keys(backup.data).length
}

export async function restoreLocalBackup(file: File) {
  const parsed = JSON.parse(await file.text()) as Partial<BackupFile>
  if (parsed.app !== 'hantech-osgb' || parsed.version !== 1 || !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    throw new Error('Bu dosya geçerli bir HanTech yedeği değil.')
  }
  const entries = Object.entries(parsed.data)
  if (entries.length === 0 || entries.some(([key, value]) => !key.startsWith('cetka-') || typeof value !== 'string')) {
    throw new Error('Yedek içeriği boş veya geçersiz.')
  }

  const current = collectCetkaData()
  try {
    Object.keys(current).forEach((key) => localStorage.removeItem(key))
    entries.forEach(([key, value]) => localStorage.setItem(key, value))
  } catch (error) {
    entries.forEach(([key]) => localStorage.removeItem(key))
    Object.entries(current).forEach(([key, value]) => localStorage.setItem(key, value))
    throw error
  }
  return entries.length
}
