export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage may be unavailable or full; keep the in-memory state usable.
  }
}

// Paylaşımlı PDF store — toplu yüklemede PDF bir kez saklanır
const SHARED_PDF_KEY = 'cetka-shared-pdfs'

interface SharedPdf {
  id: string
  data: string
  name: string
  createdAt: string
  refCount: number
}

export function loadSharedPdfs(): Record<string, SharedPdf> {
  return loadFromStorage(SHARED_PDF_KEY, {} as Record<string, SharedPdf>)
}

export function saveSharedPdf(data: string, name: string): string {
  const all = loadSharedPdfs()
  const id = `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  all[id] = { id, data, name, createdAt: new Date().toISOString(), refCount: 0 }
  saveToStorage(SHARED_PDF_KEY, all)
  return id
}

export function getSharedPdf(id: string): SharedPdf | undefined {
  const all = loadSharedPdfs()
  return all[id]
}

export function incrementPdfRef(id: string, delta: number) {
  const all = loadSharedPdfs()
  if (!all[id]) return
  all[id].refCount = Math.max(0, all[id].refCount + delta)
  if (all[id].refCount === 0) {
    delete all[id]
  }
  saveToStorage(SHARED_PDF_KEY, all)
}
