import { useEffect, useState } from 'react'
import {
  EXTERNAL_LABS_CHANGED_EVENT,
  EXTERNAL_LABS_STORAGE_KEY,
  loadExternalLabs,
} from '@/pages/external-labs/data/externalLabsStorage'

export function useExternalLabsStorage() {
  const [labs, setLabs] = useState(loadExternalLabs)

  useEffect(() => {
    const refresh = () => setLabs(loadExternalLabs())
    const handleStorage = (event: StorageEvent) => {
      if (event.key === EXTERNAL_LABS_STORAGE_KEY) refresh()
    }

    window.addEventListener(EXTERNAL_LABS_CHANGED_EVENT, refresh)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener(EXTERNAL_LABS_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return labs
}
