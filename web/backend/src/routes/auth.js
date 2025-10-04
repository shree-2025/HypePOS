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

    const rows = await query('SELECT id, email, password_hash AS passwordHash, role FROM users WHERE email = :email AND role = :role LIMIT 1', { email, role })
    const user = rows[0]
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const ok = await bcrypt.compare(String(password), user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

    const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' })
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
  } catch (err) {
    console.error('Login error', err)
    return res.status(500).json({ message: 'Server error' })
  }
})

export default router
