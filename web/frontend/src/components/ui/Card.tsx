import { PropsWithChildren } from 'react'
import { clsx } from 'clsx'

type Props = PropsWithChildren<{
  title?: string
  className?: string
  actions?: React.ReactNode
}>

export default function Card({ title, className, actions, children }: Props) {
  return (
    <div className={clsx('container-card p-4', className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-gray-700">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}
