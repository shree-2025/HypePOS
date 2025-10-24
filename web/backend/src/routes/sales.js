import express from 'express'
import { pool, query } from '../db.js'

const router = express.Router()

async function ensureTables() {
  // sales_master & sales_items
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS sales_master (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      bill_no VARCHAR(32) UNIQUE,
      bill_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      outlet_id INT UNSIGNED NULL,
      employee_id BIGINT UNSIGNED NULL,
      customer_name VARCHAR(150) NULL,
      customer_mobile VARCHAR(20) NULL,
      pay_method ENUM('cash','card','upi') NOT NULL DEFAULT 'cash',
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      discount_amt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      taxable DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      tax_amt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_date (bill_date),
      INDEX idx_outlet (outlet_id),
      INDEX idx_employee (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
  // Ensure employee_id exists for older databases
  try { await pool.execute(`ALTER TABLE sales_master ADD COLUMN IF NOT EXISTS employee_id BIGINT UNSIGNED NULL`) } catch {}
  try { await pool.execute(`CREATE INDEX IF NOT EXISTS idx_employee ON sales_master(employee_id)`) } catch {}

  // QC bin stock per outlet for returns pending QC
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS outlet_stock_qc (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      outlet_id INT UNSIGNED NOT NULL,
      item_id INT UNSIGNED NOT NULL,
      qty INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_qc_outlet_item (outlet_id, item_id),
      INDEX idx_qc_outlet (outlet_id),
      INDEX idx_qc_item (item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // links between original sale, exchange record and new sale
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS exchange_links (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      original_sale_id BIGINT UNSIGNED NOT NULL,
      exchange_id BIGINT UNSIGNED NULL,
      new_sale_id BIGINT UNSIGNED NULL,
      note VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_original (original_sale_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // payments for multi-method settlements
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS sales_payments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sale_id BIGINT UNSIGNED NOT NULL,
      method ENUM('cash','card','upi') NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      ref VARCHAR(100) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_sale (sale_id),
      CONSTRAINT fk_sales_payments_master FOREIGN KEY (sale_id) REFERENCES sales_master(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS sales_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sale_id BIGINT UNSIGNED NOT NULL,
      item_id INT UNSIGNED NULL,
      sku VARCHAR(100) NOT NULL,
      item_name VARCHAR(190) NOT NULL,
      size VARCHAR(50) NULL,
      qty INT NOT NULL,
      price DECIMAL(12,2) NOT NULL,
      line_total DECIMAL(12,2) NOT NULL,
      brand VARCHAR(100) NULL,
      category VARCHAR(100) NULL,
      colour VARCHAR(100) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_sale (sale_id),
      CONSTRAINT fk_sales_items_master FOREIGN KEY (sale_id) REFERENCES sales_master(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // hold_master & hold_items
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS hold_master (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      token VARCHAR(64) UNIQUE,
      hold_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      outlet_id INT UNSIGNED NULL,
      customer_name VARCHAR(150) NULL,
      customer_mobile VARCHAR(20) NULL,
      discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_hold_date (hold_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS hold_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      hold_id BIGINT UNSIGNED NOT NULL,
      item_id INT UNSIGNED NULL,
      sku VARCHAR(100) NOT NULL,
      item_name VARCHAR(190) NOT NULL,
      size VARCHAR(50) NULL,
      qty INT NOT NULL,
      price DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_hold (hold_id),
      CONSTRAINT fk_hold_items_master FOREIGN KEY (hold_id) REFERENCES hold_master(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // exchange tables (skeleton)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS exchange_master (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      exchange_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      outlet_id INT UNSIGNED NULL,
      customer_name VARCHAR(150) NULL,
      customer_mobile VARCHAR(20) NULL,
      reason VARCHAR(150) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_exchange_date (exchange_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS exchange_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      exchange_id BIGINT UNSIGNED NOT NULL,
      direction ENUM('return','issue') NOT NULL,
      item_id INT UNSIGNED NULL,
      sku VARCHAR(100) NOT NULL,
      item_name VARCHAR(190) NOT NULL,
      size VARCHAR(50) NULL,
      qty INT NOT NULL,
      price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_exchange (exchange_id),
      CONSTRAINT fk_exchange_items_master FOREIGN KEY (exchange_id) REFERENCES exchange_master(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // billing_master & billing_items (canonical store for completed bills)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS billing_master (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      bill_no VARCHAR(32) UNIQUE,
      bill_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      outlet_id INT UNSIGNED NULL,
      customer_name VARCHAR(150) NULL,
      customer_mobile VARCHAR(20) NULL,
      pay_method ENUM('cash','card','upi') NOT NULL DEFAULT 'cash',
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      discount_amt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      taxable DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      tax_amt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_billing_date (bill_date),
      INDEX idx_billing_outlet (outlet_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS billing_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      billing_id BIGINT UNSIGNED NOT NULL,
      item_id INT UNSIGNED NULL,
      sku VARCHAR(100) NOT NULL,
      item_name VARCHAR(190) NOT NULL,
      size VARCHAR(50) NULL,
      qty INT NOT NULL,
      price DECIMAL(12,2) NOT NULL,
      line_total DECIMAL(12,2) NOT NULL,
      brand VARCHAR(100) NULL,
      category VARCHAR(100) NULL,
      colour VARCHAR(100) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_billing (billing_id),
      CONSTRAINT fk_billing_items_master FOREIGN KEY (billing_id) REFERENCES billing_master(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
}

router.use(async (_req, _res, next) => { try { await ensureTables() } catch {} next() })

// Mark original sale as exchanged / link references
router.post('/mark-exchanged', async (req, res) => {
  try {
    const { originalSaleId, exchangeId = null, newSaleId = null, note = null } = req.body || {}
    if (!originalSaleId) return res.status(400).json({ message: 'originalSaleId required' })
    await pool.execute(`
      INSERT INTO exchange_links (original_sale_id, exchange_id, new_sale_id, note)
      VALUES (:originalSaleId, :exchangeId, :newSaleId, :note)
    `, { originalSaleId, exchangeId, newSaleId, note })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: e?.sqlMessage || e?.message || 'Server error' })
  }
})

// FIND SALE BY BILL NO
router.get('/by-bill', async (req, res) => {
  try {
    const billNo = String(req.query.billNo || '').trim()
    if (!billNo) return res.status(400).json({ message: 'billNo required' })
    const rows = await query(`SELECT * FROM sales_master WHERE bill_no = :billNo LIMIT 1`, { billNo })
    if (!rows[0]) return res.status(404).json({ message: 'Not found' })
    res.json(rows[0])
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
})

// GET FULL BILL (master + items)
router.get('/:id/full', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    const masters = await query(`SELECT * FROM sales_master WHERE id = :id`, { id })
    if (!masters[0]) return res.status(404).json({ message: 'Not found' })
    const items = await query(`SELECT id, sku, item_name AS name, size, qty, price FROM sales_items WHERE sale_id = :id`, { id })
    res.json({ master: masters[0], items })
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
})

// CREATE EXCHANGE (returns + issues)
router.post('/exchange', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const { originalSaleId, outletId, customerName, customerMobile, reason = null, returns = [], issues = [] } = req.body || {}
    if (!originalSaleId) return res.status(400).json({ message: 'originalSaleId required' })
    // Basic validation
    if (!Array.isArray(returns) || !Array.isArray(issues)) return res.status(400).json({ message: 'Invalid payload' })
    await conn.beginTransaction()
    const [ins] = await conn.execute(`
      INSERT INTO exchange_master (exchange_date, outlet_id, customer_name, customer_mobile, reason)
      VALUES (NOW(), :outletId, :customerName, :customerMobile, :reason)
    `, { outletId: outletId || null, customerName: customerName || null, customerMobile: customerMobile || null, reason })
    const exchangeId = ins.insertId

    // Helper to map sku -> item_id
    const skuToItemId = async (sku) => {
      const [rows] = await conn.execute(`SELECT id FROM item_master WHERE item_code = :sku LIMIT 1`, { sku: String(sku||'') })
      return rows[0]?.id || null
    }

    // Returns (old items coming back) -> add to QC bin
    for (const r of returns) {
      const qty = Math.max(0, Number(r?.qty || 0))
      if (!qty) continue
      const itemId = r?.itemId || await skuToItemId(r?.sku)
      await conn.execute(`
        INSERT INTO exchange_items (exchange_id, direction, item_id, sku, item_name, size, qty, price)
        VALUES (:exchangeId, 'return', :itemId, :sku, :name, :size, :qty, :price)
      `, {
        exchangeId,
        itemId: itemId || null,
        sku: String(r?.sku || ''),
        name: String(r?.name || ''),
        size: r?.size != null ? String(r.size) : null,
        qty,
        price: Number(r?.price || 0),
      })
      if (itemId && outletId) {
        // upsert into outlet_stock_qc
        await conn.execute(`
          INSERT INTO outlet_stock_qc (outlet_id, item_id, qty)
          VALUES (:outletId, :itemId, :qty)
          ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)
        `, { outletId: Number(outletId), itemId: Number(itemId), qty })
      }
    }

    // Issues (new items going out) -> deduct from live stock
    for (const it of issues) {
      const qty = Math.max(0, Number(it?.qty || 0))
      if (!qty) continue
      const itemId = it?.itemId || await skuToItemId(it?.sku)
      await conn.execute(`
        INSERT INTO exchange_items (exchange_id, direction, item_id, sku, item_name, size, qty, price)
        VALUES (:exchangeId, 'issue', :itemId, :sku, :name, :size, :qty, :price)
      `, {
        exchangeId,
        itemId: itemId || null,
        sku: String(it?.sku || ''),
        name: String(it?.name || ''),
        size: it?.size != null ? String(it.size) : null,
        qty,
        price: Number(it?.price || 0),
      })
      if (itemId && outletId) {
        // decrement outlet_stock; if row exists and would go negative, clamp at 0
        await conn.execute(`
          INSERT INTO outlet_stock (outlet_id, item_id, qty)
          VALUES (:outletId, :itemId, 0)
          ON DUPLICATE KEY UPDATE qty = GREATEST(0, qty - :dec)
        `, { outletId: Number(outletId), itemId: Number(itemId), dec: qty })
      }
    }

    await conn.commit()
    res.status(201).json({ id: exchangeId })
  } catch (e) {
    await conn.rollback()
    console.error('POST /sales/exchange error', e)
    res.status(500).json({ message: e?.sqlMessage || e?.message || 'Server error' })
  } finally { conn.release() }
})

// SEARCH sales by mobile/date range
router.get('/search', async (req, res) => {
  try {
    const mobile = req.query.mobile ? String(req.query.mobile) : ''
    const from = req.query.from ? String(req.query.from) : ''
    const to = req.query.to ? String(req.query.to) : ''
    const wh = []
    const params = {}
    if (mobile) { wh.push('customer_mobile = :mobile'); params.mobile = mobile }
    if (from) { wh.push('bill_date >= :from'); params.from = from + ' 00:00:00' }
    if (to) { wh.push('bill_date <= :to'); params.to = to + ' 23:59:59' }
    if (!wh.length) return res.status(400).json({ message: 'Provide mobile or from/to' })
    const rows = await query(`SELECT * FROM sales_master ${wh.length ? 'WHERE '+wh.join(' AND ') : ''} ORDER BY id DESC LIMIT 200`, params)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/sales  -> create sale
router.post('/', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const { outletId, employeeId = null, customerName, customerMobile, payMethod = 'cash',
            subtotal = 0, discountPct = 0, discountAmt = 0, taxable = 0, taxRate = 0, taxAmt = 0, total = 0,
            tax5 = 0, tax18 = 0,
            cart = [], payments = [], acceptPartialPayment = false } = req.body || {}
    if (!Array.isArray(cart) || cart.length === 0) return res.status(400).json({ message: 'Cart is empty' })
    if (!acceptPartialPayment && Array.isArray(payments) && payments.length) {
      const sum = payments.reduce((s, p) => s + Number(p?.amount || 0), 0)
      if (Math.abs(Number(total) - sum) > 0.01) {
        return res.status(400).json({ message: 'Payments do not sum to bill total' })
      }
    }

    await conn.beginTransaction()
    const billNo = `B${Date.now()}`
    const [ins] = await conn.execute(`
      INSERT INTO sales_master (bill_no, outlet_id, employee_id, customer_name, customer_mobile, pay_method,
                                subtotal, discount_pct, discount_amt, taxable, tax_rate, tax_amt, total, bill_date)
      VALUES (:billNo, :outletId, :employeeId, :customerName, :customerMobile, :payMethod,
              :subtotal, :discountPct, :discountAmt, :taxable, :taxRate, :taxAmt, :total, NOW())
    `, { billNo, outletId: outletId || null, employeeId: employeeId || null, customerName: customerName || null, customerMobile: customerMobile || null, payMethod,
         subtotal, discountPct, discountAmt, taxable, taxRate, taxAmt, total })
    const saleId = ins.insertId

    // mirror to billing_master
    const [bins] = await conn.execute(`
      INSERT INTO billing_master (bill_no, outlet_id, customer_name, customer_mobile, pay_method,
                                  subtotal, discount_pct, discount_amt, taxable, tax_rate, tax_amt, total, bill_date)
      VALUES (:billNo, :outletId, :customerName, :customerMobile, :payMethod,
              :subtotal, :discountPct, :discountAmt, :taxable, :taxRate, :taxAmt, :total, NOW())
    `, { billNo, outletId: outletId || null, customerName: customerName || null, customerMobile: customerMobile || null, payMethod,
         subtotal, discountPct, discountAmt, taxable, taxRate, taxAmt, total })
    const billingId = bins.insertId

    for (const ci of cart) {
      // sales_items
      await conn.execute(`
        INSERT INTO sales_items (sale_id, item_id, sku, item_name, size, qty, price, line_total, brand, category, colour)
        VALUES (:saleId, :itemId, :sku, :name, :size, :qty, :price, :lineTotal, :brand, :category, :colour)
      `, {
        saleId,
        itemId: ci.itemId || null,
        sku: String(ci.sku),
        name: String(ci.name),
        size: ci.size != null ? String(ci.size) : null,
        qty: Number(ci.qty || 1),
        price: Number(ci.price || 0),
        lineTotal: Number((ci.qty || 1) * (ci.price || 0)),
        brand: ci.brand || null,
        category: ci.category || null,
        colour: ci.colour || null,
      })

      // billing_items
      await conn.execute(`
        INSERT INTO billing_items (billing_id, item_id, sku, item_name, size, qty, price, line_total, brand, category, colour)
        VALUES (:billingId, :itemId, :sku, :name, :size, :qty, :price, :lineTotal, :brand, :category, :colour)
      `, {
        billingId,
        itemId: ci.itemId || null,
        sku: String(ci.sku),
        name: String(ci.name),
        size: ci.size != null ? String(ci.size) : null,
        qty: Number(ci.qty || 1),
        price: Number(ci.price || 0),
        lineTotal: Number((ci.qty || 1) * (ci.price || 0)),
        brand: ci.brand || null,
        category: ci.category || null,
        colour: ci.colour || null,
      })
    }

    // payments (optional, multi-method)
    if (Array.isArray(payments) && payments.length) {
      for (const p of payments) {
        const method = (p?.method === 'cash' || p?.method === 'card' || p?.method === 'upi') ? p.method : 'cash'
        const amount = Number(p?.amount || 0)
        const ref = p?.ref ? String(p.ref) : null
        await conn.execute(`
          INSERT INTO sales_payments (sale_id, method, amount, ref)
          VALUES (:saleId, :method, :amount, :ref)
        `, { saleId, method, amount, ref })
      }
    }

    await conn.commit()
    const [row] = await conn.execute(`SELECT * FROM sales_master WHERE id = :id`, { id: saleId })
    res.status(201).json({ ...row[0], id: saleId, billNo, billingId })
  } catch (e) {
    await conn.rollback()
    console.error('POST /sales error', e)
    res.status(500).json({ message: e?.sqlMessage || e?.message || 'Server error' })
  } finally { conn.release() }
})

// GET /api/sales -> list sales (recent first)
router.get('/', async (_req, res) => {
  try {
    const rows = await query(`SELECT * FROM sales_master ORDER BY id DESC LIMIT 500`)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/sales/:id/items -> items for a sale
router.get('/:id/items', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    const items = await query(`SELECT sku, item_name AS name, size, qty, price FROM sales_items WHERE sale_id = :id`, { id })
    res.json(items)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

// HOLD: POST /api/sales/hold
router.post('/hold', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const { outletId, customerName, customerMobile, discountPct = 0, taxRate = 0, cart = [] } = req.body || {}
    if (!Array.isArray(cart) || cart.length === 0) return res.status(400).json({ message: 'Cart is empty' })
    await conn.beginTransaction()
    const token = `H${Date.now()}`
    const [ins] = await conn.execute(`
      INSERT INTO hold_master (token, outlet_id, customer_name, customer_mobile, discount_pct, tax_rate, hold_date)
      VALUES (:token, :outletId, :customerName, :customerMobile, :discountPct, :taxRate, NOW())
    `, { token, outletId: outletId || null, customerName: customerName || null, customerMobile: customerMobile || null, discountPct, taxRate })
    const holdId = ins.insertId
    for (const ci of cart) {
      await conn.execute(`
        INSERT INTO hold_items (hold_id, item_id, sku, item_name, size, qty, price)
        VALUES (:holdId, :itemId, :sku, :name, :size, :qty, :price)
      `, {
        holdId,
        itemId: ci.itemId || null,
        sku: String(ci.sku),
        name: String(ci.name),
        size: ci.size != null ? String(ci.size) : null,
        qty: Number(ci.qty || 1),
        price: Number(ci.price || 0),
      })
    }
    await conn.commit()
    const held = await query(`SELECT id, token, hold_date AS createdAt, outlet_id AS outletId, customer_name AS customerName, customer_mobile AS customerMobile, discount_pct AS discountPct, tax_rate AS taxRate FROM hold_master WHERE id = :id`, { id: holdId })
    const items = await query(`SELECT sku, item_name AS name, size, qty, price FROM hold_items WHERE hold_id = :id`, { id: holdId })
    res.status(201).json({ ...held[0], cart: items })
  } catch (e) {
    await conn.rollback()
    console.error('POST /sales/hold error', e)
    res.status(500).json({ message: e?.sqlMessage || e?.message || 'Server error' })
  } finally { conn.release() }
})

// HOLD: GET /api/sales/hold
router.get('/hold', async (_req, res) => {
  try {
    const masters = await query(`SELECT id, token, hold_date AS createdAt, outlet_id AS outletId, customer_name AS customerName, customer_mobile AS customerMobile, discount_pct AS discountPct, tax_rate AS taxRate FROM hold_master ORDER BY id DESC LIMIT 500`)
    const ids = masters.map(m => m.id)
    const items = ids.length ? await query(`SELECT hold_id AS holdId, sku, item_name AS name, size, qty, price FROM hold_items WHERE hold_id IN (${ids.map(()=>'?').join(',')})`, ids) : []
    const grouped = Object.groupBy ? Object.groupBy(items, (it) => it.holdId) : items.reduce((m, it) => { (m[it.holdId] ||= []).push(it); return m }, {})
    const out = masters.map(m => ({ ...m, cart: grouped[m.id] || [] }))
    res.json(out)
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

// HOLD: DELETE /api/sales/hold/:id
router.delete('/hold/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    await pool.execute(`DELETE FROM hold_master WHERE id = :id`, { id })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
