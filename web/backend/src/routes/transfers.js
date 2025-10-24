import express from 'express'
import jwt from 'jsonwebtoken'
import { pool, query } from '../db.js'

const router = express.Router()

// Ensure table exists (transfer_master) with minimal fields
async function ensureTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS transfer_master (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      transaction_txn_id INT UNSIGNED NULL,
      transaction_code VARCHAR(64) NULL,
      from_outlet_id INT UNSIGNED NULL,
      to_outlet_id INT UNSIGNED NOT NULL,
      item_id INT UNSIGNED NOT NULL,
      date DATE NOT NULL,
      qty INT NOT NULL,
      stock_no VARCHAR(64) NULL,
      size INT NULL,
      dealer_price DECIMAL(10,2) NULL,
      total_price DECIMAL(10,2) NULL,
      status ENUM('Pending','Shipped','Received','Confirmed','Rejected') NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_txn_id (transaction_txn_id),
      INDEX idx_txn (transaction_code),
      INDEX idx_from (from_outlet_id),
      INDEX idx_to (to_outlet_id),
      INDEX idx_item (item_id),
      CONSTRAINT fk_transfers_from FOREIGN KEY (from_outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
      CONSTRAINT fk_transfers_to FOREIGN KEY (to_outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
      CONSTRAINT fk_transfers_item FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
  // Make from_outlet_id nullable if it's NOT NULL already (legacy installs)
  try {
    const [colInfo] = await pool.execute(`SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transfer_master' AND COLUMN_NAME = 'from_outlet_id'`)
    const isNullable = colInfo?.[0]?.IS_NULLABLE === 'YES'
    if (!isNullable) {
      await pool.execute(`ALTER TABLE transfer_master MODIFY from_outlet_id INT UNSIGNED NULL`)
    }
  } catch {}
  // Ensure convenience columns exist (best-effort for older schemas)
  try { await pool.execute(`ALTER TABLE transfer_master ADD COLUMN IF NOT EXISTS transaction_txn_id INT UNSIGNED NULL`) } catch {}
  try { await pool.execute(`ALTER TABLE transfer_master ADD COLUMN IF NOT EXISTS accepted_at DATETIME NULL`) } catch {}
  try { await pool.execute(`ALTER TABLE transfer_master ADD COLUMN IF NOT EXISTS discrepancy_note TEXT NULL`) } catch {}
  try { await pool.execute(`ALTER TABLE transfer_master ADD COLUMN IF NOT EXISTS stock_no VARCHAR(64) NULL`) } catch {}
  try { await pool.execute(`ALTER TABLE transfer_master ADD COLUMN IF NOT EXISTS dealer_price DECIMAL(10,2) NULL`) } catch {}
  try { await pool.execute(`ALTER TABLE transfer_master ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) NULL`) } catch {}
  // New normalized tables: one row per transaction + many line items
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS transfer_txn (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        transaction_code VARCHAR(64) NOT NULL UNIQUE,
        from_outlet_id INT UNSIGNED NULL,
        to_outlet_id INT UNSIGNED NOT NULL,
        priority ENUM('Normal','High','Urgent') NOT NULL DEFAULT 'Normal',
        note VARCHAR(255) NULL,
        status ENUM('Pending','Shipped','Received','Confirmed','Rejected') NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        dispatched_at DATETIME NULL,
        accepted_at DATETIME NULL,
        discrepancy_note TEXT NULL,
        PRIMARY KEY (id),
        INDEX idx_from (from_outlet_id),
        INDEX idx_to (to_outlet_id),
        CONSTRAINT fk_txn_from FOREIGN KEY (from_outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
        CONSTRAINT fk_txn_to FOREIGN KEY (to_outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`)
  } catch {
    // Fallback without FKs (outlets table may not exist yet)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS transfer_txn (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        transaction_code VARCHAR(64) NOT NULL UNIQUE,
        from_outlet_id INT UNSIGNED NULL,
        to_outlet_id INT UNSIGNED NOT NULL,
        priority ENUM('Normal','High','Urgent') NOT NULL DEFAULT 'Normal',
        note VARCHAR(255) NULL,
        status ENUM('Pending','Shipped','Received','Confirmed','Rejected') NOT NULL DEFAULT 'Pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        dispatched_at DATETIME NULL,
        accepted_at DATETIME NULL,
        discrepancy_note TEXT NULL,
        PRIMARY KEY (id),
        INDEX idx_from (from_outlet_id),
        INDEX idx_to (to_outlet_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`)
  }

  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS transfer_txn_lines (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        txn_id INT UNSIGNED NOT NULL,
        item_id INT UNSIGNED NOT NULL,
        qty INT NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_txn (txn_id),
        INDEX idx_item (item_id),
        CONSTRAINT fk_txn_lines_txn FOREIGN KEY (txn_id) REFERENCES transfer_txn(id) ON DELETE CASCADE,
        CONSTRAINT fk_txn_lines_item FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`)
  } catch {
    // Fallback without FKs (referenced tables may not exist yet)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS transfer_txn_lines (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        txn_id INT UNSIGNED NOT NULL,
        item_id INT UNSIGNED NOT NULL,
        qty INT NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_txn (txn_id),
        INDEX idx_item (item_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`)
  }
  // Ensure updated_at exists for older schemas and relax from_outlet_id to NULL if needed
  try {
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transfer_master'`
    )
    const have = new Set(cols.map((r) => r.COLUMN_NAME))
    if (!have.has('updated_at')) {
      await pool.execute(`ALTER TABLE transfer_master ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP`)
    }
    // Ensure fk_transfers_item references item_master(id) (some DBs may have created it against items(id))
    try {
      const [fkRows] = await pool.execute(`
        SELECT REFERENCED_TABLE_NAME AS ref_table
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transfer_master' AND CONSTRAINT_NAME = 'fk_transfers_item'`)
      const refTable = fkRows?.[0]?.ref_table
      if (refTable && refTable.toLowerCase() !== 'item_master') {
        await pool.execute('ALTER TABLE transfer_master DROP FOREIGN KEY fk_transfers_item')
        await pool.execute(`ALTER TABLE transfer_master
          ADD CONSTRAINT fk_transfers_item FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT`)
        console.log('[transfer_master] Fixed fk_transfers_item -> item_master(id)')
      }
    } catch (eFix) {
      // noop if constraint doesn't exist yet; will be created by main CREATE TABLE
    }
    // Add new audit columns to transfer_txn on older DBs
    try { await pool.execute(`ALTER TABLE transfer_txn ADD COLUMN IF NOT EXISTS dispatched_at DATETIME NULL`) } catch {}
    try { await pool.execute(`ALTER TABLE transfer_txn ADD COLUMN IF NOT EXISTS accepted_at DATETIME NULL`) } catch {}
    try { await pool.execute(`ALTER TABLE transfer_txn ADD COLUMN IF NOT EXISTS discrepancy_note TEXT NULL`) } catch {}
    // Creator attribution columns (best-effort)
    try { await pool.execute(`ALTER TABLE transfer_txn ADD COLUMN IF NOT EXISTS created_by_user_id INT UNSIGNED NULL`) } catch {}
    try { await pool.execute(`ALTER TABLE transfer_txn ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(190) NULL`) } catch {}
    // Make from_outlet_id nullable if it's NOT NULL already
    try {
      const [colInfo] = await pool.execute(`SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transfer_txn' AND COLUMN_NAME = 'from_outlet_id'`)
      const isNullable = colInfo?.[0]?.IS_NULLABLE === 'YES'
      if (!isNullable) {
        await pool.execute(`ALTER TABLE transfer_txn MODIFY from_outlet_id INT UNSIGNED NULL`)
      }
    } catch (eAlt) {
      // best-effort; ignore if fails on fresh DB
    }
  } catch (e) {
    console.warn('[transfer_master] Column ensure skipped:', e?.message)
  }
}

router.use(async (_req, _res, next) => {
  try { await ensureTable() } catch {}
  next()
})

// GET /api/transfers/requests/stats -> counts by status
router.get('/requests/stats', async (_req, res) => {
  try {
    const rows = await query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'Shipped' THEN 1 ELSE 0 END) AS shipped,
        SUM(CASE WHEN status = 'Received' THEN 1 ELSE 0 END) AS received,
        SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
      FROM transfer_txn
    `, {})
    const r = rows?.[0] || {}
    res.json({
      total: Number(r.total || 0),
      pending: Number(r.pending || 0),
      shipped: Number(r.shipped || 0),
      received: Number(r.received || 0),
      confirmed: Number(r.confirmed || 0),
      rejected: Number(r.rejected || 0),
    })
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      return res.json({ total: 0, pending: 0, shipped: 0, received: 0, confirmed: 0, rejected: 0 })
    }
    console.error('GET /transfers/requests/stats error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/transfers/inward -> list inbound transfers for a destination outlet
router.get('/inward', async (req, res) => {
  try {
    const outletId = Number(req.query.outletId)
    const status = String(req.query.status || '').toLowerCase()
    if (!outletId) return res.status(400).json({ message: 'outletId is required' })

    const parts = ['t.to_outlet_id = :outletId']
    const params = { outletId }
    if (status === 'pending') parts.push(`t.status IN ('Pending','Shipped','Received')`)
    else if (status === 'accepted') parts.push(`t.status = 'Confirmed'`)

    const where = parts.length ? `WHERE ${parts.join(' AND ')}` : ''
    const rows = await query(`
      SELECT t.id, t.transaction_code AS transactionCode,
             t.from_outlet_id AS fromOutletId, t.to_outlet_id AS toOutletId,
             t.status, t.created_at AS createdAt, t.dispatched_at AS dispatchedAt, t.accepted_at AS acceptedAt,
             COALESCE(SUM(l.qty), 0) AS totalQty,
             COALESCE(SUM(COALESCE(im.dealer_price, 0) * l.qty), 0) AS totalAmount,
             COUNT(l.id) AS itemCount
      FROM transfer_txn t
      LEFT JOIN transfer_txn_lines l ON l.txn_id = t.id
      LEFT JOIN item_master im ON im.id = l.item_id
      ${where}
      GROUP BY t.id
      ORDER BY COALESCE(t.dispatched_at, t.created_at) DESC, t.id DESC
    `, params)
    res.json(rows)
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return res.json([])
    console.error('GET /transfers/inward error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/transfers/requests/:id/lines -> replace lines when status is Pending
router.put('/requests/:id/lines', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const id = Number(req.params.id)
    let { items } = req.body || {}
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' })
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'items[] required' })

    const [hdrRows] = await conn.execute(`SELECT id, transaction_code AS transactionCode, from_outlet_id AS fromOutletId, to_outlet_id AS toOutletId, status FROM transfer_txn WHERE id = :id LIMIT 1`, { id })
    const hdr = hdrRows?.[0]
    if (!hdr) return res.status(404).json({ message: 'Transaction not found' })
    if (hdr.status !== 'Pending') return res.status(400).json({ message: 'Only Pending transfers can be edited' })

    await conn.beginTransaction()
    await conn.execute(`DELETE FROM transfer_txn_lines WHERE txn_id = :id`, { id })
    for (let i = 0; i < items.length; i += 1) {
      let { itemId, itemCode, stockNo, qty } = items[i] || {}
      qty = Number(qty)
      if ((!itemId && !itemCode && !stockNo) || !Number.isFinite(qty) || qty <= 0) throw new Error(`Invalid row at index ${i}`)
      if (!itemId) {
        // Try resolve by explicit itemCode first
        if (itemCode) {
          const [rows] = await conn.execute(`SELECT id FROM item_master WHERE item_code = :code OR stock_id = :code OR stock_no = :code LIMIT 1`, { code: String(itemCode) })
          if (rows[0]?.id) itemId = rows[0].id
        }
        // Fallback to stockNo field if provided
        if (!itemId && stockNo) {
          const [rowsByStock] = await conn.execute(`SELECT id FROM item_master WHERE stock_id = :stock OR stock_no = :stock LIMIT 1`, { stock: String(stockNo) })
          if (rowsByStock[0]?.id) itemId = rowsByStock[0].id
        }
        if (!itemId) throw new Error(`Item not found for code: ${itemCode || stockNo}`)
      }
      await conn.execute(`INSERT INTO transfer_txn_lines (txn_id, item_id, qty) VALUES (:txnId, :itemId, :qty)`, { txnId: id, itemId, qty })
    }

    try {
      await conn.execute(`DELETE FROM transfer_master WHERE transaction_txn_id = :id`, { id })
      for (let i = 0; i < items.length; i += 1) {
        let { itemId, itemCode, stockNo, qty } = items[i] || {}
        qty = Number(qty)
        if (!itemId) {
          if (itemCode) {
            const [rows] = await conn.execute(`SELECT id FROM item_master WHERE item_code = :code OR stock_id = :code OR stock_no = :code LIMIT 1`, { code: String(itemCode) })
            if (rows?.[0]?.id) itemId = rows[0].id
          }
          if (!itemId && stockNo) {
            const [rowsByStock] = await conn.execute(`SELECT id FROM item_master WHERE stock_id = :stock OR stock_no = :stock LIMIT 1`, { stock: String(stockNo) })
            if (rowsByStock?.[0]?.id) itemId = rowsByStock[0].id
          }
        }
        const [itRows] = await conn.execute(`SELECT stock_id AS stockNo, stock_no AS stockNo2, size, dealer_price AS dealerPrice FROM item_master WHERE id = :id LIMIT 1`, { id: itemId })
        const it = itRows?.[0] || {}
        const dp = it?.dealerPrice != null ? Number(it.dealerPrice) : null
        const total = dp != null ? (dp * qty) : null
        const stockNoResolved = it?.stockNo || it?.stockNo2 || null
        await conn.execute(`
          INSERT INTO transfer_master (
            transaction_txn_id, transaction_code, from_outlet_id, to_outlet_id, item_id, date, qty, stock_no, size, dealer_price, total_price, status, created_at
          ) VALUES (
            :txnId, :transactionCode, :fromOutletId, :toOutletId, :itemId, CURDATE(), :qty, :stockNo, :size, :dealerPrice, :totalPrice, 'Pending', NOW()
          )
        `, {
          txnId: id,
          transactionCode: hdr.transactionCode,
          fromOutletId: hdr.fromOutletId ?? null,
          toOutletId: hdr.toOutletId,
          itemId,
          qty,
          stockNo: stockNoResolved,
          size: it?.size != null ? Number(it.size) : null,
          dealerPrice: dp,
          totalPrice: total,
        })
      }
    } catch {}

    await conn.commit()
    const [agg] = await conn.execute(`
      SELECT COUNT(l.id) AS itemCount, COALESCE(SUM(l.qty),0) AS totalQty
      FROM transfer_txn_lines l WHERE l.txn_id = :id
    `, { id })
    res.json({ id, transactionCode: hdr.transactionCode, itemCount: agg?.[0]?.itemCount || 0, totalQty: agg?.[0]?.totalQty || 0 })
  } catch (err) {
    await conn.rollback()
    console.error('PUT /transfers/requests/:id/lines error', err)
    res.status(500).json({ message: err?.sqlMessage || err?.message || 'Server error' })
  } finally {
    conn.release()
  }
})

// GET /api/transfers/requests/:id -> header + lines with item details
router.get('/requests/:id', async (req, res) => {
  try {
    const idOrCode = String(req.params.id)
    const id = Number.isFinite(Number(idOrCode)) ? Number(idOrCode) : NaN
    const headerSql = `
      SELECT t.id, t.transaction_code AS transactionCode, t.from_outlet_id AS fromOutletId, t.to_outlet_id AS toOutletId,
             t.priority, t.note, t.status, t.created_at AS createdAt, t.updated_at AS updatedAt,
             t.created_by_user_id AS createdByUserId,
             COALESCE(u.email, t.created_by_name) AS createdBy
      FROM transfer_txn t
      LEFT JOIN users u ON u.id = t.created_by_user_id
      WHERE t.id = :id LIMIT 1`
    const linesSql = `
      SELECT l.id, l.qty,
             im.id AS itemId,
             im.item_code AS itemCode,
             im.item_code_desc AS itemCodeDesc,
             COALESCE(im.stock_no, im.stock_id) AS stockNo,
             im.size,
             im.description AS category,
             im.retail_price AS retailPrice,
             im.dealer_price AS dealerPrice,
             im.cost_price AS costPrice,
             im.last_purchase_price AS lastPurchasePrice,
             im.sole, im.material,
             im.hsn_code AS hsnCode,
             im.tax_code AS taxCode,
             b.brand_name AS brand,
             c.color_desc AS colorName,
             c.color_code AS colorCode
      FROM transfer_txn_lines l
      JOIN item_master im ON im.id = l.item_id
      LEFT JOIN brand b ON b.id = im.brand_id
      LEFT JOIN colours c ON c.id = im.color_id
      WHERE l.txn_id = :id
      ORDER BY l.id ASC`
    let hdrRows = []
    if (Number.isFinite(id)) {
      hdrRows = await query(headerSql, { id })
    }
    // Fallback by transaction_code if not numeric or not found
    if (!hdrRows.length) {
      const byCode = await query(`SELECT t.id, t.transaction_code AS transactionCode, t.from_outlet_id AS fromOutletId, t.to_outlet_id AS toOutletId,
                                         t.priority, t.note, t.status, t.created_at AS createdAt, t.updated_at AS updatedAt,
                                         t.created_by_user_id AS createdByUserId,
                                         COALESCE(u.email, t.created_by_name) AS createdBy
                                  FROM transfer_txn t
                                  LEFT JOIN users u ON u.id = t.created_by_user_id
                                  WHERE t.transaction_code = :code LIMIT 1`, { code: idOrCode })
      hdrRows = byCode
    }
    if (hdrRows.length) {
      const useId = hdrRows[0].id
      // Try preferred source: transfer_master joined with item_master
      const tmRows = await query(`SELECT COUNT(1) AS cnt FROM transfer_master WHERE transaction_txn_id = :id`, { id: useId })
      if (tmRows?.[0]?.cnt > 0) {
        const linesFromTm = await query(`
          SELECT 
            tm.id,
            tm.qty,
            im.id AS itemId,
            im.item_code AS itemCode,
            im.item_code_desc AS itemCodeDesc,
            COALESCE(tm.stock_no, im.stock_no, im.stock_id) AS stockNo,
            im.size,
            im.description AS category,
            im.retail_price AS retailPrice,
            COALESCE(tm.dealer_price, im.dealer_price) AS dealerPrice,
            im.cost_price AS costPrice,
            im.last_purchase_price AS lastPurchasePrice,
            im.sole, im.material,
            im.hsn_code AS hsnCode,
            im.tax_code AS taxCode,
            b.brand_name AS brand,
            c.color_desc AS colorName,
            c.color_code AS colorCode
          FROM transfer_master tm
          LEFT JOIN item_master im ON im.id = tm.item_id
          LEFT JOIN brand b ON b.id = im.brand_id
          LEFT JOIN colours c ON c.id = im.color_id
          WHERE tm.transaction_txn_id = :id
          ORDER BY tm.id ASC
        `, { id: useId })
        return res.json({ header: hdrRows[0], lines: linesFromTm })
      }
      // Fallback to normalized lines
      const lineRows = await query(linesSql, { id: useId })
      return res.json({ header: hdrRows[0], lines: lineRows })
    }

    // Fallback: build from transfer_master mirror if present
    const hdr2 = await query(`
      SELECT 
        :id AS id,
        COALESCE(MIN(transaction_code), CONCAT('TXN-', LPAD(:id, 8, '0'))) AS transactionCode,
        MIN(from_outlet_id) AS fromOutletId,
        MIN(to_outlet_id) AS toOutletId,
        'Normal' AS priority,
        NULL AS note,
        COALESCE(MIN(status), 'Pending') AS status,
        MIN(created_at) AS createdAt,
        MAX(updated_at) AS updatedAt
      FROM transfer_master WHERE transaction_txn_id = :id`, { id: Number.isFinite(id) ? id : -1 })
    if (!hdr2.length || hdr2[0].createdAt == null) {
      return res.status(404).json({ message: 'Not found' })
    }
    const lines2 = await query(`
      SELECT 
  t.id, 
  t.transaction_code AS transactionCode,
  t.from_outlet_id AS fromOutletId,
  t.to_outlet_id AS toOutletId,
  t.priority,
  t.note,
  t.status,
  t.created_at AS createdAt,
  t.updated_at AS updatedAt,
  COUNT(l.id) AS itemCount,
  COALESCE(SUM(l.qty),0) AS totalQty
FROM transfer_txn t
LEFT JOIN transfer_txn_lines l ON l.txn_id = t.id
GROUP BY 
  t.id, 
  t.transaction_code,
  t.from_outlet_id,
  t.to_outlet_id,
  t.priority,
  t.note,
  t.status,
  t.created_at,
  t.updated_at
ORDER BY t.id DESC;
`, { id: Number.isFinite(id) ? id : -1 })
    return res.json({ header: hdr2[0], lines: lines2 })
  } catch (err) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      return res.status(404).json({ message: 'Not found' })
    }
    console.error('GET /transfers/requests/:id error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/transfers/requests/:id -> update header status with role-aware workflow
// Body: { status: 'Shipped'|'Received'|'Confirmed', actorOutletId?: number }
router.put('/requests/:id', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const id = Number(req.params.id)
    let { status, actorOutletId, discrepancyNote } = req.body || {}
    const allowed = ['Shipped','Received','Confirmed']
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ message: 'Invalid status' })
    }
    const [rows] = await conn.execute(`SELECT id, from_outlet_id AS fromOutletId, to_outlet_id AS toOutletId, status FROM transfer_txn WHERE id = :id LIMIT 1`, { id })
    const t = rows?.[0]
    if (!t) return res.status(404).json({ message: 'Transaction not found' })

    // Role validation
    actorOutletId = actorOutletId == null || actorOutletId === '' ? null : Number(actorOutletId)
    const cur = t.status
    const isSender = (!t.fromOutletId && actorOutletId == null) || (t.fromOutletId && Number(t.fromOutletId) === Number(actorOutletId))
    const isReceiver = Number(t.toOutletId) === Number(actorOutletId)

    // Allowed transitions
    const canShip = cur === 'Pending' && isSender && status === 'Shipped'
    const canReceive = cur === 'Shipped' && isReceiver && status === 'Received'
    const canConfirm = (cur === 'Received' || cur === 'Shipped') && isReceiver && status === 'Confirmed'
    if (!(canShip || canReceive || canConfirm)) {
      return res.status(403).json({ message: 'Not allowed to set status from current state' })
    }

    await conn.beginTransaction()
    // set timestamps based on transition
    if (status === 'Shipped') {
      await conn.execute(`UPDATE transfer_txn SET status = :status, dispatched_at = COALESCE(dispatched_at, NOW()), updated_at = NOW() WHERE id = :id`, { id, status })
    } else if (status === 'Confirmed') {
      await conn.execute(`UPDATE transfer_txn SET status = :status, accepted_at = NOW(), discrepancy_note = COALESCE(:discrepancyNote, discrepancy_note), updated_at = NOW() WHERE id = :id`, { id, status, discrepancyNote: discrepancyNote || null })
    } else {
      await conn.execute(`UPDATE transfer_txn SET status = :status, updated_at = NOW() WHERE id = :id`, { id, status })
    }
    // Mirror status to transfer_master rows linked by transaction_txn_id
    try {
      if (status === 'Confirmed') {
        await conn.execute(`UPDATE transfer_master SET status = :status, accepted_at = NOW(), discrepancy_note = COALESCE(:discrepancyNote, discrepancy_note), updated_at = NOW() WHERE transaction_txn_id = :id`, { id, status, discrepancyNote: discrepancyNote || null })
      } else {
        await conn.execute(`UPDATE transfer_master SET status = :status, updated_at = NOW() WHERE transaction_txn_id = :id`, { id, status })
      }
    } catch {}

    // If confirming, add to outlet_stock for destination across all lines
    if (status === 'Confirmed') {
      // ensure outlet_stock table exists
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS outlet_stock (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          outlet_id INT UNSIGNED NOT NULL,
          item_id INT UNSIGNED NOT NULL,
          qty INT NOT NULL DEFAULT 0,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_outlet_item (outlet_id, item_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`)
      // Try to ensure proper foreign keys (best-effort across different DB states)
      try {
        // Add missing FKs if they don't exist
        try { await conn.execute(`ALTER TABLE outlet_stock ADD CONSTRAINT fk_outlet_stock_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE`) } catch {}
        try { await conn.execute(`ALTER TABLE outlet_stock ADD CONSTRAINT fk_outlet_stock_item FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT`) } catch {}
        // If an FK exists pointing to a wrong table (e.g., items), fix it
        const [fkRows] = await conn.execute(`
          SELECT CONSTRAINT_NAME AS name, REFERENCED_TABLE_NAME AS ref
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outlet_stock' AND COLUMN_NAME = 'item_id' AND REFERENCED_TABLE_NAME IS NOT NULL
          LIMIT 1
        `)
        const fk = fkRows?.[0]
        if (fk && String(fk.ref).toLowerCase() !== 'item_master') {
          try { await conn.execute(`ALTER TABLE outlet_stock DROP FOREIGN KEY ${fk.name}`) } catch {}
          try { await conn.execute(`ALTER TABLE outlet_stock ADD CONSTRAINT fk_outlet_stock_item FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT`) } catch {}
        }
      } catch {}
      const [lines] = await conn.execute(`SELECT item_id AS itemId, qty FROM transfer_txn_lines WHERE txn_id = :id`, { id })
      for (let i = 0; i < lines.length; i += 1) {
        const it = lines[i]
        await conn.execute(`
          INSERT INTO outlet_stock (outlet_id, item_id, qty)
          VALUES (:outletId, :itemId, :qty)
          ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)
        `, { outletId: Number(t.toOutletId), itemId: Number(it.itemId), qty: Number(it.qty) })
      }
    }

    await conn.commit()
    res.json({ id, status })
  } catch (err) {
    await conn.rollback()
    console.error('PUT /transfers/requests/:id error', err)
    res.status(500).json({ message: err?.sqlMessage || err?.message || 'Server error' })
  } finally {
    conn.release()
  }
})

// POST /api/transfers/requests -> create one transaction with multiple items
// Body: { fromOutletId, toOutletId, priority?, note?, items: [{ itemId|itemCode, qty }] }
router.post('/requests', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    let { fromOutletId, toOutletId, priority = 'Normal', note = null, items } = req.body || {}
    fromOutletId = fromOutletId == null || fromOutletId === '' ? null : Number(fromOutletId)
    toOutletId = Number(toOutletId)
    if (!toOutletId || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'toOutletId and items[] are required' })
    }
    // Extract creator from Authorization header (JWT), headers, or body
    let createdByUserId = null
    let createdByName = null
    try {
      const authz = req.headers.authorization || ''
      const token = authz.startsWith('Bearer ')? authz.slice(7) : null
      if (token) {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret')
        if (payload?.sub) createdByUserId = Number(payload.sub)
        // We don't have name field reliably; use email as display fallback
        if (payload?.email) createdByName = String(payload.email)
        else if (payload?.name) createdByName = String(payload.name)
      }
    } catch {}
    // Fallbacks: custom headers or body
    if (createdByUserId == null) {
      const hdrUserId = req.headers['x-user-id']
      if (hdrUserId != null && hdrUserId !== '') createdByUserId = Number(hdrUserId)
    }
    if (!createdByName) {
      const hdrName = req.headers['x-user-name'] || req.headers['x-user-email']
      if (hdrName) createdByName = String(hdrName)
    }
    if (createdByUserId == null && (req.body?.createdByUserId != null)) createdByUserId = Number(req.body.createdByUserId)
    if (!createdByName && req.body?.createdByName) createdByName = String(req.body.createdByName)
    if (!createdByName) createdByName = 'Unknown'
    await conn.beginTransaction()
    const ts = new Date(); const pad = (n)=>String(n).padStart(2,'0')
    const transactionCode = `TXN-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}-${Math.random().toString(36).slice(2,6).toUpperCase()}`
    // Insert header
    const [hdr] = await conn.execute(`
      INSERT INTO transfer_txn (transaction_code, from_outlet_id, to_outlet_id, priority, note, status, created_at, created_by_user_id, created_by_name)
      VALUES (:transactionCode, :fromOutletId, :toOutletId, :priority, :note, 'Pending', NOW(), :createdByUserId, :createdByName)
    `, { transactionCode, fromOutletId, toOutletId, priority, note, createdByUserId, createdByName })
    const txnId = hdr.insertId
    // Insert lines
    for (let i=0;i<items.length;i+=1) {
      let { itemId, itemCode, stockNo, qty } = items[i] || {}
      qty = Number(qty)
      if ((!itemId && !itemCode) || !Number.isFinite(qty) || qty <= 0) {
        // Try stockNo fallback if provided
        if (stockNo) {
          const [rowsByStock] = await conn.execute(`SELECT id FROM item_master WHERE stock_id = :stockNo OR stock_no = :stockNo LIMIT 1`, { stockNo: String(stockNo) })
          if (rowsByStock[0]?.id) {
            itemId = rowsByStock[0].id
          }
        }
        if ((!itemId && !itemCode) || !Number.isFinite(qty) || qty <= 0) {
          throw new Error(`Invalid row at index ${i}`)
        }
      }
      if (!itemId && itemCode) {
        const [rows] = await conn.execute(`SELECT id FROM item_master WHERE item_code = :code LIMIT 1`, { code: String(itemCode) })
        if (!rows[0]?.id) throw new Error(`Item not found for code: ${itemCode}`)
        itemId = rows[0].id
      }
      await conn.execute(`
        INSERT INTO transfer_txn_lines (txn_id, item_id, qty)
        VALUES (:txnId, :itemId, :qty)
      `, { txnId, itemId, qty })

      // Mirror into transfer_master for reporting aligned with UI
      try {
        const [itRows] = await conn.execute(`SELECT stock_id AS stockNo, size, dealer_price AS dealerPrice FROM item_master WHERE id = :id LIMIT 1`, { id: itemId })
        const it = itRows?.[0] || {}
        const dp = it?.dealerPrice != null ? Number(it.dealerPrice) : null
        const total = dp != null ? (dp * qty) : null
        await conn.execute(`
          INSERT INTO transfer_master (
            transaction_txn_id, transaction_code, from_outlet_id, to_outlet_id, item_id, date, qty, stock_no, size, dealer_price, total_price, status, created_at
          ) VALUES (
            :txnId, :transactionCode, :fromOutletId, :toOutletId, :itemId, CURDATE(), :qty, :stockNo, :size, :dealerPrice, :totalPrice, 'Pending', NOW()
          )
        `, {
          txnId, transactionCode, fromOutletId: fromOutletId ?? null, toOutletId, itemId, qty,
          stockNo: it?.stockNo || null,
          size: it?.size != null ? Number(it.size) : null,
          dealerPrice: dp,
          totalPrice: total,
        })
      } catch (eMirror) {
        // best-effort: do not fail main transaction
      }
    }
    await conn.commit()
    res.status(201).json({ id: txnId, transactionCode, itemCount: items.length, status: 'Pending', createdByUserId, createdByName })
  } catch (err) {
    await conn.rollback()
    console.error('POST /transfers/requests error', err)
    res.status(500).json({ message: err?.sqlMessage || err?.message || 'Server error' })
  } finally { conn.release() }
})

// GET /api/transfers/requests -> list transactions with aggregates
router.get('/requests', async (req, res) => {
  try {
    const sql = `
      SELECT t.id, t.transaction_code AS transactionCode, t.from_outlet_id AS fromOutletId, t.to_outlet_id AS toOutletId,
             t.priority, t.note, t.status, t.created_at AS createdAt, t.updated_at AS updatedAt,
             COALESCE(u.email, t.created_by_name) AS createdBy,
             COUNT(l.id) AS itemCount, COALESCE(SUM(l.qty),0) AS totalQty
      FROM transfer_txn t
      LEFT JOIN transfer_txn_lines l ON l.txn_id = t.id
      LEFT JOIN users u ON u.id = t.created_by_user_id
      GROUP BY t.id
      ORDER BY t.id DESC
    `
    const rows = await query(sql, {})
    res.json(rows)
  } catch (err) {
    // If tables don't exist yet, return empty list to keep UI functional
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      console.warn('GET /transfers/requests: tables missing, returning empty list')
      return res.json([])
    }
    console.error('GET /transfers/requests error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/transfers?fromOutletId=&toOutletId=
router.get('/', async (req, res) => {
  try {
    const { fromOutletId, toOutletId } = req.query || {}
    const where = []
    const params = {}
    if (fromOutletId) { where.push('t.from_outlet_id = :fromOutletId'); params.fromOutletId = Number(fromOutletId) }
    if (toOutletId) { where.push('t.to_outlet_id = :toOutletId'); params.toOutletId = Number(toOutletId) }
    const sql = `
      SELECT 
        t.id,
        t.transaction_code AS transactionCode,
        t.date,
        t.from_outlet_id AS fromOutletId,
        t.to_outlet_id AS toOutletId,
        t.qty,
        t.status,
        t.created_at AS createdAt,
        t.updated_at AS updatedAt
      FROM transfer_master t
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY t.id DESC
    `
    const rows = await query(sql, params)
    res.json(rows)
  } catch (err) {
    console.error('GET /transfers error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/transfers
router.post('/', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    let { fromOutletId, toOutletId, date, qty, itemId, itemCode } = req.body || {}
    fromOutletId = Number(fromOutletId)
    toOutletId = Number(toOutletId)
    qty = Number(qty)
    if (!fromOutletId || !toOutletId || !date || !qty || (!itemId && !itemCode)) {
      return res.status(400).json({ message: 'fromOutletId, toOutletId, date, qty and itemId or itemCode are required' })
    }

    await conn.beginTransaction()

    // Resolve item
    if (!itemId && itemCode) {
      const [rows] = await conn.execute(`SELECT id FROM item_master WHERE item_code = :code LIMIT 1`, { code: String(itemCode) })
      if (!rows[0]?.id) {
        await conn.rollback()
        return res.status(404).json({ message: 'Item not found for given itemCode' })
      }
      itemId = rows[0].id
    }
    // Validate item exists in item_master
    const [exists] = await conn.execute('SELECT id FROM item_master WHERE id = :id LIMIT 1', { id: itemId })
    if (!exists[0]) {
      await conn.rollback()
      return res.status(404).json({ message: 'Item not found' })
    }

    const [result] = await conn.execute(`
      INSERT INTO transfer_master (
        transaction_code, from_outlet_id, to_outlet_id, item_id, date, qty, status, created_at
      ) VALUES (
        :transactionCode, :fromOutletId, :toOutletId, :itemId, :date, :qty, 'Pending', NOW()
      )
    `, {
      transactionCode: req.body?.transactionCode || null,
      fromOutletId, toOutletId, itemId, date: String(date), qty,
    })

    const [rows] = await conn.execute(`
      SELECT id, transaction_code AS transactionCode, from_outlet_id AS fromOutletId, to_outlet_id AS toOutletId, item_id AS itemId,
             date, qty, status, created_at AS createdAt, updated_at AS updatedAt
      FROM transfer_master WHERE id = :id
    `, { id: result.insertId })
    await conn.commit()
    res.status(201).json(rows[0])
  } catch (err) {
    await conn.rollback()
    console.error('POST /transfers error', err)
    res.status(500).json({ message: err?.sqlMessage || err?.message || 'Server error' })
  } finally {
    conn.release()
  }
})

// PUT /api/transfers/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { status, remarks } = req.body || {}
    const allowed = ['Pending','Shipped','Received','Confirmed','Rejected']
    if (status && !allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' })
    await pool.execute(`UPDATE transfer_master SET status = COALESCE(:status, status), remarks = COALESCE(:remarks, remarks) WHERE id = :id`, { id, status: status || null, remarks: remarks ?? null })

    // If marking as Confirmed, add quantity to outlet_stock for destination outlet
    if (status === 'Confirmed') {
      // ensure outlet_stock table exists
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS outlet_stock (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          outlet_id INT UNSIGNED NOT NULL,
          item_id INT UNSIGNED NOT NULL,
          qty INT NOT NULL DEFAULT 0,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uniq_outlet_item (outlet_id, item_id),
          INDEX idx_outlet (outlet_id),
          INDEX idx_item (item_id),
          CONSTRAINT fk_outlet_stock_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
          CONSTRAINT fk_outlet_stock_item FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`)
      const rows = await query(`SELECT to_outlet_id AS toOutletId, item_id AS itemId, qty FROM transfer_master WHERE id = :id`, { id })
      const t = rows[0]
      if (t?.toOutletId && t?.itemId && t?.qty != null) {
        await pool.execute(`
          INSERT INTO outlet_stock (outlet_id, item_id, qty)
          VALUES (:outletId, :itemId, :qty)
          ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)
        `, { outletId: Number(t.toOutletId), itemId: Number(t.itemId), qty: Number(t.qty) })
      }
    }
    const rows = await query(`SELECT id, date, category, product, sku, stock_id AS stockId, size, colour,
                                     retail_price AS retailPrice, dealer_price AS dealerPrice, cost_price AS costPrice, last_purchase_price AS lastPurchasePrice,
                                     brand, description, sole, material,
                                     from_outlet_id AS fromOutletId, to_outlet_id AS toOutletId, qty, status, remarks, created_at AS createdAt
                              FROM transfer_master WHERE id = :id`, { id })
    res.json(rows[0] || { ok: true })
  } catch (err) {
    console.error('PUT /transfers/:id error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router

// BULK create transfers: POST /api/transfers/bulk
// Body: { fromOutletId, toOutletId, date, items: [{ itemId|itemCode, qty }...] }
router.post('/bulk', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    let { fromOutletId, toOutletId, date, items, transactionCode } = req.body || {}
    fromOutletId = Number(fromOutletId)
    toOutletId = Number(toOutletId)
    if (!fromOutletId || !toOutletId || !date || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'fromOutletId, toOutletId, date and items[] are required' })
    }
    await conn.beginTransaction()

    // Generate a unique transaction code if not provided
    if (!transactionCode) {
      const ts = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const code = `TXN-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}-${Math.random().toString(36).slice(2,6).toUpperCase()}`
      transactionCode = code
    }

    const created = []
    for (let i = 0; i < items.length; i += 1) {
      let { itemId, itemCode, qty } = items[i] || {}
      qty = Number(qty)
      if ((!itemId && !itemCode) || !Number.isFinite(qty) || qty <= 0) {
        throw new Error(`Invalid row at index ${i}`)
      }
      if (!itemId && itemCode) {
        const [rows] = await conn.execute(`SELECT id FROM item_master WHERE item_code = :code LIMIT 1`, { code: String(itemCode) })
        if (!rows[0]?.id) throw new Error(`Item not found for code: ${itemCode}`)
        itemId = rows[0].id
      }
      const [ins] = await conn.execute(`
        INSERT INTO transfer_master (
          transaction_code, from_outlet_id, to_outlet_id, item_id, date, qty, status, created_at
        ) VALUES (
          :transactionCode, :fromOutletId, :toOutletId, :itemId, :date, :qty, 'Pending', NOW()
        )
      `, {
        transactionCode, fromOutletId, toOutletId, itemId, date: String(date), qty,
      })
      created.push({ id: ins.insertId, itemId: Number(itemId), qty: Number(qty) })
    }

    await conn.commit()
    // Return minimal created rows with shared headers
    res.status(201).json({
      count: created.length,
      transactionCode,
      rows: created.map(r => ({
        id: r.id,
        fromOutletId,
        toOutletId,
        itemId: r.itemId,
        date: String(date),
        qty: r.qty,
        status: 'Pending',
      })),
    })
  } catch (err) {
    await conn.rollback()
    console.error('POST /transfers/bulk error', err)
    res.status(500).json({ message: err?.sqlMessage || err?.message || 'Server error' })
  } finally {
    conn.release()
  }
})

// GET /api/transfers/grouped - one row per transaction_code with aggregates
router.get('/grouped', async (req, res) => {
  try {
    const sql = `
      SELECT 
        COALESCE(transaction_code, CONCAT('TXN-', LPAD(id, 8, '0'))) AS transactionCode,
        MIN(id) AS firstId,
        MIN(date) AS date,
        MIN(from_outlet_id) AS fromOutletId,
        MIN(to_outlet_id) AS toOutletId,
        COUNT(*) AS itemCount,
        SUM(qty) AS totalQty,
        MIN(created_at) AS createdAt,
        MAX(updated_at) AS updatedAt
      FROM transfer_master
      GROUP BY transaction_code
      ORDER BY firstId DESC
    `
    const rows = await query(sql, {})
    res.json(rows)
  } catch (err) {
    console.error('GET /transfers/grouped error', err)
    res.status(500).json({ message: 'Server error' })
  }
})
