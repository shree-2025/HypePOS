import 'dotenv/config'
import { pool } from '../db.js'

const ITEMS = [
  { name: 'Runner Max', category: 'Shoes', brand: 'Fleet', color_name: 'Black', color_code: '#000000', size: 42, item_code: 'SKU-001', stock_id: 'STK-1001' },
  { name: 'Urban Slide', category: 'Sandals', brand: 'WalkIt', color_name: 'Blue', color_code: '#0000FF', size: 40, item_code: 'SKU-002', stock_id: 'STK-1002' },
  { name: 'Trail Pro', category: 'Boots', brand: 'Terra', color_name: 'Brown', color_code: '#8B4513', size: 44, item_code: 'SKU-003', stock_id: 'STK-1003' },
  { name: 'Cozy Step', category: 'Slippers', brand: 'Comfy', color_name: 'White', color_code: '#FFFFFF', size: 41, item_code: 'SKU-004', stock_id: 'STK-1004' },
  { name: 'City Runner', category: 'Shoes', brand: 'Fleet', color_name: 'Red', color_code: '#FF0000', size: 42, item_code: 'SKU-005', stock_id: 'STK-1005' },
]

async function main() {
  const conn = await pool.getConnection()
  try {
    for (const it of ITEMS) {
      // upsert by unique item_code
      // eslint-disable-next-line no-await-in-loop
      await conn.execute(
        `INSERT INTO items (name, category, brand, color_name, color_code, size, item_code, stock_id, created_at, updated_at)
         VALUES (:name, :category, :brand, :color_name, :color_code, :size, :item_code, :stock_id, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           category = VALUES(category),
           brand = VALUES(brand),
           color_name = VALUES(color_name),
           color_code = VALUES(color_code),
           size = VALUES(size),
           stock_id = VALUES(stock_id),
           updated_at = NOW()`,
        it
      )
    }
    console.log('Seeded sample items.')
    process.exit(0)
  } catch (err) {
    console.error('Failed to seed items:', err)
    process.exit(1)
  } finally {
    conn.release()
  }
}

main()
