import { PropsWithChildren } from 'react'
import { clsx } from 'clsx'

type Props = PropsWithChildren<{
  title: string
  value?: string
  icon?: React.ReactNode
  className?: string
}>

export default function StatCard({ title, value, icon, className, children }: Props) {
  return (
    <div className={clsx('rounded-xl border border-gray-200 bg-white p-4 shadow-soft', className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          {icon || (
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M3 13h8V3H3v10m0 8h8v-6H3v6m10 0h8V11h-8v10M13 3v6h8V3h-8Z"/></svg>
          )}
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</div>
          {value && <div className="mt-1 text-xl font-bold text-gray-900">{value}</div>}
          {children}
        </div>
      </div>
    </div>
  )
}
