import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'

const router = express.Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body || {}
    if (!email || !password || !role) return res.status(400).json({ message: 'email, password, role are required' })

    const rows = await query('SELECT id, email, password_hash AS passwordHash, role, must_change_password AS mustChangePassword FROM users WHERE email = :email AND role = :role LIMIT 1', { email, role })
    const user = rows[0]
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const ok = await bcrypt.compare(String(password), user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

    const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' })
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role, mustChangePassword: Boolean(user.mustChangePassword) } })
  } catch (err) {
    console.error('Login error', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/auth/change-password
// Authenticated: requires Bearer token
// Body: { newPassword }
router.post('/change-password', async (req, res) => {
  try {
    const authz = req.headers.authorization || ''
    const token = authz.startsWith('Bearer ')? authz.slice(7) : null
    if (!token) return res.status(401).json({ message: 'Unauthorized' })

    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'secret')
    } catch (e) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { newPassword } = req.body || {}
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'newPassword (min 6 chars) is required' })
    }

    const hash = await bcrypt.hash(String(newPassword), Number(process.env.BCRYPT_ROUNDS || 10))
    await query('UPDATE users SET password_hash = :hash, must_change_password = 0 WHERE id = :id', { hash, id: payload.sub })

    return res.json({ ok: true })
  } catch (err) {
    console.error('Change password error', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

export default router
