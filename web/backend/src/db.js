import mysql from 'mysql2/promise'

// Support both DB_* and Laravel-style variables the user added
const env = process.env
const DB_HOST = env.DB_HOST || 'localhost'
const DB_PORT = Number(env.DB_PORT || 3306)
const DB_USER = env.DB_USER || env.DB_USERNAME || 'root'
const DB_PASSWORD = env.DB_PASSWORD || ''
const DB_NAME = env.DB_NAME || env.DB_DATABASE || 'hypepos'
const DB_SSL = String(env.DB_SSL || '').toLowerCase() === 'true'
const DB_SSL_REJECT_UNAUTHORIZED = String(env.DB_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true'

export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  ...(DB_SSL ? { ssl: { rejectUnauthorized: DB_SSL_REJECT_UNAUTHORIZED } } : {}),
})

export async function query(sql, params) {
  const [rows] = await pool.execute(sql, params)
  return rows
}
