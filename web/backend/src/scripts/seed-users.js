import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'

const USERS = [
  { email: 'master@hypepos.com', role: 'master', password: 'Master@123' },
  { email: 'distributor@hypepos.com', role: 'distributor', password: 'Distributor@123' },
  { email: 'admin@hypepos.com', role: 'admin', password: 'Admin@123' },
  { email: 'sales@hypepos.com', role: 'salers', password: 'Sales@123' },
]

async function upsertUser(conn, { email, role, password }, rounds) {
  const [rows] = await conn.execute(
    'SELECT id FROM users WHERE email = :email AND role = :role LIMIT 1',
    { email, role }
  )
  const hash = await bcrypt.hash(String(password), rounds)
  if (rows && rows.length) {
    const id = rows[0].id
    await conn.execute(
      'UPDATE users SET password_hash = :hash WHERE id = :id',
      { hash, id }
    )
    return { email, role, action: 'updated' }
  } else {
    await conn.execute(
      'INSERT INTO users (email, password_hash, role, created_at) VALUES (:email, :hash, :role, NOW())',
      { email, hash, role }
    )
    return { email, role, action: 'created' }
  }
}

async function main() {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 10)
  const conn = await pool.getConnection()
  try {
    const results = []
    for (const u of USERS) {
      // eslint-disable-next-line no-await-in-loop
      const r = await upsertUser(conn, u, rounds)
      results.push(r)
    }
    console.table(results)
    console.log('Seeding complete')
    process.exit(0)
  } catch (err) {
    console.error('Seeding failed:', err)
    process.exit(1)
  } finally {
    conn.release()
  }
}

main()
