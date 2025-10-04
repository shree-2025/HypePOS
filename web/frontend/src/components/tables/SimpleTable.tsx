import { clsx } from 'clsx'

export type Column<T> = {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

type Props<T> = {
  columns: Column<T>[]
  data: T[]
  keyField?: keyof T | string
  className?: string
  noScroll?: boolean
  stickyHeader?: boolean
  density?: 'normal' | 'compact'
}

export default function SimpleTable<T extends Record<string, any>>({ columns, data, keyField = 'id', className, noScroll = false, stickyHeader = false, density = 'normal' }: Props<T>) {
  const pad = density === 'compact' ? 'px-2 py-1' : 'px-3 py-2'
  return (
    <div className={clsx(noScroll ? 'overflow-visible' : 'overflow-x-auto', 'rounded-lg border border-gray-200 bg-white', className)}>
      <table className="min-w-full text-left text-sm">
        <thead className={clsx('bg-gray-50 text-gray-600', stickyHeader && 'sticky top-0 z-10')}>
          <tr>
            {columns.map(col => (
              <th key={String(col.key)} className={clsx(pad, 'font-medium', col.className)}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-800">
          {data.map((row, idx) => (
            <tr key={String(row[keyField as string] ?? idx)} className="hover:bg-gray-50">
              {columns.map(col => (
                <td key={String(col.key)} className={clsx(pad, col.className)}>
                  {col.render ? col.render(row) : String(row[col.key as string] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className={clsx(density === 'compact' ? 'px-2 py-3' : 'px-3 py-6', 'text-center text-gray-500')}>No data</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

