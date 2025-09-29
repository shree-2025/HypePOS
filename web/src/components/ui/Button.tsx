import { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  variant?: 'primary' | 'outline' | 'ghost' | 'warning'
}

export default function Button({ className, loading, disabled, children, variant = 'primary', ...rest }: Props) {
  const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const styles = {
    primary: 'bg-teal text-white hover:bg-teal/90 focus:ring-teal/40',
    warning: 'bg-orange text-white hover:bg-orange/90 focus:ring-orange/40',
    outline: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-gray-400 focus:ring-primary-300',
    ghost: 'bg-transparent text-gray-800 hover:bg-gray-100 focus:ring-primary-300'
  } as const

  return (
    <button
      className={clsx(base, styles[variant], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      )}
      {children}
    </button>
  )
}
