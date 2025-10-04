import express from 'express'
import { query, pool } from '../db.js'

const router = express.Router()

// GET /api/items?search=&category=&size=&color=
router.get('/', async (req, res) => {
  try {
    const { search = '', category, size, color } = req.query
    const where = []
    const params = {}
    if (search) { where.push('(name LIKE :q OR item_code LIKE :q OR brand LIKE :q)'); params.q = `%${search}%` }
    if (category) { where.push('category = :category'); params.category = category }
    if (size) { where.push('size = :size'); params.size = Number(size) }
    if (color) { where.push('(color_name = :color OR color_code = :color)'); params.color = color }
    const sql = `SELECT id, name, category, brand, color_name AS colorName, color_code AS colorCode, size, item_code AS itemCode, stock_id AS stockId, created_at AS createdAt, updated_at AS updatedAt
                 FROM items ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`
    const rows = await query(sql, params)
    res.json(rows)
  } catch (err) {
    console.error('GET /items error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/items
router.post('/', async (req, res) => {
  try {
    const { name, category, brand, colorName, colorCode, size } = req.body || {}
    if (!name || !category || !brand || size == null) {
      return res.status(400).json({ message: 'name, category, brand, size are required' })
    }
    const insertSql = `INSERT INTO items (name, category, brand, color_name, color_code, size, created_at, updated_at)
                 VALUES (:name, :category, :brand, :colorName, :colorCode, :size, NOW(), NOW())`
    const [result] = await pool.execute(insertSql, { name, category, brand, colorName: colorName || null, colorCode: colorCode || null, size: Number(size) })
    const [rows] = await pool.execute(
      `SELECT id, name, category, brand, color_name AS colorName, color_code AS colorCode, size, item_code AS itemCode, stock_id AS stockId, created_at AS createdAt, updated_at AS updatedAt FROM items WHERE id = :id`,
      { id: result.insertId }
    )
    res.status(201).json(rows[0] || { id: result.insertId })
  } catch (err) {
    console.error('POST /items error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/items/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { name, category, brand, colorName, colorCode, size } = req.body || {}
    const sql = `UPDATE items SET 
      name = COALESCE(:name, name),
      category = COALESCE(:category, category),
      brand = COALESCE(:brand, brand),
      color_name = COALESCE(:colorName, color_name),
      color_code = COALESCE(:colorCode, color_code),
      size = COALESCE(:size, size),
      updated_at = NOW()
      WHERE id = :id`
    await pool.execute(sql, { id, name, category, brand, colorName, colorCode, size: size != null ? Number(size) : null })
    const [rows] = await pool.execute(
      `SELECT id, name, category, brand, color_name AS colorName, color_code AS colorCode, size, item_code AS itemCode, stock_id AS stockId, created_at AS createdAt, updated_at AS updatedAt FROM items WHERE id = :id`,
      { id }
    )
    res.json(rows[0] || { ok: true })
  } catch (err) {
    console.error('PUT /items error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    await pool.execute('DELETE FROM items WHERE id = :id', { id })
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /items error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
