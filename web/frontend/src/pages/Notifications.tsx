import React from 'react'

export default function Notifications() {
  const items = [
      { id: 'n1', title: 'Order INV-1042 paid', time: '2m ago' },
      { id: 'n2', title: 'Low stock alert: SKU-012', time: '15m ago' },
      { id: 'n3', title: 'Report ready: Monthly Sales (Aug)', time: '1h ago' },
  ]
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-md bg-white shadow-soft p-4">
        <h1 className="text-lg font-semibold text-headerBlue">Notifications</h1>
        <p className="text-sm text-gray-600">Latest updates across your stores.</p>
      </div>
      <div className="rounded-md bg-white shadow-soft p-4">
        <ul className="space-y-3">
          {items.map(i => (
            <li key={i.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm text-gray-800">{i.title}</span>
              <span className="text-xs text-gray-500">{i.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
