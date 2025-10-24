import express from 'express'
import { pool, query } from '../db.js'

const router = express.Router()

async function ensureTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS brand (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      brand_name VARCHAR(150) NOT NULL,
      category VARCHAR(150) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_brand_category (brand_name, category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
  // Try to migrate from old unique index if it exists
  try { await pool.execute('ALTER TABLE brand DROP INDEX uniq_brand_name') } catch {}
  try { await pool.execute('ALTER TABLE brand ADD UNIQUE INDEX uniq_brand_category (brand_name, category)') } catch {}
}

router.use(async (_req, _res, next) => { try { await ensureTable() } catch {} next() })

// Bulk upload brands
// Body: { records: Array<{ brandName: string, category?: string }> }
router.post('/bulk', async (req, res) => {
  try {
    const { records } = req.body || {}
    if (!Array.isArray(records) || !records.length) {
      return res.status(400).json({ message: 'records[] is required' })
    }
    const inserted = []
    const errors = []
    for (const [idx, r] of records.entries()) {
      try {
        const brandName = String(r?.brandName || '').trim()
        const category = (r?.category || '').toString().trim() || null
        if (!brandName) throw new Error('brandName is required')
        const [dup] = await pool.execute(`
          SELECT id FROM brand 
          WHERE LOWER(brand_name) = LOWER(:bn)
            AND ((:cat IS NULL AND category IS NULL) OR LOWER(IFNULL(category,'')) = LOWER(IFNULL(:cat,'')))
          LIMIT 1
        `, { bn: brandName, cat: category })
        if (dup.length) throw new Error('duplicate')
        const [ins] = await pool.execute(`INSERT INTO brand (brand_name, category, created_at, updated_at) VALUES (:bn, :cat, NOW(), NOW())`, { bn: brandName, cat: category })
        const [row] = await pool.execute(`SELECT id, brand_name AS brandName, category, created_at AS createdAt, updated_at AS updatedAt FROM brand WHERE id = :id`, { id: ins.insertId })
        inserted.push(row[0] || { id: ins.insertId, brandName, category })
      } catch (e) {
        errors.push({ index: idx, message: e?.code === 'ER_DUP_ENTRY' ? 'duplicate' : (e?.message || 'invalid row') })
      }
    }
    res.status(207).json({ insertedCount: inserted.length, errorCount: errors.length, inserted, errors })
  } catch (e) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/brands
router.get('/', async (_req, res) => {
  try {
    const rows = await query(`SELECT id, brand_name AS brandName, category, created_at AS createdAt, updated_at AS updatedAt FROM brand ORDER BY id DESC`)
    res.json(rows)
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
})

// POST /api/brands
router.post('/', async (req, res) => {
  try {
    const brandName = String(req.body?.brandName || '').trim()
    if (!brandName) return res.status(400).json({ message: 'brandName is required' })

    // Accept either single category or categories[] array
    const categoriesInput = Array.isArray(req.body?.categories)
      ? req.body.categories
      : [req.body?.category]

    const categories = (categoriesInput || [])
      .map(c => (c ?? '').toString().trim())
      .filter((c, i, arr) => c !== '' && arr.indexOf(c) === i)

    // If no categories provided, insert one row with NULL category for the brand
    const toInsert = categories.length ? categories : [null]

    const inserted = []
    const duplicates = []
    for (const cat of toInsert) {
      const [dup] = await pool.execute(`
        SELECT id FROM brand 
        WHERE LOWER(brand_name) = LOWER(:bn)
          AND ((:cat IS NULL AND category IS NULL) OR LOWER(IFNULL(category,'')) = LOWER(IFNULL(:cat,'')))
        LIMIT 1
      `, { bn: brandName, cat })
      if (dup.length) { duplicates.push(cat); continue }
      const [ins] = await pool.execute(`INSERT INTO brand (brand_name, category, created_at, updated_at) VALUES (:bn, :cat, NOW(), NOW())`, { bn: brandName, cat })
      const [row] = await pool.execute(`SELECT id, brand_name AS brandName, category, created_at AS createdAt, updated_at AS updatedAt FROM brand WHERE id = :id`, { id: ins.insertId })
      inserted.push(row[0])
    }
    const status = inserted.length ? 201 : 409
    res.status(status).json({ inserted, duplicates })
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
})

// PUT /api/brands/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    const sets = []
    const params = { id }
    if (req.body?.brandName !== undefined) {
      const brandName = String(req.body.brandName || '').trim()
      if (!brandName) return res.status(400).json({ message: 'brandName is required' })
      params.bn = brandName
      // When changing brand name, ensure no duplicate for the same category on other row
      const [dup] = await pool.execute(`SELECT id FROM brand WHERE LOWER(brand_name) = LOWER(:bn) AND id <> :id AND ((:cat IS NULL AND category IS NULL) OR LOWER(IFNULL(category,'')) = LOWER(IFNULL(:cat,''))) LIMIT 1`, { bn: brandName, id, cat: req.body?.category ?? null })
      if (dup.length) return res.status(409).json({ message: 'Brand+Category already exists' })
      params.bn = brandName
      sets.push('brand_name = :bn')
    }
    if (req.body?.category !== undefined) {
      params.cat = (req.body.category || '').toString().trim() || null
      sets.push('category = :cat')
    }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' })
    await pool.execute(`UPDATE brand SET ${sets.join(', ')}, updated_at = NOW() WHERE id = :id`, params)
    const [row] = await pool.execute(`SELECT id, brand_name AS brandName, category, created_at AS createdAt, updated_at AS updatedAt FROM brand WHERE id = :id`, { id })
    res.json(row[0] || { id })
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
})

// DELETE /api/brands/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    // Prevent deletion if any item references this brand
    // First check by brand_id in item_master
    const [cntRows] = await pool.execute('SELECT COUNT(1) AS cnt FROM item_master WHERE brand_id = :id', { id })
    const cnt = Number(cntRows?.[0]?.cnt || 0)
    if (cnt > 0) {
      return res.status(409).json({ message: 'Cannot delete: this brand is used by items in Item Master.' })
    }
    // Legacy safety: also check by name+category through join (normalized schema)
    try {
      const [b] = await pool.execute('SELECT brand_name, category FROM brand WHERE id = :id', { id })
      const bn = b?.[0]?.brand_name; const cat = b?.[0]?.category ?? null
      if (bn) {
        const [legacy] = await pool.execute(
          `SELECT COUNT(1) AS cnt
             FROM item_master i
             JOIN brand b2 ON b2.id = i.brand_id
            WHERE LOWER(b2.brand_name) = LOWER(:bn)
              AND ((:cat IS NULL AND b2.category IS NULL) OR LOWER(IFNULL(b2.category,'')) = LOWER(IFNULL(:cat,'')))`,
          { bn, cat }
        )
        if (Number(legacy?.[0]?.cnt || 0) > 0) {
          return res.status(409).json({ message: 'Cannot delete: this brand is used by items in Item Master.' })
        }
      }
    } catch {}
    await pool.execute('DELETE FROM brand WHERE id = :id', { id })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ message: 'Server error' }) }
})

export default router
