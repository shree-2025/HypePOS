import express from 'express'
import { pool, query } from '../db.js'

const router = express.Router()

let COL_CODE = 'color_code'
let COL_DESC = 'color_desc'
let HAS_CREATED_AT = true
let HAS_UPDATED_AT = true

async function ensureTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS colours (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      color_code INT NOT NULL,
      color_desc VARCHAR(190) NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_colour_code (color_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
}

async function resolveColourColumns() {
  try {
    const [rows] = await pool.execute(
      `SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS



       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'colours'`
    )
    const names = new Set(rows.map((r) => r.name))
    // Prefer American spelling if present
    if (names.has('color_code')) COL_CODE = 'color_code'
    else if (names.has('code')) COL_CODE = 'code'
    else if (names.has('colour_code')) COL_CODE = 'colour_code'
    // Description column
    if (names.has('color_desc')) COL_DESC = 'color_desc'
    else if (names.has('description')) COL_DESC = 'description'
    else if (names.has('desc')) COL_DESC = 'desc'
    else if (names.has('colour_desc')) COL_DESC = 'colour_desc'
    HAS_CREATED_AT = names.has('created_at')
    HAS_UPDATED_AT = names.has('updated_at')
  } catch {}
}

router.use(async (_req, _res, next) => { try { await ensureTable(); await resolveColourColumns() } catch {} next() })

// POST /api/colours/bulk -> bulk insert colours
// Body: { records: Array<{ colorCode: string|number, colorDesc?: string }> }
router.post('/bulk', async (req, res) => {
  try {
    const { records } = req.body || {}
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'records[] is required' })
    }
    const inserted = []
    const errors = []
    // Insert sequentially to honor uniqueness and report per-row errors
    // eslint-disable-next-line no-restricted-syntax
    for (const [idx, r] of records.entries()) {
      try {
        const codeStr = String(r?.colorCode ?? '').trim()
        if (!/^\d+$/.test(codeStr)) throw new Error('colorCode must be numeric')
        const codeNum = Number(codeStr)
        const desc = (r?.colorDesc || '').toString().trim() || null
        if (desc) {
          const [dupRows] = await pool.execute(
            `SELECT id FROM colours WHERE LOWER(${COL_DESC}) = LOWER(:desc) LIMIT 1`,
            { desc }
          )
          if (dupRows.length) throw new Error('duplicate description')
        }
        const insertSql = HAS_CREATED_AT || HAS_UPDATED_AT
          ? `INSERT INTO colours (${COL_CODE}, ${COL_DESC}${HAS_CREATED_AT ? ', created_at' : ''}${HAS_UPDATED_AT ? ', updated_at' : ''})
             VALUES (:code, :desc${HAS_CREATED_AT ? ', NOW()' : ''}${HAS_UPDATED_AT ? ', NOW()' : ''})`
          : `INSERT INTO colours (${COL_CODE}, ${COL_DESC}) VALUES (:code, :desc)`
        const [result] = await pool.execute(insertSql, { code: codeNum, desc })
        const [rows] = await pool.execute(
          `SELECT id, ${COL_CODE} AS colorCode, ${COL_DESC} AS colorDesc,
            ${HAS_CREATED_AT ? 'created_at' : 'NULL'} AS createdAt,
            ${HAS_UPDATED_AT ? 'updated_at' : 'NULL'} AS updatedAt
           FROM colours WHERE id = :id`,
          { id: result.insertId }
        )
        inserted.push(rows[0] || { id: result.insertId, colorCode: codeNum, colorDesc: desc })
      } catch (e) {
        const msg = e?.code === 'ER_DUP_ENTRY' ? 'duplicate color code' : (e?.message || 'invalid row')
        errors.push({ index: idx, message: msg })
      }
    }
    res.status(207).json({ insertedCount: inserted.length, errorCount: errors.length, inserted, errors })
  } catch (err) {
    console.error('POST /colours/bulk error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/colours -> list all colours
router.get('/', async (_req, res) => {
  try {
    const sql = `SELECT id,
      ${COL_CODE} AS colorCode,
      ${COL_DESC} AS colorDesc,
      ${HAS_CREATED_AT ? 'created_at' : 'NULL'} AS createdAt,
      ${HAS_UPDATED_AT ? 'updated_at' : 'NULL'} AS updatedAt
      FROM colours ORDER BY id DESC`
    const rows = await query(sql)
    res.json(rows)
  } catch (err) {
    console.error('GET /colours error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/colours -> add a new colour
// Body: { colorCode: number|string numeric, colorDesc: string }
router.post('/', async (req, res) => {
  try {
    let { colorCode, colorDesc } = req.body || {}
    if (colorCode == null || String(colorCode).trim() === '') {
      return res.status(400).json({ message: 'colorCode is required' })
    }
    // Only numeric values allowed
    const codeStr = String(colorCode).trim()
    if (!/^\d+$/.test(codeStr)) {
      return res.status(400).json({ message: 'colorCode must be numeric' })
    }
    const codeNum = Number(codeStr)
    colorDesc = (colorDesc || '').toString().trim()

    // Reject duplicate description (case-insensitive) when provided
    if (colorDesc) {
      const [dupRows] = await pool.execute(
        `SELECT id FROM colours WHERE LOWER(${COL_DESC}) = LOWER(:desc) LIMIT 1`,
        { desc: colorDesc }
      )
      if (dupRows.length) {
        return res.status(409).json({ message: 'Color description already exists' })
      }
    }

    const insertSql = HAS_CREATED_AT || HAS_UPDATED_AT
      ? `INSERT INTO colours (${COL_CODE}, ${COL_DESC}${HAS_CREATED_AT ? ', created_at' : ''}${HAS_UPDATED_AT ? ', updated_at' : ''})
         VALUES (:code, :desc${HAS_CREATED_AT ? ', NOW()' : ''}${HAS_UPDATED_AT ? ', NOW()' : ''})`
      : `INSERT INTO colours (${COL_CODE}, ${COL_DESC}) VALUES (:code, :desc)`
    const [result] = await pool.execute(insertSql, { code: codeNum, desc: colorDesc || null })

    const selectSql = `SELECT id,
      ${COL_CODE} AS colorCode,
      ${COL_DESC} AS colorDesc,
      ${HAS_CREATED_AT ? 'created_at' : 'NULL'} AS createdAt,
      ${HAS_UPDATED_AT ? 'updated_at' : 'NULL'} AS updatedAt
      FROM colours WHERE id = :id`
    const [rows] = await pool.execute(selectSql, { id: result.insertId })

    res.status(201).json(rows[0] || { id: result.insertId, colorCode: codeNum, colorDesc })
  } catch (err) {
    // Handle duplicate color_code if unique constraint exists
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Color code already exists' })
    }
    console.error('POST /colours error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router

// PUT /api/colours/:id -> update colour
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    let { colorCode, colorDesc } = req.body || {}

    // Build dynamic SQL based on provided fields
    const sets = []
    const params = { id }
    if (colorCode != null) {
      const codeStr = String(colorCode).trim()
      if (!/^\d+$/.test(codeStr)) {
        return res.status(400).json({ message: 'colorCode must be numeric' })
      }
      params.code = Number(codeStr)
      sets.push(`${COL_CODE} = :code`)
    }
    if (colorDesc !== undefined) {
      params.desc = (colorDesc || '').toString().trim() || null
      if (params.desc) {
        // Check for duplicate description excluding this id
        const [dupRows] = await pool.execute(
          `SELECT id FROM colours WHERE LOWER(${COL_DESC}) = LOWER(:desc) AND id <> :id LIMIT 1`,
          { desc: params.desc, id }
        )
        if (dupRows.length) {
          return res.status(409).json({ message: 'Color description already exists' })
        }
      }
      sets.push(`${COL_DESC} = :desc`)
    }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' })

    const sql = `UPDATE colours SET ${sets.join(', ')}${HAS_UPDATED_AT ? ', updated_at = NOW()' : ''} WHERE id = :id`
    await pool.execute(sql, params)

    const selectSql = `SELECT id,
      ${COL_CODE} AS colorCode,
      ${COL_DESC} AS colorDesc,
      ${HAS_CREATED_AT ? 'created_at' : 'NULL'} AS createdAt,
      ${HAS_UPDATED_AT ? 'updated_at' : 'NULL'} AS updatedAt
      FROM colours WHERE id = :id`
    const [rows] = await pool.execute(selectSql, { id })
    res.json(rows[0] || { id })
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Color code already exists' })
    }
    console.error('PUT /colours/:id error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/colours/:id -> delete colour
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: 'Invalid id' })
    // Protect: if any item references this colour, block deletion
    try {
      const [cntRows] = await pool.execute('SELECT COUNT(1) AS cnt FROM items WHERE color_id = :id', { id })
      const cnt = Number(cntRows?.[0]?.cnt || 0)
      if (cnt > 0) {
        return res.status(409).json({ message: 'Cannot delete: this colour is used by items.' })
      }
    } catch {}
    await pool.execute('DELETE FROM colours WHERE id = :id', { id })
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /colours/:id error', err)
    res.status(500).json({ message: 'Server error' })
  }
})
