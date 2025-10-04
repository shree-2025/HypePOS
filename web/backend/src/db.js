import mysql from 'mysql2/promise'

// Support both DB_* and Laravel-style variables the user added
const env = process.env
const DB_HOST = env.DB_HOST || 'localhost'
const DB_PORT = Number(env.DB_PORT || 3306)
const DB_USER = env.DB_USER || env.DB_USERNAME || 'root'
const DB_PASSWORD = env.DB_PASSWORD || ''
const DB_NAME = env.DB_NAME || env.DB_DATABASE || 'hypepos'

export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
})

export async function query(sql, params) {
  const [rows] = await pool.execute(sql, params)
  return rows
}
