import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

interface CopyButtonProps {
  text: string
  /** Kopyalandıktan sonra gösterilecek kısa mesaj (opsiyonel) */
  successLabel?: string
  /** Boyut: xs = 2.5w, sm = 3w, md = 4w */
  size?: 'xs' | 'sm' | 'md'
  /** Ek class */
  className?: string
  /** Kopyalanacak metin boşsa buton render edilmesin */
  hideIfEmpty?: boolean
}

export function CopyButton({
  text,
  successLabel,
  size = 'xs',
  className = '',
  hideIfEmpty = true,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  if (hideIfEmpty && !text) return null

  const sizeClass = size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const padClass = size === 'xs' ? 'p-0.5' : size === 'sm' ? 'p-1' : 'p-1.5'

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {
        // fallback
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        try {
          document.execCommand('copy')
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // ignore
        }
        document.body.removeChild(ta)
      })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? `Kopyalandı: ${successLabel ?? text}` : `Kopyala: ${text}`}
      className={`inline-flex items-center justify-center ${padClass} rounded-md transition-all ${
        copied
          ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
          : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
      } ${className}`}
    >
      {copied ? <Check className={sizeClass} /> : <Copy className={sizeClass} />}
    </button>
  )
}
