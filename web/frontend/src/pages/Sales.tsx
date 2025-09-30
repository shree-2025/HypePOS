import React from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'

export default function Sales() {
  type Product = { id: string; name: string; sku: string; mrp: number; price: number; sizes?: string[] }
  type CartItem = { id: string; name: string; sku: string; price: number; qty: number; size?: string }
  type HeldBill = {
    id: string
    createdAt: number
    customerName: string
    customerMobile: string
    discountPct: number
    taxRate: number
    cart: CartItem[]
  }

  const products: Product[] = [
    { id: 'p1', name: 'Runner Pro', sku: 'SH-1001', mrp: 2499, price: 1999, sizes: ['UK 6','UK 7','UK 8','UK 9'] },
    { id: 'p2', name: 'Urban Walk', sku: 'SH-1204', mrp: 2799, price: 2199, sizes: ['UK 7','UK 8','UK 9'] },
    { id: 'p3', name: 'Classic Leather', sku: 'SH-1302', mrp: 4999, price: 3999, sizes: ['UK 8','UK 9','UK 10'] },
  ]

  const [barcode, setBarcode] = React.useState('')
  const barcodeRef = React.useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = React.useState('')
  const [size, setSize] = React.useState<string>('')
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [paymentOpen, setPaymentOpen] = React.useState(false)
  const [payMethod, setPayMethod] = React.useState<'cash'|'card'|'upi'>('cash')
  const [customerName, setCustomerName] = React.useState('')
  const [customerMobile, setCustomerMobile] = React.useState('')
  const [discountPct, setDiscountPct] = React.useState<number>(0)
  const [taxRate, setTaxRate] = React.useState<number>(0)
  const [heldBills, setHeldBills] = React.useState<HeldBill[]>([])

  React.useEffect(() => {
    // autofocus barcode on mount
    barcodeRef.current?.focus()
    // restore from localStorage
    try {
      const savedCart = localStorage.getItem('pos_cart')
      const savedCustomer = localStorage.getItem('pos_customer')
      const savedSettings = localStorage.getItem('pos_settings')
      const savedHeld = localStorage.getItem('pos_held_bills')
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
    } catch {}
  }, [])

  React.useEffect(() => {
    try { localStorage.setItem('pos_cart', JSON.stringify(cart)) } catch {}
  }, [cart])
  React.useEffect(() => {
    try { localStorage.setItem('pos_customer', JSON.stringify({ name: customerName, mobile: customerMobile })) } catch {}
  }, [customerName, customerMobile])
  React.useEffect(() => {
    try { localStorage.setItem('pos_settings', JSON.stringify({ discountPct, taxRate, payMethod })) } catch {}
  }, [discountPct, taxRate, payMethod])
  React.useEffect(() => {
    try { localStorage.setItem('pos_held_bills', JSON.stringify(heldBills)) } catch {}
  }, [heldBills])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as Product[]
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
  }, [query])

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

  const addByBarcode = () => {
    const code = barcode.trim()
    if (!code) return
    const product = products.find(p => p.sku.toLowerCase() === code.toLowerCase())
    if (product) addToCart(product)
    setBarcode('')
    // refocus for rapid scanning
    barcodeRef.current?.focus()
  }

  const inc = (id: string) => setCart(prev => prev.map(ci => ci.id === id ? { ...ci, qty: ci.qty + 1 } : ci))
  const dec = (id: string) => setCart(prev => prev.map(ci => ci.id === id ? { ...ci, qty: Math.max(1, ci.qty - 1) } : ci))
  const removeItem = (id: string) => setCart(prev => prev.filter(ci => ci.id !== id))
  const clearCart = () => setCart([])

  const holdBill = () => {
    if (cart.length === 0) return
    const bill: HeldBill = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      customerName,
      customerMobile,
      discountPct,
      taxRate,
      cart: cart,
    }
    setHeldBills(prev => [bill, ...prev])
    // clear current working bill
    setCart([])
    setCustomerName('')
    setCustomerMobile('')
    setDiscountPct(0)
    // keep taxRate as a register-level setting
  }

  const resumeBill = (id: string) => {
    const bill = heldBills.find(b => b.id === id)
    if (!bill) return
    setCart(bill.cart)
    setCustomerName(bill.customerName)
    setCustomerMobile(bill.customerMobile)
    setDiscountPct(bill.discountPct)
    setTaxRate(bill.taxRate)
    setHeldBills(prev => prev.filter(b => b.id !== id))
    setTimeout(() => barcodeRef.current?.focus(), 0)
  }

  const removeHeldBill = (id: string) => setHeldBills(prev => prev.filter(b => b.id !== id))

  const formatINR = (n: number) => `₹ ${n.toLocaleString('en-IN')}`

  const printReceipt = () => {
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

  const subtotal = cart.reduce((s, ci) => s + ci.qty * ci.price, 0)
  const discountAmt = Math.max(0, Math.min(100, discountPct)) / 100 * subtotal
  const taxable = Math.max(0, subtotal - discountAmt)
  const tax = Math.max(0, taxRate) / 100 * taxable
  const total = taxable + tax

  return (
    <Shell>
      <PageHeader
        title="POS Register"
        subtitle="Scan, add to cart, and collect payment."
        actions={(
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearCart}>Clear</Button>
            <Button variant="warning" onClick={() => setPaymentOpen(true)} disabled={cart.length === 0}>Pay ₹ {total.toLocaleString('en-IN')}</Button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Product entry */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="Add Items">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                label="Scan/Enter Barcode (SKU)"
                placeholder="e.g. SH-1001"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addByBarcode() }}
                inputRef={barcodeRef}
                rightIcon={<button onClick={addByBarcode} title="Add by barcode"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M19 13H5v-2h14v2Z"/></svg></button>}
              />
              <Input
                label="Search Product"
                placeholder="Type name or SKU"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-end">
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                >
                  <option value="">Select Size (optional)</option>
                  {Array.from(new Set(products.flatMap(p => p.sizes ?? []))).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {filtered.length > 0 && (
              <div className="mt-3 max-h-48 overflow-auto rounded-md border">
                <ul className="divide-y">
                  {filtered.map(p => (
                    <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium text-gray-800">{p.name}</div>
                        <div className="text-gray-500">{p.sku} • MRP ₹ {p.mrp} • Price ₹ {p.price}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.sizes && p.sizes.length > 0 && <span className="text-xs text-gray-500">Size: {size || '—'}</span>}
                        <Button variant="outline" onClick={() => addToCart(p, size || undefined)}>Add</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card title="Cart">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Line Total</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                  {cart.map(ci => (
                    <tr key={ci.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{ci.name}</td>
                      <td className="px-3 py-2">{ci.sku}</td>
                      <td className="px-3 py-2">{ci.size || '—'}</td>
                      <td className="px-3 py-2 text-right">₹ {ci.price.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button className="h-7 w-7 rounded border" onClick={() => dec(ci.id)}>-</button>
                          <span>{ci.qty}</span>
                          <button className="h-7 w-7 rounded border" onClick={() => inc(ci.id)}>+</button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">₹ {(ci.qty * ci.price).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-right">
                        <button className="text-red-600 text-xs" onClick={() => removeItem(ci.id)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-gray-500">No items added</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <Card title="Bill Summary">
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Input label="Customer Name" placeholder="e.g., Rahul Verma" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                <Input label="Mobile" placeholder="e.g., 98xxxxxxxx" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Discount %" type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value))} />
                <Input label="Tax %" type="number" min={0} max={50} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-gray-600">Subtotal</span><span>₹ {subtotal.toLocaleString('en-IN')}</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-600">Discount ({Math.max(0, Math.min(100, discountPct))}%)</span><span>-₹ {discountAmt.toLocaleString('en-IN')}</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-600">Taxable</span><span>₹ {taxable.toLocaleString('en-IN')}</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-600">Tax ({Math.max(0, taxRate)}%)</span><span>₹ {tax.toLocaleString('en-IN')}</span></div>
                <div className="border-t pt-2 flex items-center justify-between text-base font-semibold"><span>Total</span><span>₹ {total.toLocaleString('en-IN')}</span></div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={holdBill} disabled={cart.length === 0}>Hold Bill</Button>
              <Button onClick={() => setPaymentOpen(true)} disabled={cart.length === 0}>Proceed to Pay</Button>
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

      {/* Payment modal */}
      {paymentOpen && (
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
              <Button className="w-full" onClick={() => { printReceipt(); clearCart(); setPaymentOpen(false); setTimeout(() => barcodeRef.current?.focus(), 0) }}>Complete Payment</Button>
            </div>
          </div>
        </div>
      )}

      {/* Held Bills drawer/list */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-start-3">
          <Card title="Held Bills">
            {heldBills.length === 0 ? (
              <div className="text-sm text-gray-500">No held bills</div>
            ) : (
              <ul className="divide-y">
                {heldBills.map(b => (
                  <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="font-medium text-gray-800">{b.customerName || 'Walk-in'} • {new Date(b.createdAt).toLocaleTimeString()}</div>
                      <div className="text-gray-500">Items: {b.cart.reduce((s, ci) => s + ci.qty, 0)} • Total approx: ₹ {b.cart.reduce((s, ci) => s + ci.qty * ci.price, 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => resumeBill(b.id)}>Resume</Button>
                      <button className="text-xs text-red-600" onClick={() => removeHeldBill(b.id)}>Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </Shell>
  )
}
