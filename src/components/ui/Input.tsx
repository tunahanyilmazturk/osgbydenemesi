import { forwardRef } from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  size?: 'sm' | 'md'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, size = 'md', className = '', ...props }, ref) => {
    const sizeClasses = size === 'sm' ? 'py-2 px-3 text-sm' : 'py-3 px-4 text-base'

    return (
      <div className={className}>
        <label className={`block font-semibold text-slate-700 mb-1 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {label}
        </label>
        <input
          ref={ref}
          className={`w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all ${sizeClasses}`}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'
