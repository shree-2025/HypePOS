import express from 'express'
import jwt from 'jsonwebtoken'
import { pool, query } from '../db.js'

const router = express.Router()

async function resolveOutletIdFromRequest(req, trxOrPool) {
  // 1) explicit outletId param
  let outletId = Number(req.query.outletId || req.body?.outletId)
  if (outletId) return outletId

  // 2) adminEmail param -> find outlet by manager email
  const adminEmail = req.query.adminEmail || req.body?.adminEmail
  if (adminEmail) {
    const rows = await query(`SELECT id FROM outlets WHERE email = :email LIMIT 1`, { email: String(adminEmail) })
    if (rows[0]?.id) return Number(rows[0].id)
  }

  // 3) JWT Authorization -> find outlet by user_id
  const auth = req.headers['authorization'] || ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (m) {
    try {
      const token = m[1]
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret')
      const uid = Number(payload?.sub)
      if (uid) {
        const useConn = trxOrPool || pool
        const [rows] = await useConn.execute(`SELECT id FROM outlets WHERE user_id = :uid LIMIT 1`, { uid })
        const [[row]] = [rows]
        if (row?.id) return Number(row.id)
      }
    } catch {}
  }

  return 0
}

// GET /api/employees?outletId=123
router.get('/', async (req, res) => {
  try {
    const outletId = await resolveOutletIdFromRequest(req)
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
    let { name, email, phone } = req.body || {}
    let outletId = await resolveOutletIdFromRequest(req, conn)
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
