import React, { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, Result } from '@zxing/library'

export type BarcodeScannerProps = {
  onDetected: (text: string, result: Result) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [running, setRunning] = useState<boolean>(false)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    navigator.mediaDevices?.enumerateDevices?.()
      .then(list => {
        const cams = list.filter(d => d.kind === 'videoinput')
        setDevices(cams)
        if (cams.length) setDeviceId(cams[cams.length - 1].deviceId)
      })
      .catch(() => {})

    return () => {
      try { reader.reset() } catch {}
    }
  }, [])

  useEffect(() => {
    if (!deviceId || !videoRef.current || !readerRef.current) return

    const start = async () => {
      try {
        setError('')
        setRunning(true)
        await readerRef.current!.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
          if (result) {
            try { readerRef.current?.reset() } catch {}
            setRunning(false)
            onDetected(result.getText(), result)
          }
        })
      } catch (e: any) {
        setRunning(false)
        setError(e?.message || 'Unable to access camera')
      }
    }

    start()

    return () => {
      try { readerRef.current?.reset() } catch {}
    }
  }, [deviceId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[95vw] max-w-xl rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Scan Barcode</h3>
          <button className="rounded border px-3 py-1 text-sm" onClick={onClose}>Close</button>
        </div>

        {devices.length > 1 && (
          <div className="mb-2">
            <label className="mb-1 block text-sm text-gray-600">Camera</label>
            <select
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            >
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>
              ))}
            </select>
          </div>
        )}

        <div className="aspect-video w-full overflow-hidden rounded bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted autoPlay playsInline />
        </div>

        <div className="mt-2 text-xs text-gray-600">
          {running ? 'Point the camera at the barcode…' : (error ? error : (devices.length ? 'Starting camera…' : 'No camera found'))}
        </div>
      </div>
    </div>
  )
}
