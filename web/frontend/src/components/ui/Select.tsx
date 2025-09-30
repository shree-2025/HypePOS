import { SelectHTMLAttributes, ReactNode, useId } from 'react'
import { clsx } from 'clsx'

type Option = { label: string; value: string }

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  options: Option[]
}

export default function Select({ className, label, error, leftIcon, rightIcon, id, options, ...rest }: Props) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className={clsx('flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-primary-300')}>
        {leftIcon && <span className="text-gray-400">{leftIcon}</span>}
        <select id={inputId} className="w-full outline-none bg-transparent" {...rest}>
          <option value="" disabled hidden>-- Select --</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {rightIcon && <span className="text-gray-400">{rightIcon}</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
