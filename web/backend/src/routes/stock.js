import express from 'express'
import { pool, query } from '../db.js'

const router = express.Router()

async function ensureTable() {
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
}

router.use(async (_req, _res, next) => { try { await ensureTable() } catch {} next() })

// GET /api/stock?outletId=123
router.get('/', async (req, res) => {
  try {
    const outletId = Number(req.query.outletId)
    if (!outletId) return res.status(400).json({ message: 'outletId is required' })
    const rows = await query(`
      SELECT s.id, s.outlet_id AS outletId, s.item_id AS itemId, s.qty,
             im.item_code_desc AS name,
             im.description AS category,
             b.brand_name AS brand,
             c.color_desc AS colour,
             im.size,
             im.item_code AS itemCode,
             im.retail_price AS retailPrice
      FROM outlet_stock s
      JOIN item_master im ON im.id = s.item_id
      LEFT JOIN brand b ON b.id = im.brand_id
      LEFT JOIN colours c ON c.id = im.color_id
      WHERE s.outlet_id = :outletId
      ORDER BY im.item_code_desc ASC
    `, { outletId })
    res.json(rows)
  } catch (err) {
    console.error('GET /stock error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
