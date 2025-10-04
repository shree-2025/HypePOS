import express from 'express'
import { pool, query } from '../db.js'

const router = express.Router()

// GET /api/employees?outletId=123
router.get('/', async (req, res) => {
  try {
    const outletId = Number(req.query.outletId)
    if (!outletId) return res.status(400).json({ message: 'outletId is required' })
    const rows = await query(
      `SELECT id, outlet_id AS outletId, name, email, phone, active, created_at AS createdAt, updated_at AS updatedAt
       FROM employees WHERE outlet_id = :outletId ORDER BY id DESC`,
      { outletId }
    )
    res.json(rows)
  } catch (err) {
    console.error('GET /employees error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/employees
router.post('/', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const { outletId, name, email, phone } = req.body || {}
    if (!outletId || !name) return res.status(400).json({ message: 'outletId and name are required' })

    await conn.beginTransaction()
    const [result] = await conn.execute(
      `INSERT INTO employees (outlet_id, name, email, phone, active, created_at) VALUES (:outletId, :name, :email, :phone, 1, NOW())`,
      { outletId: Number(outletId), name, email: email || null, phone: phone || null }
    )
    const [rows] = await conn.execute(
      `SELECT id, outlet_id AS outletId, name, email, phone, active, created_at AS createdAt, updated_at AS updatedAt FROM employees WHERE id = :id`,
      { id: result.insertId }
    )
    await conn.commit()
    res.status(201).json(rows[0])
  } catch (err) {
    await conn.rollback()
    console.error('POST /employees error', err)
    res.status(500).json({ message: err?.sqlMessage || err?.message || 'Server error' })
  } finally {
    conn.release()
  }
})

// PUT /api/employees/:id
router.put('/:id', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const id = Number(req.params.id)
    const { name, email, phone, active } = req.body || {}
    await conn.beginTransaction()
    await conn.execute(
      `UPDATE employees SET 
        name = COALESCE(:name, name),
        email = COALESCE(:email, email),
        phone = COALESCE(:phone, phone),
        active = COALESCE(:active, active),
        updated_at = NOW()
       WHERE id = :id`,
      { id, name, email, phone, active: typeof active === 'boolean' ? (active ? 1 : 0) : null }
    )
    const [rows] = await conn.execute(
      `SELECT id, outlet_id AS outletId, name, email, phone, active, created_at AS createdAt, updated_at AS updatedAt FROM employees WHERE id = :id`,
      { id }
    )
    await conn.commit()
    res.json(rows[0])
  } catch (err) {
    await conn.rollback()
    console.error('PUT /employees/:id error', err)
    res.status(500).json({ message: err?.sqlMessage || err?.message || 'Server error' })
  } finally {
    conn.release()
  }
})

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    await pool.execute(`DELETE FROM employees WHERE id = :id`, { id })
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /employees/:id error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
