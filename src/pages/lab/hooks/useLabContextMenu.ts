import { useEffect, useState } from 'react'

export interface ContextMenuState {
  x: number
  y: number
  serviceId: number
}

export function useLabContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const handleContextMenu = (e: React.MouseEvent, serviceId: number) => {
    e.preventDefault()
    e.stopPropagation()
    const menuWidth = 200
    const menuHeight = 260
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10)
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10)
    setContextMenu({ x, y, serviceId })
  }

  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    document.addEventListener('click', handler)
    document.addEventListener('scroll', handler, true)
    return () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('scroll', handler, true)
    }
  }, [contextMenu])

  return {
    contextMenu,
    setContextMenu,
    handleContextMenu,
  }
}
