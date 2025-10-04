import React from 'react'
import { clsx } from 'clsx'

type Props = React.PropsWithChildren<{
  label: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}>

export default function Tooltip({ children, label, placement = 'top', className }: Props) {
  const pos = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1',
  }[placement]

  return (
    <span className={clsx('relative inline-flex group', className)}>
      {children}
      <span className={clsx(
        'pointer-events-none absolute z-50 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-90 group-hover:block',
        pos
      )}>
        {label}
      </span>
    </span>
  )
}
