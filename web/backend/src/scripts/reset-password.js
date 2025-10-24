import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'

async function main() {
  const [email, role, newPassword] = process.argv.slice(2)
  if (!email || !role || !newPassword) {
    console.error('Usage: node src/scripts/reset-password.js <email> <role> <newPassword>')
    process.exit(1)
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS || 10)
  const hash = await bcrypt.hash(String(newPassword), rounds)

  const conn = await pool.getConnection()
  try {
    const [rows] = await conn.execute(
      'SELECT id FROM users WHERE email = :email AND role = :role LIMIT 1',
      { email, role }
    )
    const user = rows?.[0]
    if (!user) {
      console.error('No user found for given email and role')
      process.exit(2)
    }

    await conn.execute(
      'UPDATE users SET password_hash = :hash, must_change_password = 1 WHERE id = :id',
      { hash, id: user.id }
    )
    console.log(`Password updated for ${email} (${role}).`)
    process.exit(0)
  } catch (err) {
    console.error('Failed to reset password:', err)
    process.exit(3)
  } finally {
    conn.release()
  }
}

main()
