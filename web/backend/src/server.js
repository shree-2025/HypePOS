import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import itemsRoutes from './routes/items.js'
import outletsRoutes from './routes/outlets.js'
import { pool } from './db.js'
import employeesRoutes from './routes/employees.js'
import transfersRoutes from './routes/transfers.js'
import stockRoutes from './routes/stock.js'
import salesRoutes from './routes/sales.js'
import coloursRoutes from './routes/colours.js'
import brandsRoutes from './routes/brands.js'
import reportsRoutes from './routes/reports.js'

const app = express()

// CORS: reflect request origin by default for local dev; disable credentials unless explicitly needed
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true
app.use(cors({ origin: allowedOrigins, credentials: false }))
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/items', itemsRoutes)
app.use('/api/outlets', outletsRoutes)
app.use('/api/employees', employeesRoutes)
app.use('/api/transfers', transfersRoutes)
app.use('/api/stock', stockRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/colours', coloursRoutes)
app.use('/api/brands', brandsRoutes)
app.use('/api/reports', reportsRoutes)

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
    // Ensure users.must_change_password exists (best-effort)
    try {
      await pool.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash;`)
    } catch (e2) {
      // Fallback for MySQL versions without IF NOT EXISTS
      try {
        const [cols] = await pool.execute(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'must_change_password'`)
        if (!cols[0]) {
          await pool.execute(`ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash;`)
        }
      } catch (e3) {
        console.warn('DB init: could not ensure must_change_password column:', e3?.message || e3)
      }
    }
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
