import React, { useEffect } from 'react'

export type ToastProps = {
  type?: 'success' | 'error' | 'info'
  message: string
  onClose: () => void
  duration?: number
}

export default function Toast({ type = 'info', message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (!duration) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  const color = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-gray-800'

  return (
    <div className={`pointer-events-auto fixed right-4 top-4 z-50 min-w-[240px] max-w-sm rounded-md px-4 py-3 text-sm text-white shadow-lg ${color}`} role="status" aria-live="polite">
      <div className="flex items-start gap-2">
        <span className="mt-[2px] inline-block h-2.5 w-2.5 flex-none rounded-full bg-white/80" />
        <div className="flex-1">{message}</div>
        <button className="ml-2 text-white/80 hover:text-white" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
    </div>
  )
}
