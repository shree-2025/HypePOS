import { clsx } from 'clsx'

type Props = {
  title?: string
  children?: React.ReactNode
  variant?: 'success' | 'error' | 'info' | 'warning'
  className?: string
}

export default function Alert({ title, children, variant = 'info', className }: Props) {
  const color = {
    success: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-orange-50 text-orange-700 border-orange-200',
  }[variant]
  return (
    <div className={clsx('rounded-md border px-3 py-2 text-sm', color, className)}>
      {title && <div className="font-medium">{title}</div>}
      {children && <div className={clsx(title ? 'mt-1' : '')}>{children}</div>}
    </div>
  )
}
