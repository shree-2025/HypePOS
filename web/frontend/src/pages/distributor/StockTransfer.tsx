import { useEffect, useMemo, useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import Alert from '@/components/ui/Alert'
import api from '@/api/axios'
import { useOrg } from '@/context/org'
import BarcodeScanner from '@/components/scan/BarcodeScanner'

type Item = { id: string; itemCode: string; name: string; size?: string | number; stockId?: string; description?: string; category?: string; brand?: string; colorName?: string; colorCode?: string | number; dealerPrice?: number }
type Line = { id: string; itemId: string; sku: string; name: string; size?: string; qty: number; dealerPrice?: number; total?: number }
type Txn = { id: number; transactionCode: string; fromOutletId: number; toOutletId: number; itemCount: number; totalQty: number; status: string; createdAt: string; createdBy?: string }
type TransferRow = {
  id: number
  batchNo?: string
  date: string
  product: string
  sku: string
  size?: string
  qty: number
  status: string
  fromOutletId: number
  toOutletId: number
}

export default function StockTransfer() {
  const { outlets } = useOrg()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Transfer headers
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')

  // Add-item form
  const [sku, setSku] = useState('')
  const [itemName, setItemName] = useState('')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [size, setSize] = useState('')
  const [qty, setQty] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  // Removed item description selection per new requirement
  const [saving, setSaving] = useState(false)
  const [priority, setPriority] = useState('Normal')
  const [note, setNote] = useState('')
  const [txns, setTxns] = useState<Txn[]>([])
  const [txnsLoading, setTxnsLoading] = useState(false)
  const [submittedBatchNo, setSubmittedBatchNo] = useState('')
  const [submittedRows, setSubmittedRows] = useState<TransferRow[]>([])
  const [scannerOpen, setScannerOpen] = useState(false)

  // In-page edit mode state
  const [editingTxnId, setEditingTxnId] = useState<number | null>(null)
  const [editingTxnCode, setEditingTxnCode] = useState('')

  // Auto-populated fields for display
  const [brand, setBrand] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [colour, setColour] = useState('')
  const [dealerPrice, setDealerPrice] = useState('')

  // View transaction modal state
  const [viewOpen, setViewOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState('')
  const [viewData, setViewData] = useState<any>(null)

  // Edit modal state
  type EditLine = { id?: number; itemId?: number; itemCode?: string; itemCodeDesc?: string; qty: number }
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editLines, setEditLines] = useState<EditLine[]>([])
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [newItemCode, setNewItemCode] = useState('')
  const [newQty, setNewQty] = useState('')

  const fmtINR = (v: any) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return ''
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n) } catch { return `₹ ${n.toFixed(2)}` }
  }

  // Resolve outlet id to display name
  const outletName = (id: any) => {
    if (!id) return 'Distributor'
    const o = outlets.find(o => String(o.id) === String(id))
    return o?.name || String(id)
  }

  // Open in-page edit: load header+lines into the main form
  const openEdit = async (id: number) => {
    try {
      setEditLoading(true)
      setEditError('')
      const { data } = await api.get(`/transfers/requests/${id}`)
      const hdr = data?.header || {}
      const rows = Array.isArray(data?.lines) ? data.lines : []
      setEditingTxnId(Number(hdr.id))
      setEditingTxnCode(String(hdr.transactionCode || ''))
      setFromId(hdr.fromOutletId == null ? '0' : String(hdr.fromOutletId))
      setToId(String(hdr.toOutletId || ''))
      const mappedLines: Line[] = rows.map((ln: any) => {
        const qty = Number(ln.qty || 0)
        const dp = ln.dealerPrice != null ? Number(ln.dealerPrice) : undefined
        const total = dp != null ? qty * dp : undefined
        return {
          id: `ln-${ln.id || Math.random().toString(36).slice(2,7)}`,
          itemId: String(ln.itemId || ''),
          sku: String(ln.stockNo || ln.itemCode || ''),
          name: String(ln.itemCodeDesc || ln.name || ''),
          size: ln.size != null ? String(ln.size) : '',
          qty,
          dealerPrice: dp,
          total,
        }
      })
      setLines(mappedLines)
      // Clear inline add inputs
      setSku(''); setItemName(''); setSelectedItemId(''); setSize(''); setQty(''); setBrand(''); setCategoryName(''); setColour(''); setDealerPrice('')
      setSuccessMsg('Editing existing transfer; make changes and Save Changes to update')
      setTimeout(()=>setSuccessMsg(''), 3000)
    } catch (e: any) {
      setEditError(e?.response?.data?.message || 'Failed to load for edit')
    } finally {
      setEditLoading(false)
    }
  }

  const removeEditLine = (idx: number) => {
    setEditLines(prev => prev.filter((_, i) => i !== idx))
  }

  const addEditLine = () => {
    const qn = Number(newQty)
    if (!newItemCode.trim() || !Number.isFinite(qn) || qn <= 0) return
    // Prevent duplicate by Item Code within edit list
    if (editLines.some(l => (l.itemCode || '').toLowerCase() === newItemCode.trim().toLowerCase())) {
      setEditError('Item already selected')
      return
    }
    setEditLines(prev => [{ itemCode: newItemCode.trim(), qty: qn }, ...prev])
    setNewItemCode(''); setNewQty('')
  }

  const saveEdit = async () => {
    if (!editId) return
    try {
      setEditLoading(true)
      setEditError('')
      const items = editLines.map(l => ({ itemId: l.itemId, itemCode: l.itemCode, qty: Number(l.qty) }))
      await api.put(`/transfers/requests/${editId}/lines`, { items })
      setEditOpen(false)
      setEditId(null)
      setEditLines([])
      await loadTxns()
    } catch (e: any) {
      setEditError(e?.response?.data?.message || 'Failed to save changes')
    } finally {
      setEditLoading(false)
    }
  }

  // Inline status editing
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null)
  const [editingStatusVal, setEditingStatusVal] = useState('')

  const startEditStatus = (t: Txn) => {
    setEditingStatusId(t.id)
    setEditingStatusVal(t.status)
  }

  const allowedNextStatuses = (t: Txn): string[] => {
    if (t.status === 'Pending') return ['Shipped']
    if (t.status === 'Shipped') return ['Received','Confirmed']
    if (t.status === 'Received') return ['Confirmed']
    return []
  }

  const commitStatus = async (t: Txn, newStatus: string) => {
    try {
      const actorOutletId = newStatus === 'Shipped' ? (t.fromOutletId ?? null) : t.toOutletId
      await api.put(`/transfers/requests/${t.id}`, { status: newStatus, actorOutletId })
      setEditingStatusId(null)
      setEditingStatusVal('')
      await loadTxns()
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Failed to update status')
    }
  }

  // Resolve items URL safely (avoids /api/api duplication)
  const itemsUrl = useMemo(() => {
    try {
      const base = String(api.defaults.baseURL || '')
      if (/\/api\/?$/.test(base)) {
        const baseWithSlash = base.endsWith('/') ? base : base + '/'
        return new URL('items', baseWithSlash).toString()
      }
      return '/api/items'
    } catch { return '/api/items' }
  }, [])

  // Open transaction details
  const openView = async (id: number) => {
    try {
      setViewOpen(true)
      setViewLoading(true)
      setViewError('')
      setViewData(null)
      const { data } = await api.get(`/transfers/requests/${id}`)
      setViewData(data)
    } catch (e: any) {
      setViewError(e?.response?.data?.message || 'Failed to load details')
    } finally {
      setViewLoading(false)
    }
  }

  // Print a transaction: fetch details and open a print-friendly window
  const printTxn = async (id: number) => {
    // Open window synchronously to avoid popup blockers
    const win = window.open('', '_blank')
    if (!win) {
      alert('Please allow pop-ups for this site to print the challan.')
      return
    }
    // Write temporary loading shell
    try {
      win.document.open()
      win.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Printing…</title>
        <style>body{font-family:Arial,Helvetica,sans-serif;padding:16px} .muted{color:#666}</style>
      </head><body><div class="muted">Preparing print…</div></body></html>`)
      win.document.close()
    } catch {}
    try {
      const { data } = await api.get(`/transfers/requests/${id}`)
      const hdr = data?.header || {}
      const rows: any[] = Array.isArray(data?.lines) ? data.lines : []
      const totals = rows.reduce((acc, r) => {
        const q = Number(r.qty || 0)
        const dp = Number(r.dealerPrice || 0)
        return { qty: acc.qty + q, amount: acc.amount + (q * dp) }
      }, { qty: 0, amount: 0 })

      const AmountWords = (n: number) => {
        const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
        const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
        const numToWords = (num: number): string => {
          if (num === 0) return 'Zero'
          const crore = Math.floor(num/10000000); num%=10000000
          const lakh = Math.floor(num/100000); num%=100000
          const thousand = Math.floor(num/1000); num%=1000
          const hundred = Math.floor(num/100); num%=100
          const parts: string[] = []
          const belowHundred = (x:number) => x<20? a[x]: b[Math.floor(x/10)] + (x%10? ' ' + a[x%10] : '')
          if (crore) parts.push(`${belowHundred(crore)} Crore`)
          if (lakh) parts.push(`${belowHundred(lakh)} Lakh`)
          if (thousand) parts.push(`${belowHundred(thousand)} Thousand`)
          if (hundred) parts.push(`${a[hundred]} Hundred`)
          if (num) parts.push(parts.length? 'and ' + belowHundred(num) : belowHundred(num))
          return parts.join(' ')
        }
        const rupees = Math.floor(n)
        const paise = Math.round((n - rupees) * 100)
        return `${numToWords(rupees)} Rupees${paise? ' and ' + numToWords(paise) + ' Paise' : ''} Only`
      }

      const fromName = outletName(hdr.fromOutletId)
      const toName = outletName(hdr.toOutletId)
      const printedAt = new Date().toLocaleString()

      const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Delivery Challan ${hdr.transactionCode || ''}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .doc { width: 210mm; margin: 0 auto; padding: 10mm; }
      .title { text-align: center; font-size: 16px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
      .top-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
      .box { border: 1px solid #000; padding: 6px; min-height: 60px; }
      .row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 6px; }
      .lbl { color: #444; font-size: 11px; }
      .val { font-size: 12px; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
      th, td { border: 1px solid #000; padding: 6px 8px; }
      th { background: #f1f1f1; }
      tfoot td { font-weight: 700; }
      .footer { margin-top: 16px; font-size: 11px; color: #333; display:flex; justify-content: space-between; }
      .sign { text-align: right; margin-top: 24px; }
      @media print { body { margin: 0; } }
    </style>
  </head>
  <body>
    <div class="doc">
      <div class="title">Delivery Challan</div>
      <div class="top-grid">
        <div class="box">
          <div class="lbl">From</div>
          <div class="val">${fromName}</div>
          <div class="row">
            <div><span class="lbl">Challan No:</span> <span class="val">${hdr.transactionCode || ''}</span></div>
            <div><span class="lbl">Created:</span> <span class="val">${String(hdr.createdAt||'').slice(0,19).replace('T',' ')}</span></div>
            <div><span class="lbl">Status:</span> <span class="val">${hdr.status || ''}</span></div>
          </div>
        </div>
        <div class="box">
          <div class="lbl">Consignee (Ship to)</div>
          <div class="val">${toName}</div>
          <div class="row">
            <div><span class="lbl">Created By:</span> <span class="val">${hdr.createdBy || ''}</span></div>
            <div><span class="lbl">Dispatched Through:</span> <span class="val"></span></div>
            <div><span class="lbl">Destination:</span> <span class="val"></span></div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:36px">Sr</th>
            <th>Description of Goods</th>
            <th>HSN/SAC</th>
            <th style="text-align:right;width:80px">Qty</th>
            <th style="text-align:right;width:100px">Rate</th>
            <th style="text-align:right;width:120px">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => {
            const qty = Number(r.qty || 0)
            const rate = Number(r.dealerPrice || 0)
            const total = qty * rate
            const desc = r.category || r.itemCodeDesc || r.itemCode || ''
            return `<tr>
              <td style="text-align:center">${i+1}</td>
              <td>${desc}</td>
              <td>${r.hsnCode || ''}</td>
              <td style="text-align:right">${qty}</td>
              <td style="text-align:right">${Number.isFinite(rate) ? rate.toFixed(2) : ''}</td>
              <td style="text-align:right">${Number.isFinite(total) ? total.toFixed(2) : ''}</td>
            </tr>`
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align:right">Totals</td>
            <td style="text-align:right">${totals.qty}</td>
            <td></td>
            <td style="text-align:right">${totals.amount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="footer">
        <div><strong>Amount (in words):</strong> ${AmountWords(totals.amount)}</div>
        <div><strong>Printed on:</strong> ${printedAt}</div>
      </div>

      <div class="sign">
        <div>For ${fromName}</div>
        <div style="height:40px"></div>
        <div>Authorised Signatory</div>
      </div>
    </div>
    <script>window.print();</script>
  </body>
  </html>`

      try {
        win.document.open(); win.document.write(html); win.document.close();
      } catch (err) {
        // Fallback: if writing failed, open a new window again
        const w2 = window.open('', '_blank')
        if (!w2) return
        w2.document.open(); w2.document.write(html); w2.document.close();
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Load items for quick lookup
  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const tryFetch = async (url: string) => {
          const { data } = await api.get(url)
          return Array.isArray(data) ? data : []
        }
        let data = await tryFetch(itemsUrl)
        if (!data.length) {
          const alt = itemsUrl.endsWith('/api/items') ? '/items' : '/api/items'
          try {
            data = await tryFetch(alt)
          } catch {}
        }
        const arr: Item[] = data.map((r: any) => ({
          id: String(r.id),
          itemCode: String(r.itemCode || ''),
          name: String(r.itemCodeDesc || r.name || ''),
          size: r.size != null ? String(r.size) : '',
          stockId: r.stockId != null ? String(r.stockId) : '',
          description: r.description != null ? String(r.description) : undefined,
          category: r.category != null ? String(r.category) : undefined,
          brand: r.brand != null ? String(r.brand) : undefined,
          colorName: r.colorName != null ? String(r.colorName) : undefined,
          colorCode: r.colorCode != null ? String(r.colorCode) : undefined,
          dealerPrice: r.dealerPrice != null ? Number(r.dealerPrice) : undefined,
        }))
        setItems(arr)
      } catch {
      } finally { setLoading(false) }
    })()
  }, [itemsUrl])

  // Load recent transactions (grouped)
  const loadTxns = async () => {
    try {
      setTxnsLoading(true)
      const { data } = await api.get('/transfers/requests')
      setTxns(Array.isArray(data) ? data : [])
    } catch {
    } finally { setTxnsLoading(false) }
  }
  useEffect(() => { loadTxns() }, [])

  // Lookup
  const foundItem = useMemo(() => {
    if (selectedItemId) {
      const it = items.find(i => i.id === selectedItemId)
      if (it) return it
    }
    const byStock = items.find(i => (i.stockId || '').toLowerCase() === sku.trim().toLowerCase())
    if (byStock) return byStock
    const bySku = items.find(i => i.itemCode.toLowerCase() === sku.trim().toLowerCase())
    if (bySku) return bySku
    if (itemName.trim()) {
      const nm = itemName.trim().toLowerCase()
      return items.find(i => i.name.toLowerCase().includes(nm) && (!size || String(i.size) === String(size))) || null
    }
    return null
  }, [items, selectedItemId, sku, itemName, size]) as Item | null

  // No item description dropdown anymore

  // Auto-fill item fields when scanning barcode (SKU) or choosing from dropdown
  useEffect(() => {
    if (sku.trim()) {
      const q = sku.trim().toLowerCase()
      const matches = items.filter(i => (i.stockId || '').toLowerCase() === q || i.itemCode.toLowerCase() === q)
      if (matches.length === 1) {
        const it = matches[0]
        setItemName(it.name)
        setSelectedItemId(it.id)
        setSize(String(it.size || ''))
        setBrand(it.brand || '')
        setCategoryName(it.category || '')
        setColour(it.colorName ? `${it.colorName}${it.colorCode ? ` (${it.colorCode})` : ''}` : (it.colorCode ? String(it.colorCode) : ''))
        setDealerPrice(it.dealerPrice != null ? String(it.dealerPrice) : '')
        setErrorMsg('')
      } else if (matches.length > 1) {
        // Duplicate barcode/SKU detected; require user to choose from dropdown
        setSelectedItemId('')
        setItemName('')
        setSize('')
        setBrand('')
        setCategoryName('')
        setColour('')
        setDealerPrice('')
        setErrorMsg('Multiple items match this barcode. Please select Item Name.')
      }
    }
  }, [sku, items])

  // Auto-fill when selecting by item name from dropdown
  useEffect(() => {
    if (itemName.trim()) {
      const it = items.find(i => i.name.toLowerCase() === itemName.trim().toLowerCase())
      if (it) {
        setSku(it.stockId || it.itemCode)
        setSize(String(it.size || ''))
        setBrand(it.brand || '')
        setCategoryName(it.category || '')
        setColour(it.colorName ? `${it.colorName}${it.colorCode ? ` (${it.colorCode})` : ''}` : (it.colorCode ? String(it.colorCode) : ''))
        setDealerPrice(it.dealerPrice != null ? String(it.dealerPrice) : '')
        setSelectedItemId(it.id)
      }
    }
  }, [itemName, items])

  // Auto-fill when selecting by ID from dropdown
  useEffect(() => {
    if (selectedItemId) {
      const it = items.find(i => i.id === selectedItemId)
      if (it) {
        setItemName(it.name)
        setSku(it.stockId || it.itemCode)
        setSize(String(it.size || ''))
        setBrand(it.brand || '')
        setCategoryName(it.category || '')
        setColour(it.colorName ? `${it.colorName}${it.colorCode ? ` (${it.colorCode})` : ''}` : (it.colorCode ? String(it.colorCode) : ''))
        setDealerPrice(it.dealerPrice != null ? String(it.dealerPrice) : '')
      }
    }
  }, [selectedItemId, items])

  const addLine = () => {
    setErrorMsg('')
    const qn = Number(qty)
    // Allow adding rows before selecting From/To; validate on submit
    if (!sku.trim() && !selectedItemId) { setErrorMsg('Provide either a SKU or select an Item'); return }
    if (!foundItem) { setErrorMsg('Item not found'); return }
    // Prevent duplicates by Stock No / Item Code
    try {
      const key = String(foundItem.stockId || foundItem.itemCode || '').toLowerCase()
      if (key && lines.some(l => String(l.sku || '').toLowerCase() === key)) {
        setErrorMsg('Item already selected')
        return
      }
    } catch {}
    if (!Number.isFinite(qn) || qn <= 0) { setErrorMsg('Invalid qty'); return }
    const id = `ln-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
    const dp = Number(dealerPrice)
    const totalVal = Number.isFinite(dp) ? qn * dp : undefined
    setLines(prev => [{ id, itemId: foundItem.id, sku: String(foundItem.stockId || foundItem.itemCode), name: foundItem.name, size: String(foundItem.size || ''), qty: qn, dealerPrice: Number.isFinite(dp) ? dp : undefined, total: totalVal }, ...prev])
    setSku(''); setItemName(''); setSelectedItemId(''); setSize(''); setQty(''); setBrand(''); setCategoryName(''); setColour(''); setDealerPrice('')
    setBrand(''); setCategoryName(''); setColour(''); setDealerPrice('')
  }

  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id))

  const save = async () => {
    try {
      setErrorMsg('')
      if (!fromId || !toId) { setErrorMsg('Select Transfer From and To'); return }
      if (fromId === toId) { setErrorMsg('Transfer From and To cannot be the same'); return }
      if (!lines.length) { setErrorMsg('Add at least one line'); return }
      setSaving(true)
      if (editingTxnId) {
        // Update existing
        const items = lines.map(l => ({ itemId: l.itemId ? Number(l.itemId) : undefined, qty: Number(l.qty) }))
        await api.put(`/transfers/requests/${editingTxnId}/lines`, { items })
        setSuccessMsg(`Transaction ${editingTxnCode || editingTxnId} updated with ${lines.length} item(s)`) 
        setTimeout(() => setSuccessMsg(''), 4000)
        setEditingTxnId(null); setEditingTxnCode('')
        setLines([])
        setNote('')
        setPriority('Normal')
        await loadTxns()
      } else {
        // Create new
        const body = {
          fromOutletId: fromId === '0' ? null : Number(fromId),
          toOutletId: Number(toId),
          priority,
          note,
          items: lines.map(l => ({ itemId: l.itemId, qty: l.qty }))
        }
        const { data } = await api.post('/transfers/requests', body)
        const txnCode = data?.transactionCode || 'TXN'
        setSuccessMsg(`Transaction ${txnCode} submitted (${priority}) with ${lines.length} item(s)`) 
        setTimeout(() => setSuccessMsg(''), 4000)
        setLines([])
        setNote('')
        setPriority('Normal')
        await loadTxns()
      }
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Submit failed')
    } finally { setSaving(false) }
  }

  const columns: Column<Line>[] = [
    { header: 'Stock No', key: 'sku' },
    { header: 'Item', key: 'name' },
    { header: 'Size', key: 'size' },
    { header: 'Qty', key: 'qty' },
    { header: 'Dealer Price', key: 'dealerPrice', render: (r) => (r.dealerPrice != null ? r.dealerPrice.toFixed(2) : '') },
    { header: 'Total', key: 'total', render: (r) => (r.total != null ? r.total.toFixed(2) : '') },
    { header: 'Actions', key: 'actions', render: (r) => (
      <Button variant="warning" className="px-2 py-1 text-xs" onClick={() => removeLine(r.id)}>Remove</Button>
    )},
  ]

  return (
    <Shell>
      <PageHeader
        title="Request Stock"
        subtitle="Create a stock request to your distributor. Requests can be forwarded to HO or other outlets by the distributor."
      />

      {successMsg && (
        <div className="mb-3"><Alert variant="success" title={successMsg} /></div>
      )}
      {errorMsg && (
        <div className="mb-3"><Alert variant="warning" title={errorMsg} /></div>
      )}

      <div className="grid gap-4">
        <Card title="Add Item">
          {/* Row 1: From/To */}
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Transfer From"
              value={fromId}
              onChange={(e: any) => setFromId(e.target.value)}
              options={[{ label: 'Distributor', value: '0' }, ...outlets.map(o => ({ label: o.name, value: String(o.id) }))]}
              disabled={!!editingTxnId}
            />
            <Select
              label="Transfer To (Outlet)"
              value={toId}
              onChange={(e: any) => setToId(e.target.value)}
              options={[{ label: 'Select Outlet', value: '' }, ...outlets.map(o => ({ label: o.name, value: String(o.id) }))]}
              disabled={!!editingTxnId}
            />
          </div>

          {/* Row 2: Item fields */}
          <div className="mt-4 grid gap-3 md:grid-cols-8">
            <div>
              <Input label="Scan Barcode (Stock No)" value={sku} onChange={(e: any) => setSku(e.target.value)} placeholder="Scan or enter Stock No" onKeyDown={(e: any) => { if (e.key === 'Enter') addLine() }} />
              <div className="mt-1">
                <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => setScannerOpen(true)}>Scan</Button>
              </div>
            </div>
            <Select
              label="Item Code"
              value={selectedItemId}
              onChange={(e: any) => setSelectedItemId(e.target.value)}
              options={[{ label: 'Select Item Code', value: '' }, ...items.map(it => ({ label: it.itemCode || it.name, value: it.id }))]}
            />
            {/* Item Description removed */}
            <Input label="Brand" value={brand} readOnly placeholder="-" />
            <Input label="Category" value={categoryName} readOnly placeholder="-" />
            <Input label="Colour" value={colour} readOnly placeholder="-" />
            <Input label="Size" value={size} readOnly placeholder="-" />
            <Input label="Qty" value={qty} onChange={(e: any) => setQty(e.target.value)} placeholder="0" />
            <Input label="Dealer Price" value={dealerPrice} readOnly placeholder="-" />
            <Input label="Total Price" value={(Number(qty) && Number(dealerPrice)) ? (Number(qty) * Number(dealerPrice)).toFixed(2) : ''} readOnly placeholder="-" />
            <div className="flex items-end">
              <Button className="w-full" onClick={addLine} disabled={loading}>Add</Button>
            </div>
          </div>


          <div className="mt-4">
            <SimpleTable columns={columns} data={lines} keyField="id" density="compact" />
            {!lines.length && (
              <div className="p-3 text-sm text-gray-500">No data</div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            {editingTxnId ? (
              <div className="text-sm text-gray-600">Editing Transaction <span className="font-medium">{editingTxnCode || editingTxnId}</span>. You can add/remove lines and update quantities.</div>
            ) : <span />}
            <div className="flex gap-2">
              {editingTxnId && (
                <Button variant="outline" onClick={() => { setEditingTxnId(null); setEditingTxnCode(''); setLines([]) }}>Cancel Edit</Button>
              )}
              <Button onClick={save} loading={saving} disabled={!lines.length}>{editingTxnId ? 'Save Changes' : 'Submit Request'}</Button>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Recent Transactions" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-3">Transaction ID</th>
                <th className="py-2 pr-3">From</th>
                <th className="py-2 pr-3">To</th>
                <th className="py-2 pr-3">Items</th>
                <th className="py-2 pr-3">Total Qty</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Created By</th>
                <th className="py-2 pr-3">Created</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {txnsLoading && (
                <tr><td className="py-3 text-gray-500" colSpan={9}>Loading...</td></tr>
              )}
              {!txnsLoading && !txns.length && (
                <tr><td className="py-3 text-gray-500" colSpan={9}>No data</td></tr>
              )}
              {!txnsLoading && txns.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="py-2 pr-3">{t.transactionCode}</td>
                  <td className="py-2 pr-3">{(() => {
                    if (!t.fromOutletId) return 'Distributor'
                    const o = outlets.find(o => String(o.id) === String(t.fromOutletId))
                    return o?.name || String(t.fromOutletId)
                  })()}</td>
                  <td className="py-2 pr-3">{(() => {
                    const o = outlets.find(o => String(o.id) === String(t.toOutletId))
                    return o?.name || String(t.toOutletId)
                  })()}</td>
                  <td className="py-2 pr-3">{t.itemCount}</td>
                  <td className="py-2 pr-3">{t.totalQty}</td>
                  <td className="py-2 pr-3">
                    {editingStatusId === t.id ? (
                      <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        value={editingStatusVal}
                        onChange={(e) => setEditingStatusVal(e.target.value)}
                        onBlur={() => { if (editingStatusVal !== t.status && allowedNextStatuses(t).includes(editingStatusVal)) commitStatus(t, editingStatusVal); setEditingStatusId(null) }}
                      >
                        <option value={t.status}>{t.status}</option>
                        {allowedNextStatuses(t).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="cursor-pointer underline" onClick={() => startEditStatus(t)}>{t.status}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{t.createdBy || '-'}</td>
                  <td className="py-2 pr-3">{t.createdAt?.slice(0,19).replace('T',' ')}</td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-2">
                      <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => openView(t.id)}>View</Button>
                      <Button className="px-2 py-1 text-xs" disabled={t.status !== 'Pending'} onClick={() => openEdit(t.id)}>Edit</Button>
                      <Button variant="outline" className="px-2 py-1 text-xs" disabled={t.status === 'Pending'} onClick={() => printTxn(t.id)}>Print</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative z-50 w-[95vw] max-w-4xl rounded-xl bg-white p-5 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Edit Transfer</h3>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Close</Button>
            </div>
            {editLoading && <div>Loading…</div>}
            {editError && <div className="text-sm text-red-600">{editError}</div>}
            {!editLoading && (
              <div>
                <div className="grid gap-3 md:grid-cols-4">
                  <Input label="Add Item Code" value={newItemCode} onChange={(e: any) => setNewItemCode(e.target.value)} placeholder="ITEMCODE or Stock No" />
                  <Input label="Qty" value={newQty} onChange={(e: any) => setNewQty(e.target.value)} placeholder="0" />
                  <div className="flex items-end">
                    <Button className="w-full" onClick={addEditLine}>Add Line</Button>
                  </div>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-3">Item Code</th>
                        <th className="py-2 pr-3">Description</th>
                        <th className="py-2 pr-3 text-right">Qty</th>
                        <th className="py-2 pr-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editLines.length === 0 && (
                        <tr><td className="py-3 text-gray-500" colSpan={4}>No lines</td></tr>
                      )}
                      {editLines.map((ln, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="py-2 pr-3">{ln.itemCode || '-'}</td>
                          <td className="py-2 pr-3">{ln.itemCodeDesc || '-'}</td>
                          <td className="py-2 pr-3 text-right">
                            <input
                              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-right"
                              type="number"
                              min={1}
                              value={ln.qty}
                              onChange={(e) => {
                                const v = Number(e.target.value)
                                setEditLines(prev => prev.map((x, i) => i === idx ? { ...x, qty: v } : x))
                              }}
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <Button variant="warning" className="px-2 py-1 text-xs" onClick={() => removeEditLine(idx)}>Remove</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button onClick={saveEdit} loading={editLoading} disabled={editLines.length === 0}>Save Changes</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!!submittedBatchNo && (
        <div className="mt-4">
          <Card title={`Submitted Items — Batch ${submittedBatchNo}`}>
            <SimpleTable
              columns={[
                { header: 'ID', key: 'id' },
                { header: 'Date', key: 'date' },
                { header: 'SKU', key: 'sku' },
                { header: 'Item', key: 'product' },
                { header: 'Size', key: 'size' },
                { header: 'Qty', key: 'qty' },
                { header: 'Status', key: 'status' },
              ]}
              data={submittedRows}
              keyField="id"
              density="compact"
            />
            {!submittedRows.length && (
              <div className="p-3 text-sm text-gray-500">No rows returned for this batch.</div>
            )}
          </Card>
        </div>
      )}

      {/* View Transaction Overlay */}
      {viewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[90%] max-w-5xl rounded-md bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Transaction Details</h3>
              <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            </div>
            {viewError && <div className="mb-2"><Alert variant="warning" title={viewError} /></div>}
            {viewLoading && <div className="p-3 text-sm text-gray-500">Loading…</div>}
            {!viewLoading && viewData && (
              <div>
                <div className="mb-3 grid gap-3 md:grid-cols-3">
                  <Input label="Transfer ID" value={viewData.header.transactionCode} readOnly />
                  <Input label="From" value={(() => { const id = viewData.header.fromOutletId; if (!id) return 'Distributor'; const o = outlets.find(o=>String(o.id)===String(id)); return o?.name || String(id) })()} readOnly />
                  <Input label="To" value={(() => { const id = viewData.header.toOutletId; const o = outlets.find(o=>String(o.id)===String(id)); return o?.name || String(id) })()} readOnly />
                  <Input label="Status" value={viewData.header.status} readOnly />
                  <Input label="Created" value={String(viewData.header.createdAt).slice(0,19).replace('T',' ')} readOnly />
                  <Input label="Created By" value={String(viewData.header.createdBy || '')} readOnly />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white shadow-sm">
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-3">Stock No</th>
                        <th className="py-2 pr-3">Item Code</th>
                        <th className="py-2 pr-3">Item Code Desc</th>
                        <th className="py-2 pr-3">Category</th>
                        <th className="py-2 pr-3">Brand</th>
                        <th className="py-2 pr-3">Colour</th>
                        <th className="py-2 pr-3">Colour Code</th>
                        <th className="py-2 pr-3">Size</th>
                        <th className="py-2 pr-3 text-right">Retailer Price</th>
                        <th className="py-2 pr-3 text-right">Dealer Price</th>
                        <th className="py-2 pr-3 text-right">Cost Price</th>
                        <th className="py-2 pr-3 text-right">Last Purchase Price</th>
                        <th className="py-2 pr-3">Sole</th>
                        <th className="py-2 pr-3">Material</th>
                        <th className="py-2 pr-3">HSN</th>
                        <th className="py-2 pr-3">Tax Code</th>
                        <th className="py-2 pr-3 text-right">Qty</th>
                        <th className="py-2 pr-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewData.lines.map((ln: any) => (
                        <tr key={ln.id} className="border-t odd:bg-gray-50">
                          <td className="py-2 pr-3">{ln.stockNo || ''}</td>
                          <td className="py-2 pr-3">{ln.itemCode || ''}</td>
                          <td className="py-2 pr-3">{ln.itemCodeDesc || ''}</td>
                          <td className="py-2 pr-3">{ln.category || ''}</td>
                          <td className="py-2 pr-3">{ln.brand || ''}</td>
                          <td className="py-2 pr-3">{ln.colorName || ''}</td>
                          <td className="py-2 pr-3">{ln.colorCode || ''}</td>
                          <td className="py-2 pr-3">{ln.size ?? ''}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtINR(ln.retailPrice)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtINR(ln.dealerPrice)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtINR(ln.costPrice)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{fmtINR(ln.lastPurchasePrice)}</td>
                          <td className="py-2 pr-3">{ln.sole || ''}</td>
                          <td className="py-2 pr-3">{ln.material || ''}</td>
                          <td className="py-2 pr-3">{ln.hsnCode || ''}</td>
                          <td className="py-2 pr-3">{ln.taxCode || ''}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{ln.qty}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{ln.dealerPrice != null ? fmtINR(Number(ln.dealerPrice) * Number(ln.qty)) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                    {(() => {
                      const sumQty = viewData.lines.reduce((s: number, ln: any) => s + Number(ln.qty || 0), 0)
                      const sumTotal = viewData.lines.reduce((s: number, ln: any) => s + (Number(ln.dealerPrice || 0) * Number(ln.qty || 0)), 0)
                      return (
                        <tfoot>
                          <tr className="border-t font-semibold bg-gray-50">
                            <td className="py-2 pr-3" colSpan={15}>Totals</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{sumQty}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{fmtINR(sumTotal)}</td>
                          </tr>
                        </tfoot>
                      )
                    })()}
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {scannerOpen && (
        <BarcodeScanner
          onDetected={(text) => { setSku(text); setScannerOpen(false) }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </Shell>
  )
}
