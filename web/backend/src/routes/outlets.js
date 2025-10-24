import express from 'express'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import { pool, query } from '../db.js'

const router = express.Router()

function randomPassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%'
  let out = ''
  for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length))
  return out
}

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

// POST /api/outlets/reset-password
// Body: { email }
router.post('/reset-password', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const { email } = req.body || {}
    if (!email) return res.status(400).json({ message: 'email is required' })

    await conn.beginTransaction()
    const [rows] = await conn.execute(`SELECT id, role FROM users WHERE email = :email LIMIT 1`, { email })
    if (!rows[0]) {
      await conn.rollback()
      return res.status(404).json({ message: 'User not found' })
    }
    if (rows[0].role !== 'admin') {
      await conn.rollback()
      return res.status(400).json({ message: 'User is not an outlet admin' })
    }

    const tempPassword = randomPassword(10)
    const rounds = Number(process.env.BCRYPT_ROUNDS || 10)
    const passwordHash = await bcrypt.hash(tempPassword, rounds)
    await conn.execute(`UPDATE users SET password_hash = :passwordHash, must_change_password = 1 WHERE email = :email`, { passwordHash, email })

    // Send email
    try {
      const transporter = createTransport()
      if (transporter) {
        const from = process.env.SMTP_FROM || (process.env.MAIL_FROM_NAME && process.env.MAIL_FROM_ADDRESS
          ? `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`
          : (process.env.MAIL_FROM_ADDRESS || 'no-reply@hypepos.local'))
        await transporter.sendMail({
          from,
          to: email,
          subject: 'HypePOS Password Reset',
          text: `Your password has been reset.\nLogin: ${email}\nTemporary Password: ${tempPassword}\nPlease sign in and change your password.`,
          html: `<p>Your password has been reset.</p><p><b>Login:</b> ${email}<br/><b>Temporary Password:</b> ${tempPassword}</p><p>Please sign in and change your password.</p>`,
        })
      }
    } catch (e) {
      console.warn('Email send failed (reset):', e?.message || e)
      // continue
    }

    await conn.commit()
    res.json({ ok: true })
  } catch (err) {
    await conn.rollback()
    console.error('POST /outlets/reset-password error', err)
    const message = err?.sqlMessage || err?.message || 'Server error'
    res.status(500).json({ message })
  } finally {
    conn.release()
  }
})

// GET /api/outlets
router.get('/', async (req, res) => {
  try {
    const { email, userId } = req.query || {}
    const where = []
    const params = {}
    if (email) { where.push('email = :email'); params.email = String(email) }
    if (userId) { where.push('user_id = :userId'); params.userId = Number(userId) }
    const sql = `SELECT id, code, name, manager_name AS managerName, email, location, created_at AS createdAt
                 FROM outlets ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`
    const rows = await query(sql, params)
    res.json(rows)
  } catch (err) {
    console.error('GET /outlets error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/outlets
router.post('/', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const { code, name, managerName, email, location } = req.body || {}
    if (!code || !name || !managerName || !email) {
      return res.status(400).json({ message: 'code, name, managerName, email are required' })
    }

    // enforce uniqueness
    const existing = await query(`SELECT id FROM outlets WHERE code = :code OR email = :email LIMIT 1`, { code, email })
    if (existing[0]) return res.status(409).json({ message: 'Outlet with same code or email already exists' })

    const rounds = Number(process.env.BCRYPT_ROUNDS || 10)
    let tempPassword = null
    let passwordHash = null

    await conn.beginTransaction()

    // create or reuse user in a single query
    tempPassword = randomPassword(10)
    passwordHash = await bcrypt.hash(tempPassword, rounds)
    const [userResult] = await conn.execute(
      `INSERT INTO users (email, password_hash, role, must_change_password, created_at)
       VALUES (:email, :passwordHash, 'admin', 1, NOW())
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      { email, passwordHash }
    )
    const userId = userResult.insertId
    const isNewUser = userResult.affectedRows === 1
    if (!isNewUser) {
      // do not reveal a new temp password for existing accounts
      tempPassword = null
      // ensure existing account has admin role to allow login as Outlet Admin
      await conn.execute(`UPDATE users SET role = 'admin' WHERE id = :userId`, { userId })
    }

    // create outlet
    const [outletResult] = await conn.execute(
      `INSERT INTO outlets (code, name, manager_name, email, location, user_id, created_at) 
       VALUES (:code, :name, :managerName, :email, :location, :userId, NOW())`,
      { code, name, managerName, email, location: location || null, userId }
    )

    // send email (best effort)
    try {
      const transporter = createTransport()
      if (transporter) {
        const from = process.env.SMTP_FROM || (process.env.MAIL_FROM_NAME && process.env.MAIL_FROM_ADDRESS
          ? `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`
          : (process.env.MAIL_FROM_ADDRESS || 'no-reply@hypepos.local'))

        const subject = 'Your HypePOS Outlet Access'
        const baseHtml = `<p>Hello ${managerName},</p>
                 <p>Your outlet has been created.</p>`
        const credsHtml = tempPassword
          ? `<p><b>Login:</b> ${email}<br/><b>Temporary Password:</b> ${tempPassword}</p>
             <p>Please sign in and change your password.</p>`
          : `<p>Your account already exists with <b>${email}</b>. Use your existing password to sign in.</p>`
        const text = tempPassword
          ? `Hello ${managerName},\n\nYour outlet has been created.\nLogin: ${email}\nTemporary Password: ${tempPassword}\n\nPlease sign in and change your password.`
          : `Hello ${managerName},\n\nYour outlet has been created and is linked to your existing account (${email}). Use your existing password to sign in.`

        await transporter.sendMail({
          from,
          to: email,
          subject,
          text,
          html: `${baseHtml}${credsHtml}`,
        })
      } else {
        const env = process.env
        console.log('SMTP not configured; skipping email for', email, {
          MAIL_HOST: env.MAIL_HOST,
          MAIL_PORT: env.MAIL_PORT,
          MAIL_USER_SET: Boolean(env.MAIL_USERNAME),
          SMTP_HOST: env.SMTP_HOST,
          SMTP_PORT: env.SMTP_PORT,
          SMTP_USER_SET: Boolean(env.SMTP_USER),
        })
      }
    } catch (mailErr) {
      console.warn('Email send failed:', mailErr?.message || mailErr)
      // continue without failing the request
    }

    await conn.commit()

    const [rows] = await conn.execute(
      `SELECT id, code, name, manager_name AS managerName, email, location, created_at AS createdAt FROM outlets WHERE id = :id`,
      { id: outletResult.insertId }
    )
    res.status(201).json(rows[0])
  } catch (err) {
    await conn.rollback()
    console.error('POST /outlets error', err)
    const message = err?.sqlMessage || err?.message || 'Server error'
    const code = err?.code || undefined
    res.status(500).json({ message, code })
  } finally {
    conn.release()
  }
})

export default router
