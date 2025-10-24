import { PropsWithChildren } from 'react'
import { clsx } from 'clsx'

type Props = PropsWithChildren<{
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}>

export default function PageHeader({ title, subtitle, actions, className, children }: Props) {
  return (
    <div className={clsx('mb-4 flex flex-wrap items-center justify-between gap-3', className)}>
      <div>
        <h2 className="text-xl font-semibold text-black">{title}</h2>
        {subtitle && <p className="text-sm text-accent">{subtitle}</p>}
        {children}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
