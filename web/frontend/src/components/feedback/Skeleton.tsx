import { clsx } from 'clsx'

type Props = {
  className?: string
}

export default function Skeleton({ className }: Props) {
  return <div className={clsx('animate-pulse rounded-md bg-gray-200', className)} />
}
