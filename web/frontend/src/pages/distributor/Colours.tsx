import { useEffect, useState } from 'react'
import api from '@/api/axios'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Shell from '@/components/layout/Shell'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'

interface Colour {
  id: number
  colorCode: number
  colorDesc: string | null
  createdAt?: string
  updatedAt?: string
}

export default function Colours() {
  const [items, setItems] = useState<Colour[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [code, setCode] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editCode, setEditCode] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkParsing, setBulkParsing] = useState(false)
  const [bulkPreview, setBulkPreview] = useState<{ colorCode: string; colorDesc?: string }[]>([])
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkSummary, setBulkSummary] = useState<{ insertedCount: number; errorCount: number } | null>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [addOpen, setAddOpen] = useState(false)
  const [filterCode, setFilterCode] = useState('')
  const [filterDesc, setFilterDesc] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/colours')
      setItems(Array.isArray(data) ? data : [])
      setPage(0)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load colours')
    } finally {
      setLoading(false)
    }
  }

  function parseBulk(text: string) {
    setBulkParsing(true)
    const rows: { colorCode: string; colorDesc?: string }[] = []
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (!lines.length) { setBulkPreview([]); setBulkParsing(false); return }
    // Detect header
    const first = lines[0].toLowerCase()
    let start = 0
    if (first.includes('color') && (first.includes('code') || first.includes('desc'))) start = 1
    for (let i = start; i < lines.length; i += 1) {
      const parts = lines[i].split(',')
      const code = (parts[0] ?? '').trim()
      const desc = (parts[1] ?? '').trim()
      if (!code) continue
      rows.push({ colorCode: code.replace(/\D+/g, ''), colorDesc: desc || undefined })
    }
    setBulkPreview(rows)
    setBulkParsing(false)
  }

  const onBulkSubmit = async () => {
    setError(null)
    setBulkSummary(null)
    try {
      setBulkSubmitting(true)
      const { data } = await api.post('/colours/bulk', { records: bulkPreview })
      // Refresh list by merging inserted
      if (Array.isArray(data?.inserted)) setItems(prev => [...data.inserted, ...prev])
      setBulkSummary({ insertedCount: Number(data?.insertedCount || 0), errorCount: Number(data?.errorCount || 0) })
      setSuccess('Bulk upload completed')
      setTimeout(() => setSuccess(''), 2500)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Bulk upload failed')
    } finally {
      setBulkSubmitting(false)
    }
  }

  const onBulkFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      setBulkText(text)
      parseBulk(text)
    } catch {
      setError('Failed to read file')
    }
  }

  const downloadSample = () => {
    const csv = 'color_code,color_desc\n101,Red\n102,Blue\n103,Black\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'colours-sample.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    const codeDigits = editCode.replace(/\D+/g, '')
    if (!codeDigits) { setError('Color code is required (numbers only)'); return }
    // Client-side duplicate description check excluding current id
    if (editDesc && items.some(it => it.id !== editingId && (it.colorDesc || '').toLowerCase() === editDesc.toLowerCase())) {
      setError('Color description already exists')
      return
    }
    try {
      const { data } = await api.put(`/colours/${editingId}`, { colorCode: codeDigits, colorDesc: editDesc })
      setItems(prev => prev.map(it => it.id === editingId ? data : it))
      setSuccess('Color updated successfully')
      setTimeout(() => setSuccess(''), 2500)
      setEditOpen(false)
      resetEdit()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update colour')
    }
  }

  useEffect(() => { load() }, [])

  // Keep page within bounds when items change
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((filteredItems.length || 0) / pageSize))
    if (page > totalPages - 1) setPage(totalPages - 1)
  }, [items, pageSize, filterCode, filterDesc])

  // Reset to first page when filters change
  useEffect(() => { setPage(0) }, [filterCode, filterDesc])

  const filteredItems = items.filter((it) => {
    const codeOk = filterCode ? String(it.colorCode).includes(filterCode.replace(/\D+/g, '')) : true
    const descOk = filterDesc ? (it.colorDesc || '').toLowerCase().includes(filterDesc.toLowerCase()) : true
    return codeOk && descOk
  })
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const startIndex = page * pageSize
  const pagedItems = filteredItems.slice(startIndex, startIndex + pageSize)

  const resetForm = () => { setCode(''); setDesc(''); setError(null) }
  const resetEdit = () => { setEditingId(null); setEditCode(''); setEditDesc('') }

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const codeDigits = code.replace(/\D+/g, '')
    if (!codeDigits) return setError('Color code is required (numbers only)')
    // Client-side duplicate description check (case-insensitive)
    if (desc && items.some(it => (it.colorDesc || '').toLowerCase() === desc.toLowerCase())) {
      return setError('Color description already exists')
    }
    try {
      setAdding(true)
      const { data } = await api.post('/colours', { colorCode: codeDigits, colorDesc: desc })
      setItems(prev => [data, ...prev])
      setSuccess('Color added successfully')
      resetForm()
      setAddOpen(false)
      setTimeout(() => setSuccess(''), 2500)
      setAdding(false)
    } catch (e: any) {
      setAdding(false)
      setError(e?.response?.data?.message || 'Failed to add colour')
    }
  }

  const onEdit = (row: Colour) => {
    setEditingId(row.id)
    setEditCode(String(row.colorCode))
    setEditDesc(row.colorDesc || '')
    setEditOpen(true)
  }

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this color? This action cannot be undone.')) return
    try {
      await api.delete(`/colours/${id}`)
      setItems(prev => prev.filter(it => it.id !== id))
      setSuccess('Color deleted successfully')
      setTimeout(() => setSuccess(''), 2500)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete colour')
    }
  }

  return (
    <Shell>
      <PageHeader
        title="Colors"
        subtitle="Manage color codes and descriptions."
        actions={(
          <div className="flex gap-2">
            <Button onClick={() => load()}>Refresh</Button>
            <Button variant="primary" onClick={() => { setAddOpen(true) }}>Add New</Button>
            <Button variant="primary" onClick={() => { setBulkOpen(true); setBulkSummary(null) }}>Bulk Upload</Button>
          </div>
        )}
      />

      <Card>
        {/* Filters */}
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Filter by Code"
            placeholder="e.g. 101"
            value={filterCode}
            onChange={(e: any) => setFilterCode(String(e.target.value))}
          />
          <Input
            label="Filter by Description"
            placeholder="e.g. Red"
            value={filterDesc}
            onChange={(e: any) => setFilterDesc(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="button" variant="outline" className="w-full" onClick={() => { setFilterCode(''); setFilterDesc('') }}>Clear</Button>
          </div>
        </div>

        {/* List */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">S.No</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Color Code</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Color Description</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td className="px-4 py-3" colSpan={4}>Loading…</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td className="px-4 py-3" colSpan={4}>No colors found</td></tr>
                ) : (
                  pagedItems.map((c, i) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2">{startIndex + i + 1}</td>
                      <td className="px-4 py-2">{c.colorCode}</td>
                      <td className="px-4 py-2">{c.colorDesc || '-'}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => onEdit(c)}>Edit</Button>
                          <Button variant="warning" onClick={() => onDelete(c.id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-2 py-3 text-sm">
          <div className="text-gray-600">Showing {items.length ? `${startIndex + 1}-${Math.min(startIndex + pageSize, items.length)}` : '0-0'} of {items.length}</div>
          <div className="flex items-center gap-2">
            {/* Page size selector */}
            <div className="relative">
              <select
                className="rounded border border-gray-300 bg-white px-2 py-1 pr-6 text-gray-700"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
            {/* Prev, current page, Next */}
            <button
              type="button"
              className={`rounded border px-2 py-1 ${page === 0 ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'border-gray-300 text-gray-700 bg-white'}`}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous"
            >
              ‹
            </button>
            <span className="rounded border border-gray-300 bg-white px-3 py-1 text-gray-900">
              {page + 1}
            </span>
            <button
              type="button"
              className={`rounded border px-2 py-1 ${page >= totalPages - 1 ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'border-gray-300 text-gray-700 bg-white'}`}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Next"
            >
              ›
            </button>
          </div>
        </div>
      </Card>

      {addOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setAddOpen(false); resetForm() }} />
          <div className="relative z-50 w-full max-w-lg rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">Add New Color</h2>
            {error && (
              <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            <form className="mt-3 grid gap-3" onSubmit={onAdd}>
              <Input
                label="Color Code"
                placeholder="e.g. 101"
                value={code}
                onChange={(e: any) => setCode(String(e.target.value).replace(/\D+/g, ''))}
              />
              <Input
                label="Color Description"
                placeholder="e.g. Red"
                value={desc}
                onChange={(e: any) => setDesc(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setAddOpen(false); resetForm() }}>Cancel</Button>
                <Button type="submit" loading={adding}>Add</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setBulkOpen(false); setBulkText(''); setBulkPreview([]); setBulkSummary(null) }} />
          <div className="relative z-50 w-full max-w-2xl rounded-xl bg-white p-5 shadow-soft max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900">Bulk Upload Colors</h2>
            <p className="mt-1 text-sm text-gray-500">Paste CSV with columns: color_code,color_desc or colorCode,colorDesc. One row per color. Color code must be numeric.</p>
            <div className="mt-3 grid gap-3">
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                rows={8}
                placeholder={"color_code,color_desc\\n101,Red\\n102,Blue"}
                value={bulkText}
                onChange={(e) => { setBulkText(e.target.value); parseBulk(e.target.value) }}
              />
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                <div className="mb-1 font-medium">CSV format</div>
                <pre className="overflow-auto"><code>{`color_code,color_desc\n101,Red\n102,Blue\n103,Black`}</code></pre>
                <div className="mt-2 flex items-center gap-2">
                  <input type="file" accept=".csv,text/csv" onChange={(e: any) => onBulkFile(e.target.files?.[0] || null)} />
                  <Button variant="ghost" type="button" onClick={downloadSample}>Download Sample CSV</Button>
                </div>
              </div>
              <div className="text-xs text-gray-600">Parsed: {bulkParsing ? 'Parsing…' : `${bulkPreview.length} rows`}</div>
              {bulkPreview.length > 0 && (
                <div className="max-h-48 overflow-auto rounded border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">S.No</th>
                        <th className="px-2 py-1 text-left">Color Code</th>
                        <th className="px-2 py-1 text-left">Color Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((r, i) => (
                        <tr key={`${r.colorCode}-${i}`} className="border-t">
                          <td className="px-2 py-1">{i + 1}</td>
                          <td className="px-2 py-1">{r.colorCode}</td>
                          <td className="px-2 py-1">{r.colorDesc || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {bulkSummary && (
                <Alert variant="success" title={`Inserted: ${bulkSummary.insertedCount}, Errors: ${bulkSummary.errorCount}`} />
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setBulkOpen(false); setBulkText(''); setBulkPreview([]); setBulkSummary(null) }}>Close</Button>
                <Button onClick={onBulkSubmit} loading={bulkSubmitting} disabled={!bulkPreview.length}>Upload</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setEditOpen(false); resetEdit() }} />
          <div className="relative z-50 w-full max-w-lg rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">Edit Color</h2>
            <form className="mt-3 grid gap-3" onSubmit={onUpdate}>
              <Input
                label="Color Code"
                value={editCode}
                onChange={(e: any) => setEditCode(String(e.target.value).replace(/\D+/g, ''))}
              />
              <Input
                label="Color Description"
                value={editDesc}
                onChange={(e: any) => setEditDesc(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setEditOpen(false); resetEdit() }}>Cancel</Button>
                <Button type="submit">Update</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  )
}
