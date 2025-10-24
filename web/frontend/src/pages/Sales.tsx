import React, { useState, useRef, useEffect, useMemo } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { useOrg } from '@/context/org'
import BarcodeScanner from '@/components/scan/BarcodeScanner'

export default function Sales() {
  const { selectedOutletId } = useOrg()
  type Product = { id: string; name: string; sku: string; mrp: number; price: number; sizes?: string[] }
  type CartItem = { id: string; name: string; sku: string; price: number; qty: number; size?: string }
  type HeldBill = {
    id: string
    createdAt: number
    customerName: string
    customerMobile: string
    discountPct: number
    taxRate: number
    totalAmount?: number
    heldBy?: string
    cart: CartItem[]
  }

  type SalesLogEntry = {
    id: string
    createdAt: number
    customerName: string
    customerMobile: string
    payMethod: 'cash' | 'card' | 'upi'
    subtotal: number
    discountPct: number
    discountAmt: number
    taxable: number
    taxRate: number
    tax: number
    total: number
    cart: CartItem[]
    billId?: string
    // Exchange support
    isExchange?: boolean
    exchangeOldItems?: { name: string; size?: string; qty: number; price: number }[]
    exchangeNewItems?: { name: string; size?: string; qty: number; price: number }[]
    exchangeOldAmt?: number
    exchangeNewAmt?: number
    exchangeDiff?: number
  }

  // Outlet SKU list loaded from backend stock API
  type StockRow = { id: number; outletId: number; itemId: number; qty: number; name: string; category: string; brand: string; colour: string; size: number; itemCode: string; retailPrice?: number | null }

  const [skuOptions, setSkuOptions] = useState<Product[]>([])
  const [skuLoading, setSkuLoading] = useState(false)
  const [skuError, setSkuError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || (window as any)?.VITE_API_BASE_URL || ''

  const products: Product[] = skuOptions

  const [activeTab, setActiveTab] = useState<'entry' | 'hold' | 'exchange' | 'log'>('entry')
  const [barcode, setBarcode] = useState('')
  const barcodeRef = useRef<HTMLInputElement | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [quickSku, setQuickSku] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'upi'>('cash')
  // Multi-payment split
  const [payCash, setPayCash] = useState<string>('')
  const [payCard, setPayCard] = useState<string>('')
  const [payUpi, setPayUpi] = useState<string>('')
  // Exchange payment modal
  const [exchangePayOpen, setExchangePayOpen] = useState(false)
  const [exPayCash, setExPayCash] = useState<string>('')
  const [exPayCard, setExPayCard] = useState<string>('')
  const [exPayUpi, setExPayUpi] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  const [customerMobile, setCustomerMobile] = useState('')
  const [discountPct, setDiscountPct] = useState<number>(0)
  // taxRate input removed from main UI; tax is auto per item (<2500 => 5%, >=2500 => 18%)
  const [taxRate, setTaxRate] = useState<number>(0) // legacy persistence; not shown
  const [heldBills, setHeldBills] = useState<HeldBill[]>([])
  const [salesLog, setSalesLog] = useState<SalesLogEntry[]>([])
  const [currentBillId, setCurrentBillId] = useState<string | null>(null)
  type AuditEntry = { id: string; type: 'HOLD' | 'RESUME' | 'DELETE'; billId: string; by: string; at: number }
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const staffId = useMemo(() => {
    try { return localStorage.getItem('pos_staff_id') || 'STAFF-1' } catch { return 'STAFF-1' }
  }, [])

  // Exchange tab state
  const [exchangeReason, setExchangeReason] = useState<string>('Size Issue')
  const exchangeReasons = ['Size Issue', 'Color Issue', 'Defect', 'Wrong Item', 'Other']
  const [exchangeBarcode, setExchangeBarcode] = useState('')
  const [exchangeQuery, setExchangeQuery] = useState('')
  const [exchangeSize, setExchangeSize] = useState<string>('')
  const [exchangeCart, setExchangeCart] = useState<CartItem[]>([])
  // Old bill lookup and returns
  const [oldBillNo, setOldBillNo] = useState('')
  const [oldBill, setOldBill] = useState<any | null>(null)
  const [oldItems, setOldItems] = useState<Array<{ id: string; sku: string; name: string; qty: number; price: number; size?: string }>>([])
  const [returnQty, setReturnQty] = useState<Record<string, number>>({})
  const [returnSel, setReturnSel] = useState<Record<string, boolean>>({})
  const [scannerOpen, setScannerOpen] = useState(false)
  const exchangePayloadRef = useRef<any>(null) // FIX: Use ref for temporary state

  const reprintExchangeFromLog = (entry: SalesLogEntry) => {
    if (!entry.isExchange) return
    printExchangeReceipt({
      billId: entry.billId,
      oldItems: entry.exchangeOldItems || [],
      newItems: entry.exchangeNewItems || [],
      oldAmt: entry.exchangeOldAmt || 0,
      newAmt: entry.exchangeNewAmt || 0,
      diff: entry.exchangeDiff || 0,
    })
  }

  useEffect(() => {
    // autofocus barcode on mount
    barcodeRef.current?.focus()
    // restore from localStorage
    try {
      const savedCart = localStorage.getItem('pos_cart')
      const savedCustomer = localStorage.getItem('pos_customer')
      const savedSettings = localStorage.getItem('pos_settings')
      const savedHeld = localStorage.getItem('pos_held_bills')
      const savedSalesLog = localStorage.getItem('pos_sales_log')
      if (savedCart) setCart(JSON.parse(savedCart))
      if (savedCustomer) {
        const c = JSON.parse(savedCustomer)
        setCustomerName(c.name || '')
        setCustomerMobile(c.mobile || '')
      }
      if (savedSettings) {
        const s = JSON.parse(savedSettings)
        if (typeof s.discountPct === 'number') setDiscountPct(s.discountPct)
        if (typeof s.taxRate === 'number') setTaxRate(s.taxRate)
        if (s.payMethod === 'cash' || s.payMethod === 'card' || s.payMethod === 'upi') setPayMethod(s.payMethod)
      }
      if (savedHeld) setHeldBills(JSON.parse(savedHeld))
      if (savedSalesLog) setSalesLog(JSON.parse(savedSalesLog))
      const savedAudit = localStorage.getItem('pos_audit_trail')
      if (savedAudit) setAudit(JSON.parse(savedAudit))
    } catch {}
  }, [])

  // Load outlet SKUs and cache by outlet
  useEffect(() => {
    const outletId = String((selectedOutletId as any) ?? '').trim()
    if (!outletId || outletId === 'undefined' || outletId === 'null') {
      setSkuOptions([])
      setSkuError('Select an outlet to load SKUs')
      return
    }
    const cacheKey = `pos_skus_${outletId}`
    const cached = (() => { try { return localStorage.getItem(cacheKey) } catch { return null } })()
    if (cached) {
      try { setSkuOptions(JSON.parse(cached)) } catch {}
    }
    ;(async () => {
      setSkuLoading(true); setSkuError(null)
      try {
        const url = `${API_BASE}/stock?outletId=${encodeURIComponent(outletId)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to load SKUs (${res.status})`)
        const rows: StockRow[] = await res.json()
        const mapped: Product[] = rows.map(r => ({
          id: String(r.itemId),
          name: r.name,
          sku: r.itemCode,
          mrp: Number(r.retailPrice ?? 0),
          price: Number(r.retailPrice ?? 0),
          sizes: r.size != null ? [String(r.size)] : undefined,
        }))
        // Deduplicate by SKU
        const dedup = Object.values(Object.fromEntries(mapped.map(m => [m.sku, m])))
        setSkuOptions(dedup)
        try { localStorage.setItem(cacheKey, JSON.stringify(dedup)) } catch {}
      } catch (e: any) {
        setSkuError(e?.message || 'Failed to load SKUs')
      } finally {
        setSkuLoading(false)
      }
    })()
  }, [API_BASE, selectedOutletId, reloadTick])

  useEffect(() => {
    try { localStorage.setItem('pos_cart', JSON.stringify(cart)) } catch {}
  }, [cart])
  useEffect(() => {
    try { localStorage.setItem('pos_customer', JSON.stringify({ name: customerName, mobile: customerMobile })) } catch {}
  }, [customerName, customerMobile])
  useEffect(() => {
    try { localStorage.setItem('pos_settings', JSON.stringify({ discountPct, taxRate, payMethod })) } catch {}
  }, [discountPct, taxRate, payMethod])
  // Load held bills from backend
  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const url = `${API_BASE}/sales/hold`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to load held bills')
        const data = await res.json()
        if (!ignore && Array.isArray(data)) {
          const normalized = data.map((d: any) => ({
            ...d,
            // ensure createdAt is a number (ms since epoch)
            createdAt: typeof d.createdAt === 'number' ? d.createdAt : (d.createdAt ? new Date(d.createdAt).getTime() : Date.now()),
          }))
          setHeldBills(normalized)
        }
      } catch {}
    })()
    return () => { ignore = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE])
  useEffect(() => {
    try { localStorage.setItem('pos_sales_log', JSON.stringify(salesLog)) } catch {}
  }, [salesLog])
  useEffect(() => {
    try { localStorage.setItem('pos_audit_trail', JSON.stringify(audit)) } catch {}
  }, [audit])

  // Load Sales Log from backend on mount
  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/sales`)
        if (!res.ok) return
        const sales = await res.json()
        const out: SalesLogEntry[] = []
        for (const s of sales) {
          let items: any[] = []
          try {
            const ir = await fetch(`${API_BASE}/sales/${s.id}/items`)
            if (ir.ok) items = await ir.json()
          } catch {}
          out.push({
            id: String(s.id),
            createdAt: s.bill_date ? new Date(s.bill_date).getTime() : (s.created_at ? new Date(s.created_at).getTime() : Date.now()),
            customerName: s.customer_name || '',
            customerMobile: s.customer_mobile || '',
            payMethod: (s.pay_method === 'cash' || s.pay_method === 'card' || s.pay_method === 'upi') ? s.pay_method : 'cash',
            subtotal: Number(s.subtotal || 0),
            discountPct: Number(s.discount_pct || 0),
            discountAmt: Number(s.discount_amt || 0),
            taxable: Number(s.taxable || 0),
            taxRate: Number(s.tax_rate || 0),
            tax: Number(s.tax_amt || 0),
            total: Number(s.total || 0),
            cart: items.map(m => ({ id: crypto.randomUUID(), name: m.name, sku: m.sku, price: Number(m.price), qty: Number(m.qty), size: m.size || undefined })),
            billId: s.bill_no || String(s.id),
          })
        }
        if (!ignore) setSalesLog(out)
      } catch {}
    })()
    return () => { ignore = true }
  }, [API_BASE])

  const addToCart = (product: Product, selSize?: string) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(ci => ci.sku === product.sku && ci.size === selSize)
      if (existingIdx >= 0) {
        const next = [...prev]
        next[existingIdx] = { ...next[existingIdx], qty: next[existingIdx].qty + 1 }
        return next
      }
      return [...prev, { id: crypto.randomUUID(), name: product.name, sku: product.sku, price: product.price, qty: 1, size: selSize }]
    })
  }

  const addByCode = (code: string) => {
    const q = code.trim()
    if (!q) return
    const product = products.find(p => p.sku.toLowerCase() === q.toLowerCase())
    if (product) addToCart(product)
  }

  const addByBarcode = () => {
    addByCode(barcode)
    setBarcode('')
    // refocus for rapid scanning
    barcodeRef.current?.focus()
  }

  const inc = (id: string) => setCart(prev => prev.map(ci => ci.id === id ? { ...ci, qty: ci.qty + 1 } : ci))
  const dec = (id: string) => setCart(prev => prev.map(ci => ci.id === id ? { ...ci, qty: Math.max(1, ci.qty - 1) } : ci))
  const removeItem = (id: string) => setCart(prev => prev.filter(ci => ci.id !== id))
  const clearCart = () => setCart([])

  const holdBill = async () => {
    if (cart.length === 0) return
    try {
      const tempId = (() => {
        const y = new Date().getFullYear()
        const seq = String(Math.floor(Math.random()*100000)).padStart(4,'0')
        return `HLD${y}-${seq}`
      })()
      const payload = {
        outletId: selectedOutletId ? Number(selectedOutletId) : undefined,
        customerName,
        customerMobile,
        discountPct,
        taxRate,
        cart,
        id: tempId,
        createdAt: Date.now(),
        totalAmount: total,
        heldBy: staffId,
      }
      let data: any = null
      try {
        const res = await fetch(`${API_BASE}/sales/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        })
        if (res.ok) data = await res.json()
      } catch {}
      const hb: HeldBill = data && data.id ? {
        id: String(data.id),
        createdAt: data.createdAt || Date.now(),
        customerName,
        customerMobile,
        discountPct,
        taxRate,
        totalAmount: data.totalAmount ?? total,
        heldBy: data.heldBy || staffId,
        cart,
      } : payload
      setHeldBills(prev => [hb, ...prev])
      setAudit(prev => [...prev, { id: crypto.randomUUID(), type: 'HOLD', billId: hb.id, by: staffId, at: Date.now() }])
    } catch (e: any) {
      alert(e?.message || 'Failed to hold bill')
      return
    }
    // clear current working bill
    setCart([])
    setCustomerName('')
    setCustomerMobile('')
    setDiscountPct(0)
    // keep taxRate as a register-level setting
  }

  const resumeBill = async (id: string) => {
    const bill = heldBills.find(b => b.id === id)
    if (!bill) return
    setCart(bill.cart)
    setCustomerName(bill.customerName)
    setCustomerMobile(bill.customerMobile)
    setDiscountPct(bill.discountPct)
    setTaxRate(bill.taxRate)
    try { await fetch(`${API_BASE}/sales/hold/${id}`, { method: 'DELETE' }) } catch {}
    setHeldBills(prev => prev.filter(b => b.id !== id))
    setAudit(prev => [...prev, { id: crypto.randomUUID(), type: 'RESUME', billId: id, by: staffId, at: Date.now() }])
    setTimeout(() => barcodeRef.current?.focus(), 0)
  }

  const removeHeldBill = async (id: string) => {
    try { await fetch(`${API_BASE}/sales/hold/${id}`, { method: 'DELETE' }) } catch {}
    setHeldBills(prev => prev.filter(b => b.id !== id))
    setAudit(prev => [...prev, { id: crypto.randomUUID(), type: 'DELETE', billId: id, by: staffId, at: Date.now() }])
  }

  const formatINR = (n: number) => `₹ ${n.toLocaleString('en-IN')}`

  // Print Exchange receipt (old returns + new issues)
  const printExchangeReceipt = (opts: {
    billId?: string,
    oldItems: { name: string; size?: string; qty: number; price: number }[],
    newItems: { name: string; size?: string; qty: number; price: number }[],
    oldAmt: number,
    newAmt: number,
    diff: number,
  }) => {
    const win = window.open('', '_blank')
    if (!win) return
    const oldLines = opts.oldItems.map(oi => `
      <tr><td>${oi.name}${oi.size? ' ('+oi.size+')':''}</td><td style="text-align:right">${oi.qty}</td><td style="text-align:right">${formatINR(oi.price)}</td><td style="text-align:right">${formatINR(oi.qty*oi.price)}</td></tr>
    `).join('')
    const newLines = opts.newItems.map(ni => `
      <tr><td>${ni.name}${ni.size? ' ('+ni.size+')':''}</td><td style="text-align:right">${ni.qty}</td><td style="text-align:right">${formatINR(ni.price)}</td><td style="text-align:right">${formatINR(ni.qty*ni.price)}</td></tr>
    `).join('')
    win.document.write(`
      <html><head><title>Exchange Sale</title><style>
        body{font-family:Arial,sans-serif;padding:12px}
        h2{margin:0 0 8px 0}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th,td{border-bottom:1px solid #eee;padding:4px}
      </style></head><body>
        <h2>Exchange Sale ${opts.billId?`#${opts.billId}`:''}</h2>
        <div>Customer: ${customerName || 'Walk-in'} ${customerMobile? '('+customerMobile+')':''}</div>
        <div>Date: ${new Date().toLocaleString()}</div>
        <h3>Old Items (Returned)</h3>
        <table><thead><tr><th style="text-align:left">Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${oldLines || '<tr><td colspan="4" style="text-align:center;color:#666">None</td></tr>'}</tbody></table>
        <div style="text-align:right;margin-top:4px"><strong>Old Total:</strong> ${formatINR(opts.oldAmt)}</div>
        <h3 style="margin-top:12px">New Items (Issued)</h3>
        <table><thead><tr><th style="text-align:left">Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${newLines || '<tr><td colspan="4" style="text-align:center;color:#666">None</td></tr>'}</tbody></table>
        <div style="text-align:right;margin-top:4px"><strong>New Total:</strong> ${formatINR(opts.newAmt)}</div>
        <div style="text-align:right;margin-top:6px;font-size:14px"><strong>Difference (Payable):</strong> ${formatINR(opts.diff)}</div>
        <p style="margin-top:10px;font-size:12px">Thank you! (Exchange)</p>
        <script>window.print(); setTimeout(()=>window.close(), 200);</script>
      </body></html>
    `)
    win.document.close()
  }

  const printReceipt = (billId?: string) => {
    const win = window.open('', '_blank')
    if (!win) return
    const lines = cart.map(ci => `
      <tr>
        <td>${ci.name}${ci.size ? ' (' + ci.size + ')' : ''}</td>
        <td style="text-align:right">${ci.qty}</td>
        <td style="text-align:right">${formatINR(ci.price)}</td>
        <td style="text-align:right">${formatINR(ci.qty * ci.price)}</td>
      </tr>
    `).join('')
    win.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body{font-family:Arial, sans-serif; padding:12px}
            h2{margin:0 0 8px 0}
            table{width:100%; border-collapse:collapse}
            th,td{padding:6px; border-bottom:1px solid #eee; font-size:12px}
          </style>
        </head>
        <body>
          <h2>Retail POS Receipt</h2>
          ${billId ? `<div style="font-size:12px; margin-bottom:4px"><strong>Bill ID:</strong> ${billId}</div>` : ''}
          <div style="font-size:12px; margin-bottom:8px">
            <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
            ${customerName ? `<div><strong>Customer:</strong> ${customerName}</div>` : ''}
            ${customerMobile ? `<div><strong>Mobile:</strong> ${customerMobile}</div>` : ''}
            <div><strong>Payment:</strong> ${payMethod.toUpperCase()}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left">Item</th>
                <th style="text-align:right">Qty</th>
                <th style="text-align:right">Price</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>${lines}</tbody>
          </table>
          <div style="margin-top:8px; font-size:12px">
            <div><strong>Subtotal:</strong> ${formatINR(subtotal)}</div>
            <div><strong>Discount (${Math.max(0, Math.min(100, discountPct))}%):</strong> -${formatINR(discountAmt)}</div>
            <div><strong>Taxable:</strong> ${formatINR(taxable)}</div>
            <div><strong>Tax (${Math.max(0, taxRate)}%):</strong> ${formatINR(tax)}</div>
            <div style="font-size:14px"><strong>Grand Total:</strong> ${formatINR(total)}</div>
          </div>
          <p style="margin-top:10px; font-size:12px">Thank you for shopping!</p>
          <script>window.print(); setTimeout(() => window.close(), 200);</script>
        </body>
      </html>
    `)
    win.document.close()
  }

  const reprintReceiptFromLog = (entry: SalesLogEntry) => {
    const win = window.open('', '_blank')
    if (!win) return
    const lines = entry.cart.map(ci => `
      <tr>
        <td>${ci.name}${ci.size ? ' (' + ci.size + ')' : ''}</td>
        <td style="text-align:right">${ci.qty}</td>
        <td style="text-align:right">₹ ${ci.price.toLocaleString('en-IN')}</td>
        <td style="text-align:right">₹ ${(ci.qty * ci.price).toLocaleString('en-IN')}</td>
      </tr>
    `).join('')
    win.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body{font-family:Arial, sans-serif; padding:12px}
            h2{margin:0 0 8px 0}
            table{width:100%; border-collapse:collapse}
            th,td{padding:6px; border-bottom:1px solid #eee; font-size:12px}
          </style>
        </head>
        <body>
          <h2>Retail POS Receipt</h2>
          <div style="font-size:12px; margin-bottom:8px">
            <div><strong>Date:</strong> ${new Date(entry.createdAt).toLocaleString()}</div>
            ${entry.customerName ? `<div><strong>Customer:</strong> ${entry.customerName}</div>` : ''}
            ${entry.customerMobile ? `<div><strong>Mobile:</strong> ${entry.customerMobile}</div>` : ''}
            <div><strong>Payment:</strong> ${entry.payMethod.toUpperCase()}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left">Item</th>
                <th style="text-align:right">Qty</th>
                <th style="text-align:right">Price</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>${lines}</tbody>
          </table>
          <div style="margin-top:8px; font-size:12px">
            <div><strong>Subtotal:</strong> ₹ ${entry.subtotal.toLocaleString('en-IN')}</div>
            <div><strong>Discount (${Math.max(0, Math.min(100, entry.discountPct))}%):</strong> -₹ ${entry.discountAmt.toLocaleString('en-IN')}</div>
            <div><strong>Taxable:</strong> ₹ ${entry.taxable.toLocaleString('en-IN')}</div>
            <div><strong>Tax (${Math.max(0, entry.taxRate)}%):</strong> ₹ ${entry.tax.toLocaleString('en-IN')}</div>
            <div style="font-size:14px"><strong>Grand Total:</strong> ₹ ${entry.total.toLocaleString('en-IN')}</div>
          </div>
          <script>window.print(); setTimeout(() => window.close(), 200);</script>
        </body>
      </html>
    `)
    win.document.close()
  }

  // Per-line discount and tax rules
  const pct = Math.max(0, Math.min(100, discountPct))
  const lineCalcs = cart.map(ci => {
    const unitDisc = ci.price * (pct / 100)
    const discUnit = Math.max(0, ci.price - unitDisc)
    const rate = discUnit < 2500 ? 5 : 18
    const net = discUnit * ci.qty
    const taxAmt = net * (rate / 100)
    return { id: ci.id, net, taxAmt, rate, qty: ci.qty, price: ci.price, discUnit }
  })
  const subtotal = cart.reduce((s, ci) => s + ci.qty * ci.price, 0)
  const discountAmt = cart.reduce((s, ci) => s + (ci.price * (pct / 100)) * ci.qty, 0)
  const taxable = lineCalcs.reduce((s, l) => s + l.net, 0)
  const tax5 = lineCalcs.filter(l => l.rate === 5).reduce((s, l) => s + l.taxAmt, 0)
  const tax18 = lineCalcs.filter(l => l.rate === 18).reduce((s, l) => s + l.taxAmt, 0)
  const tax = tax5 + tax18
  const total = taxable + tax
  const payDue = Math.max(0, total - (Number(payCash||0) + Number(payCard||0) + Number(payUpi||0)))

  return (
    <Shell>
      <PageHeader
        title="POS Register"
        subtitle="Scan, add to cart, and collect payment."
        actions={(
          <div className="flex gap-2">
            {activeTab === 'entry' && (
              <>
                <Button variant="outline" onClick={clearCart}>Clear</Button>
                {/* FIX: Set payCash to empty string initially, let modal handle amounts */}
                <Button variant="warning" onClick={() => { setPaymentOpen(true); setPayCash(''); setPayCard(''); setPayUpi(''); }} disabled={cart.length === 0}>Pay ₹ {total.toLocaleString('en-IN')}</Button>
              </>
            )}
          </div>
        )}
      />

      {/* Exchange Payment Modal - MOVED AND FIXED STRUCTURE */}
      {exchangePayOpen && activeTab === 'exchange' && (() => {
        // FIX: Use ref.current instead of window property
        const st = exchangePayloadRef.current || {}
        const newAmt = Number(st.newAmt || 0)
        const oldAmt = Number(st.oldAmt || 0)
        const diff = Math.max(0, newAmt - oldAmt)
        const paid = Number(exPayCash||0) + Number(exPayCard||0) + Number(exPayUpi||0)
        const due = Math.max(0, diff - paid)
        return (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Collect Payment (Exchange)</h3>
                <button className="text-gray-500" onClick={() => setExchangePayOpen(false)} aria-label="Close">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-gray-600">Amount Due</span><span className="text-base font-semibold">₹ {diff.toLocaleString('en-IN')}</span></div>
                <Input label="Cash" type="number" value={exPayCash} onChange={(e:any)=>setExPayCash(e.target.value)} placeholder="0" />
                <Input label="Card" type="number" value={exPayCard} onChange={(e:any)=>setExPayCard(e.target.value)} placeholder="0" />
                <Input label="UPI" type="number" value={exPayUpi} onChange={(e:any)=>setExPayUpi(e.target.value)} placeholder="0" />
                <div className="flex items-center justify-between text-sm"><span>Paid</span><span>₹ {paid.toLocaleString('en-IN')}</span></div>
                <div className={`flex items-center justify-between text-sm ${due===0?'text-green-700':'text-red-700'}`}><span>Due</span><span>₹ {due.toLocaleString('en-IN')}</span></div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={()=>setExchangePayOpen(false)}>Cancel</Button>
                <Button onClick={async()=>{
                  if (due !== 0) { alert('Paid amounts must equal the due.'); return }
                  const payments: { method:'cash'|'card'|'upi'; amount:number }[] = []
                  const c = Number(exPayCash||0), cd = Number(exPayCard||0), u = Number(exPayUpi||0)
                  if (c>0) payments.push({ method:'cash', amount:c }); if (cd>0) payments.push({ method:'card', amount:cd }); if (u>0) payments.push({ method:'upi', amount:u })
                  const primary = payments[0]?.method || 'cash'
                  const st2 = exchangePayloadRef.current || {} // FIX: Use ref
                  const returns = st2.returns || []
                  const issues = st2.issues || []
                  const oldAmt2 = Number(st2.oldAmt||0)
                  const newAmt2 = Number(st2.newAmt||0)
                  try {
                    // Save exchange first
                    const r1 = await fetch(`${API_BASE}/sales/exchange`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ originalSaleId: st2.oldBill?.id, outletId: selectedOutletId?Number(selectedOutletId):undefined, customerName, customerMobile, reason: exchangeReason, returns, issues }) })
                    if (!r1.ok) throw new Error('Failed to save exchange')
                    const exData = await r1.json().catch(()=>({}))
                    // Persist a sale for issued items with partial payments (difference)
                    if (Array.isArray(issues) && issues.length) {
                      const exLines = issues.map((i:any)=>({ qty:Number(i.qty||0), price:Number(i.price||0) }))
                      const exSubtotal = exLines.reduce((s,l)=>s + l.qty*l.price, 0)
                      // Per-line tax rule with 0% discount
                      let t5 = 0, t18 = 0
                      for (const i of issues) {
                        const unit = Number(i.price||0)
                        const rate = unit < 2500 ? 5 : 18
                        const net = unit * Number(i.qty||0)
                        const taxAmt = net * (rate/100)
                        if (rate === 5) t5 += taxAmt; else t18 += taxAmt
                      }
                      const taxAmt = t5 + t18
                      const totalAmt = exSubtotal + taxAmt
                      try {
                        const r2 = await fetch(`${API_BASE}/sales`, {
                          method:'POST', headers:{'Content-Type':'application/json'},
                          body: JSON.stringify({
                            outletId: selectedOutletId?Number(selectedOutletId):undefined,
                            customerName,
                            customerMobile,
                            payMethod: primary,
                            subtotal: exSubtotal,
                            discountPct: 0,
                            discountAmt: 0,
                            taxable: exSubtotal,
                            taxRate: 0,
                            taxAmt: taxAmt,
                            tax5: t5,
                            tax18: t18,
                            total: totalAmt,
                            cart: issues.map((i:any)=>({ sku:i.sku, name:i.name, qty:i.qty, price:i.price, size:i.size })),
                            payments,
                            acceptPartialPayment: true
                          })
                        })
                        const newSale = r2.ok ? await r2.json() : null
                        try { await fetch(`${API_BASE}/sales/mark-exchanged`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ originalSaleId: st2.oldBill?.id, exchangeId: exData?.id || null, newSaleId: newSale?.id || null, note: 'Exchange with difference' }) }) } catch {}
                      } catch {}
                    }
                    // Print exchange bill
                    printExchangeReceipt({ billId: String(st2.oldBill?.bill_no || st2.oldBill?.id || ''), oldItems: returns.map((r:any)=>({ name:r.name, size:r.size, qty:r.qty, price:r.price })), newItems: issues.map((i:any)=>({ name:i.name, size:i.size, qty:i.qty, price:i.price })), oldAmt: oldAmt2, newAmt: newAmt2, diff })
                    // Log exchange entry
                    setSalesLog(prev => [{ id: crypto.randomUUID(), createdAt: Date.now(), customerName, customerMobile, payMethod: primary, subtotal: 0, discountPct: 0, discountAmt: 0, taxable: 0, taxRate: 0, tax: 0, total: 0, cart: [], billId: String(st2.oldBill?.bill_no || st2.oldBill?.id || ''), isExchange: true, exchangeOldItems: returns.map((r:any)=>({ name:r.name, size:r.size, qty:r.qty, price:r.price })), exchangeNewItems: issues.map((i:any)=>({ name:i.name, size:i.size, qty:i.qty, price:i.price })), exchangeOldAmt: oldAmt2, exchangeNewAmt: newAmt2, exchangeDiff: (newAmt2-oldAmt2) }, ...prev])
                    setExchangePayOpen(false); setExPayCash(''); setExPayCard(''); setExPayUpi('');
                    setOldBill(null); setOldItems([]); setReturnQty({}); setReturnSel({}); setOldBillNo('')
                    setExchangeCart([])
                    exchangePayloadRef.current = null // FIX: Clear ref
                  } catch (e:any) { alert(e?.message || 'Failed to process exchange') }
                }}>Confirm & Print</Button>
              </div>
            </div>
          </div>
        )
      })()}
        
      {scannerOpen && (
        <BarcodeScanner
          onDetected={(text) => { addByCode(text); setScannerOpen(false) }}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* Sales-only Top Tabs */}
      <div className="mb-4 border-b">
        <nav className="-mb-px flex flex-wrap gap-2">
          <button onClick={() => setActiveTab('entry')} className={`px-3 py-2 text-sm border-b-2 ${activeTab==='entry'?'border-teal text-teal':'border-transparent text-gray-600 hover:text-gray-800'}`}>Sales Entry</button>
          <button onClick={() => setActiveTab('hold')} className={`px-3 py-2 text-sm border-b-2 ${activeTab==='hold'?'border-teal text-teal':'border-transparent text-gray-600 hover:text-gray-800'}`}>Hold Sales</button>
          <button onClick={() => setActiveTab('exchange')} className={`px-3 py-2 text-sm border-b-2 ${activeTab==='exchange'?'border-teal text-teal':'border-transparent text-gray-600 hover:text-gray-800'}`}>Item Exchange Sales</button>
          <button onClick={() => setActiveTab('log')} className={`px-3 py-2 text-sm border-b-2 ${activeTab==='log'?'border-teal text-teal':'border-transparent text-gray-600 hover:text-gray-800'}`}>Sales Log</button>
        </nav>
      </div>

      {/* TAB: Sales Entry */}
      {activeTab === 'entry' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Left: Product entry (narrow) */}
          <div className="lg:col-span-1 space-y-4">
            <Card title="Add Items">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-1">
                <div>
                  <Select
                    label="Scan/Enter Barcode (SKU)"
                    value={quickSku}
                    onChange={(e: any) => {
                      const sku = e.target.value
                      setQuickSku(sku)
                      const prod = products.find(p => p.sku === sku)
                      if (prod) {
                        addToCart(prod)
                        setQuickSku('')
                      }
                    }}
                    options={products.map(p => ({ label: `${p.sku} — ${p.name}${p.sizes?.[0] ? ` (Size ${p.sizes[0]})` : ''}`, value: p.sku }))}
                  />
                </div>
                <div>
                  <Input
                    label="Manual Entry (SKU)"
                    placeholder="Scan or type SKU and press Enter"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e: any) => { if (e.key === 'Enter') addByBarcode() }}
                    inputRef={barcodeRef as any}
                  />
                  <div className="mt-1">
                    <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => setScannerOpen(true)}>Scan</Button>
                  </div>
                </div>
              </div>

              {/* Controls row: Reload SKUs */}
              <div className="mt-1 flex items-center justify-end">
                <Button variant="ghost" onClick={() => setReloadTick(t => t + 1)} disabled={skuLoading}>
                  {skuLoading ? 'Reloading…' : 'Reload SKUs'}
                </Button>
              </div>

              {/* search and quick-add list removed as requested */}
            </Card>

            {/* Cart table moved into Bill Summary; hidden here to simplify UI */}
          </div>

          {/* Right: Summary (wider) */}
          <div className="lg:col-span-2 space-y-4">
            <Card title="Bill Summary">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Customer Name" placeholder="e.g., Rahul Verma" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  <Input label="Mobile" placeholder="e.g., 98xxxxxxxx" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Discount %" type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value))} />
                  <div className="pt-5 text-xs text-gray-600">Tax is auto: discounted unit &lt; 2500 → 5%, otherwise 18%</div>
                </div>
                {/* Selected Items inside Bill Summary */}
                <div className="rounded-md border max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Line</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {cart.map(ci => (
                        <tr key={ci.id}>
                          <td className="px-3 py-2">{ci.name}{ci.size?` (${ci.size})`:''}</td>
                          <td className="px-3 py-2 text-right">₹ {ci.price.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-2">
                              <button className="h-6 w-6 rounded border" onClick={() => dec(ci.id)}>-</button>
                              <span>{ci.qty}</span>
                              <button className="h-6 w-6 rounded border" onClick={() => inc(ci.id)}>+</button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">₹ {(ci.qty*ci.price).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right"><button className="text-xs text-red-600" onClick={() => removeItem(ci.id)}>Remove</button></td>
                        </tr>
                      ))}
                      {cart.length===0 && (
                        <tr><td className="px-3 py-3 text-center text-gray-500" colSpan={5}>No items selected</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span className="text-gray-600">Subtotal</span><span>₹ {subtotal.toLocaleString('en-IN')}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">Discount ({Math.max(0, Math.min(100, discountPct))}%)</span><span>-₹ {discountAmt.toLocaleString('en-IN')}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">Taxable</span><span>₹ {taxable.toLocaleString('en-IN')}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-600">Tax</span><span>₹ {tax.toLocaleString('en-IN')}</span></div>
                  <div className="text-xs text-gray-600">Tax Summary: 5% = ₹ {tax5.toLocaleString('en-IN')}, 18% = ₹ {tax18.toLocaleString('en-IN')}</div>
                  <div className="border-t pt-2 flex items-center justify-between text-base font-semibold"><span>Total</span><span>₹ {total.toLocaleString('en-IN')}</span></div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={holdBill} disabled={cart.length === 0}>Hold Bill</Button>
                <Button onClick={() => { setPaymentOpen(true); setPayCash(String(total)); setPayCard(''); setPayUpi(''); }} disabled={cart.length === 0 || !customerName.trim() || !customerMobile.trim()}>Proceed to Pay</Button>
              </div>
            </Card>

            <Card title="Shortcuts">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline">Refund</Button>
                <Button variant="outline">Daily Report</Button>
                <Button variant="outline">Add Customer</Button>
                <Button variant="outline">Apply Discount</Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB: Hold Sales */}
      {activeTab === 'hold' && (
        <div className="grid grid-cols-1 gap-4">
          <Card title="Held Bills">
            {heldBills.filter(b => (Date.now()-b.createdAt) < 48*3600*1000).length === 0 ? (
              <div className="text-sm text-gray-500">No held bills</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Hold Bill ID</th>
                      <th className="px-3 py-2 text-left">Customer</th>
                      <th className="px-3 py-2 text-left">Date & Time</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-left">Held By</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {heldBills
                      .filter(b => (Date.now()-b.createdAt) < 48*3600*1000)
                      .map(b => (
                        <tr key={b.id}>
                          <td className="px-3 py-2">{b.id}</td>
                          <td className="px-3 py-2">{b.customerName || 'Walk-in'}{b.customerMobile?` (${b.customerMobile})`:''}</td>
                          <td className="px-3 py-2">{new Date(b.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">₹ {(b.totalAmount ?? b.cart.reduce((s, ci) => s + ci.qty * ci.price, 0)).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2">{b.heldBy || staffId}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" onClick={() => { resumeBill(b.id); setActiveTab('entry') }}>Resume</Button>
                              <button className="text-xs text-red-600" onClick={() => { if(confirm('Delete held bill?')) removeHeldBill(b.id) }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title="Audit Trail">
            {audit.length===0 ? (
              <div className="text-sm text-gray-500">No audit records</div>
            ) : (
              <div className="max-h-48 overflow-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left">Time</th>
                      <th className="px-2 py-1 text-left">Action</th>
                      <th className="px-2 py-1 text-left">Bill ID</th>
                      <th className="px-2 py-1 text-left">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {audit.slice().reverse().map(a => (
                      <tr key={a.id}>
                        <td className="px-2 py-1">{new Date(a.at).toLocaleString()}</td>
                        <td className="px-2 py-1">{a.type}</td>
                        <td className="px-2 py-1">{a.billId}</td>
                        <td className="px-2 py-1">{a.by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB: Item Exchange Sales */}
      {activeTab === 'exchange' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card title="Find Original Bill">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input label="Invoice / Bill No" placeholder="e.g., B171234567890" value={oldBillNo} onChange={(e)=>setOldBillNo(e.target.value)} />
                <div className="md:col-span-1 flex items-end">
                  <Button onClick={async()=>{
                    const q = oldBillNo.trim(); if(!q) { alert('Enter Bill No'); return }
                    try {
                      const ms = await fetch(`${API_BASE}/sales/by-bill?billNo=${encodeURIComponent(q)}`)
                      if (!ms.ok) { alert('Bill not found'); return }
                      const master = await ms.json()
                      // Same store validation
                      if (selectedOutletId && master.outlet_id && Number(selectedOutletId) !== Number(master.outlet_id)) {
                        alert('Exchange must be done in the same store as the original purchase.');
                        return
                      }
                      // Exchange period validation: 30 days
                      const billTs = master.bill_date ? new Date(master.bill_date).getTime() : (master.created_at ? new Date(master.created_at).getTime() : 0)
                      const days = (Date.now() - billTs) / (24*3600*1000)
                      if (billTs && days > 30) {
                        alert('Exchange window expired (over 30 days from bill date).');
                        return
                      }
                      const its = await fetch(`${API_BASE}/sales/${master.id}/items`)
                      const items = its.ok ? await its.json() : []
                      const mapped = items.map((m:any)=>({ id: String(m.id||crypto.randomUUID()), sku: m.sku, name: m.name, qty: Number(m.qty||0), price: Number(m.price||0), size: m.size || undefined }))
                      setOldBill(master)
                      setOldItems(mapped)
                      const qmap: Record<string, number> = {}; const smap: Record<string, boolean> = {}
                      for (const x of mapped) { qmap[x.id] = 0; smap[x.id] = false }
                      setReturnQty(qmap); setReturnSel(smap)
                    } catch (e:any) { alert(e?.message || 'Failed to fetch bill') }
                  }}>Validate</Button>
                </div>
              </div>
              {oldBill && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2">Select</th>
                        <th className="px-3 py-2 text-left">Product</th>
                        <th className="px-3 py-2 text-left">SKU</th>
                        <th className="px-3 py-2 text-center">Total Qty</th>
                        <th className="px-3 py-2 text-center">Qty to Return</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {oldItems.map(oi => {
                        const rq = Math.max(0, Math.min(oi.qty, Number(returnQty[oi.id]||0)))
                        const checked = !!returnSel[oi.id]
                        return (
                          <tr key={oi.id}>
                            <td className="px-3 py-2 text-center"><input type="checkbox" checked={checked} onChange={(e)=> setReturnSel(prev=>({ ...prev, [oi.id]: e.target.checked }))} /></td>
                            <td className="px-3 py-2">{oi.name}{oi.size?` (${oi.size})`:''}</td>
                            <td className="px-3 py-2">{oi.sku}</td>
                            <td className="px-3 py-2 text-center">{oi.qty}</td>
                            <td className="px-3 py-2 text-center"><input className="w-20 rounded border px-2 py-1 text-right" type="number" min={0} max={oi.qty} value={rq} onChange={(e)=> setReturnQty(prev=>({ ...prev, [oi.id]: Number(e.target.value) }))} /></td>
                            <td className="px-3 py-2 text-right">₹ {oi.price.toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2 text-right">₹ {(rq*oi.price).toLocaleString('en-IN')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <Card title="Exchange Details">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="md:col-span-1">
                  <label className="block text-xs text-gray-600 mb-1">Reason of Exchange</label>
                  <select className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" value={exchangeReason} onChange={(e) => setExchangeReason(e.target.value)}>
                    {exchangeReasons.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <Input label="Scan/Enter Barcode (SKU)" placeholder="e.g. SH-1001" value={exchangeBarcode} onChange={(e) => setExchangeBarcode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { const p = products.find(pp => pp.sku.toLowerCase() === exchangeBarcode.trim().toLowerCase()); if (p) setExchangeCart(prev => [...prev, { id: crypto.randomUUID(), name: p.name, sku: p.sku, price: p.price, qty: 1 }]); setExchangeBarcode('') } }} />
                <Input label="Search Product" placeholder="Type name or SKU" value={exchangeQuery} onChange={(e) => setExchangeQuery(e.target.value)} />
              </div>

              {exchangeQuery.trim() && (
                <div className="mt-3 max-h-48 overflow-auto rounded-md border">
                  <ul className="divide-y">
                    {products.filter(p => p.name.toLowerCase().includes(exchangeQuery.trim().toLowerCase()) || p.sku.toLowerCase().includes(exchangeQuery.trim().toLowerCase())).map(p => (
                      <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <div className="font-medium text-gray-800">{p.name}</div>
                          <div className="text-gray-500">{p.sku} • Price ₹ {p.price}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" onClick={() => setExchangeCart(prev => [...prev, { id: crypto.randomUUID(), name: p.name, sku: p.sku, price: p.price, qty: 1 }])}>Add</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
            <Card title="Exchange Cart">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {exchangeCart.map(ci => (
                      <tr key={ci.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{ci.name}</td>
                        <td className="px-3 py-2">{ci.sku}</td>
                        <td className="px-3 py-2 text-right">₹ {ci.price.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <button className="h-7 w-7 rounded border" onClick={() => setExchangeCart(prev => prev.map(x => x.id===ci.id?{...x, qty: Math.max(1, x.qty-1)}:x))}>-</button>
                            <span>{ci.qty}</span>
                            <button className="h-7 w-7 rounded border" onClick={() => setExchangeCart(prev => prev.map(x => x.id===ci.id?{...x, qty: x.qty+1}:x))}>+</button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">₹ {(ci.qty * ci.price).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 text-right">
                          <button className="text-red-600 text-xs" onClick={() => setExchangeCart(prev => prev.filter(x => x.id !== ci.id))}>Remove</button>
                        </td>
                      </tr>
                    ))}
                    {exchangeCart.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-gray-500">No items added</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Summary">
              {(() => {
                const newTotal = exchangeCart.reduce((s, ci) => s + ci.qty * ci.price, 0)
                const oldTotal = oldItems.reduce((s, oi) => s + (returnSel[oi.id] ? Math.max(0, Math.min(oi.qty, Number(returnQty[oi.id]||0))) * oi.price : 0), 0)
                const diff = Math.max(0, newTotal - oldTotal)
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="text-gray-600">New Total</span><span>₹ {newTotal.toLocaleString('en-IN')}</span></div>
                    <div className="flex items-center justify-between"><span className="text-gray-600">Old Total</span><span>₹ {oldTotal.toLocaleString('en-IN')}</span></div>
                    <div className="flex items-center justify-between"><span className="text-gray-600">Difference</span><span>₹ {diff.toLocaleString('en-IN')}</span></div>
                  </div>
                )
              })()}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => setExchangeCart([])} disabled={exchangeCart.length===0 && oldItems.length===0}>Clear</Button>
                <Button onClick={() => {
                  if (!oldBill || oldItems.length===0) { alert('Validate old bill first'); return }
                  const selectedReturns = oldItems
                    .map(oi => ({ ...oi, qty: Math.max(0, Math.min(oi.qty, Number(returnQty[oi.id]||0))), selected: !!returnSel[oi.id] }))
                    .filter(x => x.selected && x.qty>0)
                    .map(x => ({ sku: x.sku, name: x.name, size: x.size, qty: x.qty, price: x.price }))
                  if (selectedReturns.length===0) { alert('Select at least one return item with quantity'); return }
                  const issues = exchangeCart.map(ci => ({ sku: ci.sku, name: ci.name, size: ci.size, qty: ci.qty, price: ci.price }))
                  const newAmt = issues.reduce((s,i)=>s+i.qty*i.price,0)
                  const oldAmt = selectedReturns.reduce((s,i)=>s+i.qty*i.price,0)
                  if (newAmt < oldAmt) { alert('Exchange must be same or higher price'); return }
                  const diff = newAmt - oldAmt
                  if (diff <= 0) { alert('No difference to collect'); return }
                  setExPayCash(String(diff)); setExPayCard(''); setExPayUpi('');
                  setExchangePayOpen(true)
                  exchangePayloadRef.current = { oldBill, returns: selectedReturns, issues, newAmt, oldAmt: oldAmt } // FIX: Use ref
                }}>Collect Difference</Button>
                <Button variant="outline" onClick={async () => {
                  if (!oldBill) { alert('Validate old bill first'); return }
                  try { await fetch(`${API_BASE}/sales/mark-exchanged`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ originalSaleId: oldBill.id, note: 'Marked manually from Exchange tab' }) }) } catch {}
                  alert('Old bill marked')
                }}>Update old bill</Button>
              </div>
              <div className="mt-2">
                <Button className="w-full" onClick={async () => {
                  if (!oldBill || oldItems.length===0) { alert('Validate old bill first'); return }
                  const returns = oldItems
                    .map(oi => ({ ...oi, qty: Math.max(0, Math.min(oi.qty, Number(returnQty[oi.id]||0))), selected: !!returnSel[oi.id] }))
                    .filter(x => x.selected && x.qty>0)
                    .map(x => ({ sku: x.sku, name: x.name, size: x.size, qty: x.qty, price: x.price }))
                  if (returns.length===0) { alert('Select at least one return item with quantity'); return }
                  const issues = exchangeCart.map(ci => ({ sku: ci.sku, name: ci.name, size: ci.size, qty: ci.qty, price: ci.price }))
                  const newAmt = issues.reduce((s,i)=>s+i.qty*i.price,0)
                  const oldAmt = returns.reduce((s,i)=>s+i.qty*i.price,0)
                  if (newAmt !== oldAmt) { alert('For Print/Generate without payment, make totals equal or use Collect Difference'); return }
                  try {
                    const r1 = await fetch(`${API_BASE}/sales/exchange`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ originalSaleId: oldBill.id, outletId: selectedOutletId?Number(selectedOutletId):undefined, customerName, customerMobile, reason: exchangeReason, returns, issues }) })
                    const exData = r1.ok ? await r1.json() : null
                    try { await fetch(`${API_BASE}/sales/mark-exchanged`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ originalSaleId: oldBill.id, exchangeId: exData?.id || null, note: 'Equal total exchange' }) }) } catch {}
                    setSalesLog(prev => [{ id: crypto.randomUUID(), createdAt: Date.now(), customerName, customerMobile, payMethod: 'cash', subtotal: 0, discountPct: 0, discountAmt: 0, taxable: 0, taxRate: 0, tax: 0, total: 0, cart: [], billId: String(oldBill.bill_no || oldBill.id), isExchange: true, exchangeOldItems: returns.map(r=>({ name:r.name, size:r.size, qty:r.qty, price:r.price })), exchangeNewItems: issues.map(i=>({ name:i.name, size:i.size, qty:i.qty, price:i.price })), exchangeOldAmt: oldAmt, exchangeNewAmt: newAmt, exchangeDiff: 0 }, ...prev])
                    printExchangeReceipt({ billId: String(oldBill.bill_no || oldBill.id), oldItems: returns.map(r=>({ name:r.name, size:r.size, qty:r.qty, price:r.price })), newItems: issues.map(i=>({ name:i.name, size:i.size, qty:i.qty, price:i.price })), oldAmt, newAmt, diff: 0 })
                    setOldBill(null); setOldItems([]); setReturnQty({}); setReturnSel({}); setOldBillNo(''); setExchangeCart([])
                  } catch (e:any) { alert(e?.message || 'Failed to print exchange') }
                }}>Print / Generate Bill</Button>
                <div className="mt-2">
                  <Button className="w-full" variant="warning" onClick={() => {
                    if (!oldBill) { alert('Validate old bill first'); return }
                    const issues = exchangeCart.map(ci => ({ sku: ci.sku, name: ci.name, size: ci.size, qty: ci.qty, price: ci.price }))
                    if (issues.length === 0) { alert('Add at least one new item'); return }
                    const newAmt = issues.reduce((s,i)=>s+i.qty*i.price,0)
                    // New-items-only exchange: returns empty, oldAmt = 0
                    setExPayCash(String(newAmt)); setExPayCard(''); setExPayUpi('')
                    setExchangePayOpen(true)
                    exchangePayloadRef.current = { oldBill, returns: [], issues, newAmt, oldAmt: 0 } // FIX: Use ref
                  }}>Generate Bill (New Items Only)</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB: Sales Log */}
      {activeTab === 'log' && (
        <div className="grid grid-cols-1 gap-4">
          <Card title="Sales Log (with Reprint)">
            {salesLog.length === 0 ? (
              <div className="text-sm text-gray-500">No sales recorded yet</div>
            ) : (
              <ul className="divide-y">
                {salesLog.map(entry => (
                  <li key={entry.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="font-medium text-gray-800">{entry.customerName || 'Walk-in'} • {new Date(entry.createdAt).toLocaleString()}</div>
                      {entry.billId && <div className="text-gray-500">Bill ID: {entry.billId}</div>}
                      {!entry.isExchange && (
                        <div className="text-gray-500">Items: {entry.cart.reduce((s, ci) => s + ci.qty, 0)} • Total: ₹ {entry.total.toLocaleString('en-IN')} • {entry.payMethod.toUpperCase()}</div>
                      )}
                      {entry.isExchange && (
                        <div className="text-gray-500">Exchange • Old: ₹ {(entry.exchangeOldAmt||0).toLocaleString('en-IN')} • New: ₹ {(entry.exchangeNewAmt||0).toLocaleString('en-IN')} • Diff: ₹ {(entry.exchangeDiff||0).toLocaleString('en-IN')}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!entry.isExchange && <Button variant="outline" onClick={() => reprintReceiptFromLog(entry)}>Reprint Invoice</Button>}
                      {entry.isExchange && <Button variant="outline" onClick={() => reprintExchangeFromLog(entry)}>Reprint Exchange</Button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* Payment modal only for Sales Entry */}
      {paymentOpen && activeTab === 'entry' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Collect Payment</h3>
              <button className="text-gray-500" onClick={() => setPaymentOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-600">Amount Due</span><span className="text-base font-semibold">₹ {total.toLocaleString('en-IN')}</span></div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setPayMethod('cash')} className={`rounded border px-3 py-2 ${payMethod==='cash'?'border-teal text-teal':'border-gray-300'}`}>Cash</button>
                <button onClick={() => setPayMethod('card')} className={`rounded border px-3 py-2 ${payMethod==='card'?'border-teal text-teal':'border-gray-300'}`}>Card</button>
                <button onClick={() => setPayMethod('upi')} className={`rounded border px-3 py-2 ${payMethod==='upi'?'border-teal text-teal':'border-gray-300'}`}>UPI</button>
              </div>
              <Input label="Notes (optional)" placeholder="e.g., Customer mobile, last 4 digits, etc." />
              <Button className="w-full" onClick={async () => { 
                try {
                  const res = await fetch(`${API_BASE}/sales`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      outletId: selectedOutletId ? Number(selectedOutletId) : undefined,
                      customerName,
                      customerMobile,
                      payMethod,
                      subtotal,
                      discountPct,
                      discountAmt,
                      taxable,
                      taxRate,
                      taxAmt: tax,
                      total,
                      cart,
                    }),
                  })
                  if (!res.ok) throw new Error('Failed to create sale')
                  const data = await res.json()
                  const billId = data.billNo || String(data.id)
                  setCurrentBillId(billId)
                  printReceipt(billId)
                  // Refresh sales log from backend
                  try {
                    const list = await fetch(`${API_BASE}/sales`)
                    if (list.ok) {
                      const sales = await list.json()
                      const out: SalesLogEntry[] = []
                      for (const s of sales) {
                        let items: any[] = []
                        try { const ir = await fetch(`${API_BASE}/sales/${s.id}/items`); if (ir.ok) items = await ir.json() } catch {}
                        out.push({
                          id: String(s.id),
                          createdAt: s.bill_date ? new Date(s.bill_date).getTime() : (s.created_at ? new Date(s.created_at).getTime() : Date.now()),
                          customerName: s.customer_name || '',
                          customerMobile: s.customer_mobile || '',
                          payMethod: (s.pay_method === 'cash' || s.pay_method === 'card' || s.pay_method === 'upi') ? s.pay_method : 'cash',
                          subtotal: Number(s.subtotal || 0),
                          discountPct: Number(s.discount_pct || 0),
                          discountAmt: Number(s.discount_amt || 0),
                          taxable: Number(s.taxable || 0),
                          taxRate: Number(s.tax_rate || 0),
                          tax: Number(s.tax_amt || 0),
                          total: Number(s.total || 0),
                          cart: items.map(m => ({ id: crypto.randomUUID(), name: m.name, sku: m.sku, price: Number(m.price), qty: Number(m.qty), size: m.size || undefined })),
                          billId: s.bill_no || String(s.id),
                        })
                      }
                      setSalesLog(out)
                    }
                  } catch {}
                  clearCart()
                  setPaymentOpen(false)
                  setTimeout(() => barcodeRef.current?.focus(), 0)
                } catch (e: any) {
                  alert(e?.message || 'Payment failed')
                }
              }}>Complete Payment</Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}