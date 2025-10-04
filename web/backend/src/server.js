import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import itemsRoutes from './routes/items.js'
import outletsRoutes from './routes/outlets.js'
import { pool } from './db.js'
import employeesRoutes from './routes/employees.js'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*', credentials: true }))
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/items', itemsRoutes)
app.use('/api/outlets', outletsRoutes)
app.use('/api/employees', employeesRoutes)

async function init() {
  try {
    // Ensure outlets table exists (in case SQL file wasn't applied)
    await pool.execute(`CREATE TABLE IF NOT EXISTS outlets (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(190) NOT NULL,
      manager_name VARCHAR(190) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      location VARCHAR(255) DEFAULT NULL,
      user_id INT UNSIGNED DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`)
  } catch (e) {
    console.warn('DB init warning:', e?.message || e)
  }
}

const PORT = Number(process.env.PORT || 4000)
init().finally(() => {
  app.listen(PORT, () => {
    console.log(`HypePOS API listening on http://localhost:${PORT}`)
  })
})
