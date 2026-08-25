import { useId } from 'react'

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string
  options: { value: string; label: string }[]
  size?: 'sm' | 'md'
}

export function Select({ label, options, size = 'md', className = '', id, ...props }: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const sizeClasses = size === 'sm' ? 'py-2 px-3 text-sm' : 'py-3 px-4 text-base'

  return (
    <div className={className}>
      <label htmlFor={selectId} className={`block font-semibold text-slate-700 mb-1 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {label}
      </label>
      <select
        id={selectId}
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all ${sizeClasses}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
