import express from 'express'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import { pool, query } from '../db.js'

const router = express.Router()

function createTransport() {
  const env = process.env
  // Support both SMTP_* and MAIL_* (Laravel-style) variables
  const host = (env.SMTP_HOST || env.MAIL_HOST || '').trim()
  const port = Number((env.SMTP_PORT || env.MAIL_PORT || '587').toString().trim())
  const user = (env.SMTP_USER || env.MAIL_USERNAME || '').trim()
  const pass = (env.SMTP_PASS || env.MAIL_PASSWORD || '').trim()
  const enc = (env.MAIL_ENCRYPTION || '').toLowerCase().trim()

  if (!host) return null

  const secure = port === 465 || enc === 'ssl' || enc === 'smtps'
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    requireTLS: enc === 'tls' || (!secure && port === 587),
    // Allow sending even if there is a self-signed certificate in the chain
    tls: { rejectUnauthorized: false },
  })
  return transporter
}

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

// GET /api/employees?outletId=123&role=cashier&status=active&q=john&from=2024-01-01&to=2024-12-31
router.get('/', async (req, res) => {
  try {
    const outletId = await resolveOutletIdFromRequest(req)
    if (!outletId) return res.status(400).json({ message: 'outletId is required' })
    const { role, status, q, from, to } = req.query
    const parts = [`outlet_id = :outletId`]
    const params = { outletId }
    if (role) { parts.push(`LOWER(role) = LOWER(:role)`); params.role = String(role) }
    if (status) {
      const st = String(status).toLowerCase()
      if (st === 'active' || st === 'inactive') { parts.push(`active = :active`); params.active = st === 'active' ? 1 : 0 }
    }
    if (q) { parts.push(`(name LIKE :q OR email LIKE :q OR phone LIKE :q)`); params.q = `%${q}%` }
    if (from) { parts.push(`DATE(join_date) >= DATE(:from)`); params.from = from }
    if (to) { parts.push(`DATE(join_date) <= DATE(:to)`); params.to = to }
    const where = parts.length ? `WHERE ${parts.join(' AND ')}` : ''
    const sql = `SELECT id, outlet_id AS outletId, name, role, email, phone, join_date AS joinDate, active, created_at AS createdAt, updated_at AS updatedAt
                 FROM employees ${where} ORDER BY id DESC`
    const rows = await query(sql, params)
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
    let { name, email, phone, role, joinDate, active } = req.body || {}
    let outletId = await resolveOutletIdFromRequest(req, conn)
    if (!outletId || !name) return res.status(400).json({ message: 'outletId and name are required' })

    await conn.beginTransaction()
    const normRole = (role != null && String(role).trim() !== '') ? String(role).trim() : null
    const normJoin = (joinDate != null && String(joinDate).trim() !== '') ? String(joinDate).trim() : null
    const [result] = await conn.execute(
      `INSERT INTO employees (outlet_id, name, role, email, phone, join_date, active, created_at)
       VALUES (:outletId, :name, :role, :email, :phone,
               CASE WHEN :joinDate IS NOT NULL AND :joinDate <> '' THEN DATE(:joinDate) ELSE CURDATE() END,
               COALESCE(:active, 1), NOW())`,
      { outletId: Number(outletId), name, role: normRole, email: email || null, phone: phone || null, joinDate: normJoin, active: typeof active === 'boolean' ? (active ? 1 : 0) : null }
    )
    const [rows] = await conn.execute(
      `SELECT id, outlet_id AS outletId, name, role, email, phone, join_date AS joinDate, active, created_at AS createdAt, updated_at AS updatedAt FROM employees WHERE id = :id`,
      { id: result.insertId }
    )
    const [outletRows] = await conn.execute(
      `SELECT name, code, email AS managerEmail FROM outlets WHERE id = :id LIMIT 1`,
      { id: Number(outletId) }
    )
    await conn.commit()
    const employee = rows[0]

    // Attempt to send email (non-blocking for API success)
    let emailSent = false
    try {
      if (employee?.email) {
        const transporter = createTransport()
        if (!transporter) {
          throw new Error('SMTP not configured')
        }
        const outlet = outletRows?.[0] || {}
        const from = process.env.SMTP_FROM || process.env.SMTP_USER
        const subject = `Welcome to HypePOS${outlet?.name ? ' - ' + outlet.name : ''}`
        const html = `
          <p>Hi ${employee.name},</p>
          <p>You have been added as an employee${outlet?.name ? ` at <strong>${outlet.name}</strong>` : ''}.</p>
          <ul>
            <li><strong>Outlet:</strong> ${outlet?.name || 'N/A'} ${outlet?.code ? '(' + outlet.code + ')' : ''}</li>
            <li><strong>Role:</strong> ${employee.role || '-'}</li>
            <li><strong>Name:</strong> ${employee.name}</li>
            <li><strong>Email:</strong> ${employee.email}</li>
            <li><strong>Phone:</strong> ${employee.phone || '-'}</li>
            <li><strong>Join Date:</strong> ${employee.joinDate || '-'}</li>
          </ul>
          <p>If this was not expected, please contact your manager.</p>
          <p>— HypePOS</p>
        `
        await transporter.sendMail({ from, to: employee.email, subject, html })
        emailSent = true
      }
    } catch (mailErr) {
      console.error('Employee email send failed:', mailErr)
    }

    res.status(201).json({ ...employee, emailSent })
  } catch (err) {
    try {
      await conn.rollback()
    } catch (rollbackErr) {
      console.error('POST /employees rollback error', rollbackErr)
    }
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
    const { name, email, phone, active, role, joinDate } = req.body || {}
    await conn.beginTransaction()
    await conn.execute(
      `UPDATE employees SET 
        name = COALESCE(:name, name),
        email = COALESCE(:email, email),
        phone = COALESCE(:phone, phone),
        role = COALESCE(:role, role),
        join_date = COALESCE(CASE WHEN :joinDate IS NOT NULL AND :joinDate <> '' THEN DATE(:joinDate) ELSE NULL END, join_date),
        active = COALESCE(:active, active),
        updated_at = NOW()
       WHERE id = :id`,
      { id, name, email, phone, role: (role != null && String(role).trim() !== '') ? String(role).trim() : null,
        joinDate: (joinDate != null && String(joinDate).trim() !== '') ? String(joinDate).trim() : null,
        active: typeof active === 'boolean' ? (active ? 1 : 0) : null }
    )
    const [rows] = await conn.execute(
      `SELECT id, outlet_id AS outletId, name, role, email, phone, join_date AS joinDate, active, created_at AS createdAt, updated_at AS updatedAt FROM employees WHERE id = :id`,
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
