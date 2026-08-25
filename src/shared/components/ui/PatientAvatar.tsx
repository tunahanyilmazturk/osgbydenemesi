import femaleAvatar from '@/assets/avatars/patient-female-v2.png'
import maleAvatar from '@/assets/avatars/patient-male-v2.png'

interface PatientAvatarProps {
  gender?: string
  name?: string
  photoSrc?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6 rounded-lg',
  sm: 'w-10 h-10 rounded-xl',
  md: 'w-12 h-12 rounded-xl',
  lg: 'w-16 h-16 rounded-2xl',
  xl: 'w-20 h-20 rounded-2xl',
  '2xl': 'w-28 h-28 rounded-2xl',
}

export function PatientAvatar({ gender, name, photoSrc, size = 'md', className = '' }: PatientAvatarProps) {
  const isCustomPhoto = Boolean(photoSrc)
  const source = photoSrc || (gender === 'Kadın' ? femaleAvatar : maleAvatar)
  const alt = isCustomPhoto
    ? `${name || 'Hasta'} fotoğrafı`
    : `${name || 'Hasta'} için ${gender === 'Kadın' ? 'kadın' : 'erkek'} avatar çizimi`

  return (
    <div className={`${sizeClasses[size]} shrink-0 overflow-hidden bg-slate-100 ring-1 ring-slate-200 shadow-sm ${className}`}>
      <img
        src={source}
        alt={alt}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  )
}
