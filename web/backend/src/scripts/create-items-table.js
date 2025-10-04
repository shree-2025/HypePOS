import 'dotenv/config'
import { pool } from '../db.js'

const SQL = `
CREATE TABLE IF NOT EXISTS items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(60) NOT NULL,
  brand VARCHAR(60) NOT NULL,
  color_name VARCHAR(40) NULL,
  color_code VARCHAR(16) NULL,
  size INT NULL,
  item_code VARCHAR(60) NOT NULL,
  stock_id VARCHAR(60) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_item_code (item_code),
  UNIQUE KEY uniq_stock_id (stock_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

async function main() {
  const conn = await pool.getConnection()
  try {
    await conn.execute(SQL)
    console.log('Items table ensured (created if not exists).')
    process.exit(0)
  } catch (err) {
    console.error('Failed to create items table:', err)
    process.exit(1)
  } finally {
    conn.release()
  }
}

main()
