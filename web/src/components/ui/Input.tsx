import { InputHTMLAttributes, ReactNode, useId, Ref } from 'react'
import { clsx } from 'clsx'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  inputRef?: Ref<HTMLInputElement>
}

export default function Input({ className, label, error, leftIcon, rightIcon, id, inputRef, ...rest }: Props) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <div className={clsx('w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className={clsx('flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-primary-300')}
      >
        {leftIcon && <span className="text-gray-400">{leftIcon}</span>}
        <input
          id={inputId}
          ref={inputRef}
          className="w-full outline-none placeholder:text-gray-400"
          {...rest}
        />
        {rightIcon && <span className="text-gray-400">{rightIcon}</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )}
