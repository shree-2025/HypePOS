import express from 'express'
import { query, pool } from '../db.js'
import multer from 'multer'
import crypto from 'crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const router = express.Router()

// File upload (DigitalOcean Spaces)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const spacesEndpoint = process.env.DO_SPACES_ENDPOINT || 'https://blr1.digitaloceanspaces.com'
const spacesBucket = process.env.DO_SPACES_BUCKET || 'hypepos'
const spacesCdnBase = process.env.DO_SPACES_CDN_BASE || 'https://hypepos.blr1.digitaloceanspaces.com'
const s3 = new S3Client({
  region: 'us-east-1', // DO Spaces uses this dummy value
  endpoint: spacesEndpoint,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || '',
  },
})

// Ensure item_master table has required schema (idempotent best-effort)
async function ensureItemColumns() {
  try {
    await pool.execute(`ALTER TABLE item_master
      ADD COLUMN IF NOT EXISTS stock_no VARCHAR(64) NULL,
      ADD COLUMN IF NOT EXISTS brand_id BIGINT UNSIGNED NULL,
      ADD COLUMN IF NOT EXISTS item_code VARCHAR(10) NULL,
      ADD COLUMN IF NOT EXISTS item_code_desc VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS color_id BIGINT UNSIGNED NULL,
      ADD COLUMN IF NOT EXISTS size INT NULL,
      ADD COLUMN IF NOT EXISTS description TEXT NULL,
      ADD COLUMN IF NOT EXISTS retail_price DECIMAL(10,2) NULL,
      ADD COLUMN IF NOT EXISTS dealer_price DECIMAL(10,2) NULL,
      ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) NULL,
      ADD COLUMN IF NOT EXISTS last_purchase_price DECIMAL(10,2) NULL,
      ADD COLUMN IF NOT EXISTS sole VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS material VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(32) NULL,
      ADD COLUMN IF NOT EXISTS image_id VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS stock_id VARCHAR(64) NULL,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS tax_code VARCHAR(50) NULL`)
    // Ensure item_code is NOT unique: drop any unique index if present
    try { await pool.execute('ALTER TABLE item_master DROP INDEX item_code') } catch {}
    try { await pool.execute('ALTER TABLE item_master DROP INDEX idx_items_item_code') } catch {}
    try { await pool.execute('CREATE INDEX IF NOT EXISTS idx_items_item_code ON item_master(item_code)') } catch {}
    try { await pool.execute('CREATE INDEX IF NOT EXISTS idx_items_stock_no ON item_master(stock_no)') } catch {}
    try { await pool.execute('ALTER TABLE item_master ADD CONSTRAINT fk_items_brand FOREIGN KEY (brand_id) REFERENCES brand(id)') } catch {}
    try { await pool.execute('CREATE INDEX IF NOT EXISTS idx_items_brand_id ON item_master(brand_id)') } catch {}
    try { await pool.execute('ALTER TABLE item_master ADD CONSTRAINT fk_items_colour FOREIGN KEY (color_id) REFERENCES colours(id)') } catch {}
    try { await pool.execute('CREATE INDEX IF NOT EXISTS idx_items_color_id ON item_master(color_id)') } catch {}
  } catch (e) {
    // Some MySQL variants don't support IF NOT EXISTS per-column; fallback by probing
    try { await pool.execute('SELECT description, retail_price, dealer_price, cost_price, last_purchase_price, sole, material, hsn_code, image_id, tax_code FROM item_master LIMIT 1') } catch {
      // Try adding columns one by one
      const cols = [
        ['stock_no','VARCHAR(64) NULL'],
        ['brand_id','BIGINT UNSIGNED NULL'],
        ['item_code','VARCHAR(10) NULL'],
        ['item_code_desc','VARCHAR(255) NULL'],
        ['color_id','BIGINT UNSIGNED NULL'],
        ['size','INT NULL'],
        ['description','TEXT NULL'],
        ['retail_price','DECIMAL(10,2) NULL'],
        ['dealer_price','DECIMAL(10,2) NULL'],
        ['cost_price','DECIMAL(10,2) NULL'],
        ['last_purchase_price','DECIMAL(10,2) NULL'],
        ['sole','VARCHAR(100) NULL'],
        ['material','VARCHAR(100) NULL'],
        ['hsn_code','VARCHAR(32) NULL'],
        ['image_id','VARCHAR(100) NULL'],
        ['tax_code','VARCHAR(50) NULL'],
        ['stock_id','VARCHAR(64) NULL'],
        ['created_at','TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
        ['updated_at','TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],
      ]
      // eslint-disable-next-line no-restricted-syntax
      for (const [name, type] of cols) {
        // eslint-disable-next-line no-await-in-loop
        try { await pool.execute(`ALTER TABLE item_master ADD COLUMN IF NOT EXISTS ${name} ${type}`) } catch {}
      }
      try { await pool.execute('ALTER TABLE item_master ADD CONSTRAINT fk_items_brand FOREIGN KEY (brand_id) REFERENCES brand(id)') } catch {}
      try { await pool.execute('CREATE INDEX IF NOT EXISTS idx_items_brand_id ON item_master(brand_id)') } catch {}
      try { await pool.execute('ALTER TABLE item_master ADD CONSTRAINT fk_items_colour FOREIGN KEY (color_id) REFERENCES colours(id)') } catch {}
      try { await pool.execute('CREATE INDEX IF NOT EXISTS idx_items_color_id ON item_master(color_id)') } catch {}
    }
  }

  // Do not create triggers/sequence; item_code is a simple input field now.
}

router.use(async (_req, _res, next) => { try { await ensureItemColumns() } catch {} next() })

// POST /api/items/upload-image
router.post('/upload-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'file is required' })
    const ext = (req.file.originalname.split('.').pop() || 'bin').toLowerCase()
    const key = `items/${new Date().toISOString().slice(0,10)}/${crypto.randomBytes(8).toString('hex')}.${ext}`
    await s3.send(new PutObjectCommand({
      Bucket: spacesBucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'application/octet-stream',
      ACL: 'public-read',
    }))
    const url = `${spacesCdnBase}/${key}`
    res.json({ url, key })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('upload-image error', err)
    res.status(500).json({ message: 'Upload failed' })
  }
})

// GET /api/items
router.get('/', async (req, res) => {
  try {
    const sql = `SELECT i.id,
                 i.stock_no AS stockNo,
                 i.brand_id AS brandId,
                 b.brand_name AS brand,
                 b.category AS category,
                 i.item_code AS itemCode,
                 i.item_code_desc AS itemCodeDesc,
                 i.color_id AS colorId,
                 c.color_desc AS colorName,
                 c.color_code AS colorCode,
                 i.size,
                 i.description,
                 i.retail_price AS retailPrice,
                 i.dealer_price AS dealerPrice,
                 i.cost_price AS costPrice,
                 i.last_purchase_price AS lastPurchasePrice,
                 i.tax_code AS taxCode,
                 i.sole, i.material,
                 i.hsn_code AS hsnCode,
                 i.image_id AS imageId,
                 i.stock_id AS stockId,
                 i.created_at AS createdAt, i.updated_at AS updatedAt
                 FROM item_master i
                 LEFT JOIN brand b ON b.id = i.brand_id
                 LEFT JOIN colours c ON c.id = i.color_id
                 ORDER BY i.id DESC`
    const rows = await query(sql, {})
    res.json(rows)
  } catch (err) {
    console.error('GET /items error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/items
router.post('/', async (req, res) => {
  try {
    const {
      category, brand, colorCode,
      size,
      itemCodeDesc,
      description, retailPrice, dealerPrice, costPrice, lastPurchasePrice,
      sole, material, hsnCode, imageId,
      stock,
      taxCode,
      itemCode
    } = req.body || {}

    // Required minimal
    if (!brand || category == null || !colorCode || size == null || !itemCodeDesc) {
      return res.status(400).json({ message: 'brand, category, colorCode, size, itemCodeDesc are required' })
    }
    // Resolve brand by brand name + category
    const bn = String(brand).trim()
    const cat = String(category).trim() || null
    const [brows] = await pool.execute(`SELECT id FROM brand WHERE LOWER(brand_name) = LOWER(:bn) AND ((:cat IS NULL AND category IS NULL) OR LOWER(IFNULL(category,'')) = LOWER(IFNULL(:cat,''))) LIMIT 1`, { bn, cat })
    if (!brows.length) return res.status(400).json({ message: 'Brand+Category not found in master' })
    const brandId = brows[0].id
    // Resolve colour by code
    const codeStr = String(colorCode ?? '').trim()
    if (!codeStr) return res.status(400).json({ message: 'colorCode is required' })
    const [crows] = await pool.execute('SELECT id, color_code, color_desc FROM colours WHERE CAST(color_code AS CHAR) = :code LIMIT 1', { code: codeStr })
    if (!crows.length) return res.status(400).json({ message: 'Colour code not found. Add to master first.' })
    const colorId = crows[0].id

    // Require itemCode as provided by client (no auto-generation)
    const itemCodeVal = (itemCode || '').toString().trim()
    if (!itemCodeVal) return res.status(400).json({ message: 'itemCode is required' })
    // Compute stockNo/stockId based on itemCode + 155 + colour code + size
    const sizeVal = Number(size)
    if (!Number.isFinite(sizeVal)) {
      return res.status(400).json({ message: 'size must be a number' })
    }
    const stockNo = `${itemCodeVal}155${codeStr}${sizeVal}`
    if (!stockNo) {
      return res.status(400).json({ message: 'Unable to compute stock_no from itemCode/colorCode/size' })
    }

    const insertSql = `INSERT INTO item_master (
                 stock_no, brand_id, item_code, item_code_desc, color_id, size,
                 description, retail_price, dealer_price, cost_price, last_purchase_price,
                 sole, material, hsn_code, tax_code, image_id,
                 stock_id, created_at, updated_at)
                 VALUES (
                 :stockNo, :brandId, :itemCode, :itemCodeDesc, :colorId, :size,
                 :description, :retailPrice, :dealerPrice, :costPrice, :lastPurchasePrice,
                 :sole, :material, :hsnCode, :taxCode, :imageId,
                 :stockNo, NOW(), NOW())`
    const [result] = await pool.execute(insertSql, {
      stockNo,
      brandId,
      itemCode: itemCodeVal,
      itemCodeDesc,
      colorId,
      size: Number(size),
      description: description ?? null,
      retailPrice: retailPrice != null ? Number(retailPrice) : null,
      dealerPrice: dealerPrice != null ? Number(dealerPrice) : null,
      costPrice: costPrice != null ? Number(costPrice) : null,
      lastPurchasePrice: lastPurchasePrice != null ? Number(lastPurchasePrice) : null,
      sole: sole ?? null,
      material: material ?? null,
      hsnCode: hsnCode ?? null,
      taxCode: taxCode ?? null,
      imageId: imageId ?? null,
    })
    const [rows] = await pool.execute(
      `SELECT i.id,
              b.category AS category, b.brand_name AS brand,
              c.color_desc AS colorName, c.color_code AS colorCode,
              i.size, i.item_code AS itemCode, i.item_code_desc AS itemCodeDesc, i.stock_id AS stockId,
              i.description, i.retail_price AS retailPrice, i.dealer_price AS dealerPrice, i.cost_price AS costPrice, i.last_purchase_price AS lastPurchasePrice,
              i.sole, i.material, i.hsn_code AS hsnCode, i.tax_code AS taxCode, i.image_id AS imageId,
              i.brand_id AS brandId, i.color_id AS colorId,
              i.created_at AS createdAt, i.updated_at AS updatedAt
       FROM item_master i LEFT JOIN brand b ON b.id = i.brand_id LEFT JOIN colours c ON c.id = i.color_id WHERE i.id = :id`,
      { id: result.insertId }
    )
    res.status(201).json(rows[0] || { id: result.insertId })
  } catch (err) {
    console.error('POST /items error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/items/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { category, brand, colorName, colorCode, size,
            description, retailPrice, dealerPrice, costPrice, lastPurchasePrice, sole, material,
            hsnCode, taxCode, imageId,
            itemCode, itemCodeDesc, stockId } = req.body || {}
    // fetch current image url (if any)
    let prevImageUrl = null
    try {
      const [cur] = await pool.execute('SELECT image_id FROM item_master WHERE id = :id LIMIT 1', { id })
      prevImageUrl = cur?.[0]?.image_id || null
    } catch {}
    // Resolve brand_id if brand/category provided; must exist (no auto-create)
    let brandIdParam = undefined
    if (brand !== undefined || category !== undefined) {
      const bn = brand != null ? String(brand).trim() : undefined
      const cat = category != null ? String(category).trim() : undefined
      if (bn) {
        const [found] = await pool.execute(`SELECT id FROM brand WHERE LOWER(brand_name) = LOWER(:bn) AND ((:cat IS NULL AND category IS NULL) OR LOWER(IFNULL(category,'')) = LOWER(IFNULL(:cat,''))) LIMIT 1`, { bn, cat: cat ?? null })
        if (found.length) brandIdParam = found[0].id
        else {
          return res.status(400).json({ message: 'Brand with selected category not found. Please create it first.' })
        }
      }
    }
    // Resolve colour by code if provided; must exist (no auto-create)
    let colorIdParam = undefined
    let colorNameParam = undefined
    let colorCodeParam = undefined
    if (colorCode != null) {
      const codeStr = String(colorCode).trim()
      if (codeStr) {
        const [crows] = await pool.execute('SELECT id, color_code, color_desc FROM colours WHERE CAST(color_code AS CHAR) = :code LIMIT 1', { code: codeStr })
        if (crows.length) {
          colorIdParam = crows[0].id
          colorCodeParam = crows[0].color_code
          colorNameParam = crows[0].color_desc || null
        } else {
          return res.status(400).json({ message: 'Colour code not found. Please add it to master first.' })
        }
      }
    }
    const sql = `UPDATE item_master SET 
      brand_id = COALESCE(:brandId, brand_id),
      color_id = COALESCE(:colorId, color_id),
      size = COALESCE(:size, size),
      description = COALESCE(:description, description),
      retail_price = COALESCE(:retailPrice, retail_price),
      dealer_price = COALESCE(:dealerPrice, dealer_price),
      cost_price = COALESCE(:costPrice, cost_price),
      last_purchase_price = COALESCE(:lastPurchasePrice, last_purchase_price),
      sole = COALESCE(:sole, sole),
      material = COALESCE(:material, material),
      hsn_code = COALESCE(:hsnCode, hsn_code),
      tax_code = COALESCE(:taxCode, tax_code),
      image_id = COALESCE(:imageId, image_id),
      item_code = COALESCE(:itemCode, item_code),
      item_code_desc = COALESCE(:itemCodeDesc, item_code_desc),
      stock_id = COALESCE(:stockId, stock_id),
      updated_at = NOW()
      WHERE id = :id`
    // Convert undefined binds to null to avoid mysql2 error
    await pool.execute(sql, {
      id: Number.isFinite(id) ? id : null,
      brandId: brandIdParam ?? null,
      colorId: colorIdParam ?? null,
      size: size != null ? Number(size) : null,
      description: description ?? null,
      retailPrice: retailPrice != null ? Number(retailPrice) : null,
      dealerPrice: dealerPrice != null ? Number(dealerPrice) : null,
      costPrice: costPrice != null ? Number(costPrice) : null,
      lastPurchasePrice: lastPurchasePrice != null ? Number(lastPurchasePrice) : null,
      sole: sole ?? null,
      material: material ?? null,
      hsnCode: hsnCode ?? null,
      taxCode: taxCode ?? null,
      imageId: imageId ?? null,
      itemCode: itemCode ?? null,
      itemCodeDesc: itemCodeDesc ?? null,
      stockId: stockId ?? null,
    })
    // If image changed, attempt to delete previous object from Spaces
    try {
      const newUrl = imageId ?? null
      if (prevImageUrl && newUrl && String(prevImageUrl) !== String(newUrl)) {
        const u1 = String(prevImageUrl)
        let key = null
        const cdnPrefix = `${spacesCdnBase}/`
        if (u1.startsWith(cdnPrefix)) {
          key = u1.slice(cdnPrefix.length)
        } else {
          const epPrefix = `${spacesEndpoint.replace(/\/$/, '')}/${spacesBucket}/`
          if (u1.startsWith(epPrefix)) key = u1.slice(epPrefix.length)
        }
        if (key) {
          try { await s3.send(new DeleteObjectCommand({ Bucket: spacesBucket, Key: key })) } catch {}
        }
      }
    } catch {}
    const [rows] = await pool.execute(
      `SELECT i.id,
              b.category AS category, b.brand_name AS brand,
              c.color_desc AS colorName, c.color_code AS colorCode,
              i.size, i.item_code AS itemCode, i.item_code_desc AS itemCodeDesc, i.stock_id AS stockId,
              i.description, i.retail_price AS retailPrice, i.dealer_price AS dealerPrice, i.cost_price AS costPrice, i.last_purchase_price AS lastPurchasePrice,
              i.sole, i.material, i.hsn_code AS hsnCode, i.tax_code AS taxCode, i.image_id AS imageId,
              i.brand_id AS brandId, i.color_id AS colorId,
              i.created_at AS createdAt, i.updated_at AS updatedAt
       FROM item_master i LEFT JOIN brand b ON b.id = i.brand_id LEFT JOIN colours c ON c.id = i.color_id WHERE i.id = :id`,
      { id }
    )
    res.json(rows[0] || { ok: true })
  } catch (err) {
    console.error('PUT /items error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    await pool.execute('DELETE FROM item_master WHERE id = :id', { id })
    res.json({ ok: true })
  } catch (err) {
    // Handle FK constraint (item used in transfer_master, etc.)
    if (err?.code === 'ER_ROW_IS_REFERENCED_2' || err?.errno === 1451) {
      return res.status(409).json({
        message: 'Cannot delete this item because it is referenced in stock transfers. Remove related transfers first.'
      })
    }
    console.error('DELETE /items error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router

// BULK UPLOAD: POST /api/items/bulk
// Body: { rows: [{ name, category, brand, colorCode, size, description?, retailPrice?, dealerPrice?, costPrice?, lastPurchasePrice?, sole?, material?, stock? }, ...] }
// BULK aligned to new schema; accepts either IDs or BrandName/Category + ColorCode
router.post('/bulk', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : []
    if (!rows.length) return res.status(400).json({ message: 'rows required' })
    await conn.beginTransaction()

    const out = { inserted: 0, errors: [] }

    // helpers
    const resolveBrand = async (brandName, category) => {
      const bn = String(brandName || '').trim()
      const cat = (category != null ? String(category) : '').trim() || null
      if (!bn) throw new Error('Brand required')
      const [found] = await conn.execute(`SELECT id FROM brand WHERE LOWER(brand_name) = LOWER(:bn) AND ((:cat IS NULL AND category IS NULL) OR LOWER(IFNULL(category,'')) = LOWER(IFNULL(:cat,''))) LIMIT 1`, { bn, cat })
      if (!found.length) throw new Error('Brand+Category not found')
      return found[0].id
    }
    const resolveColour = async (colorCode) => {
      if (colorCode == null || String(colorCode).trim() === '') return { id: null, code: null, name: null }
      const codeStr = String(colorCode).trim()
      const [crows] = await conn.execute('SELECT id, color_code, color_desc FROM colours WHERE CAST(color_code AS CHAR) = :code LIMIT 1', { code: codeStr })
      if (!crows.length) throw new Error(`Colour code not found: ${codeStr}`)
      return { id: crows[0].id, code: crows[0].color_code, name: crows[0].color_desc || null }
    }

    for (let idx = 0; idx < rows.length; idx += 1) {
      const r = rows[idx] || {}
      try {
        const brandId = r.brandId ? Number(r.brandId) : await resolveBrand(r.brand || r.brandName, r.category)
        const colour = await resolveColour(r.colorCode || r.colourCode)
        const sizeVal = r.size != null ? Number(r.size) : NaN
        const itemCodeDesc = String(r.itemCodeDesc || r.name || '').trim()
        if (!itemCodeDesc || !Number.isFinite(sizeVal) || !colour.id) throw new Error('Missing required fields')

        // next item_code
        const [mx] = await conn.execute('SELECT LPAD(COALESCE(MAX(CAST(item_code AS UNSIGNED)),0)+1, 5, "0") AS nextCode FROM item_master')
        const itemCodeVal = mx[0]?.nextCode || '00001'
        const stockNo = `${itemCodeVal}155${colour.code}${sizeVal}`

        await conn.execute(`INSERT INTO item_master (
                 stock_no, brand_id, item_code, item_code_desc, color_id, size,
                 description, retail_price, dealer_price, cost_price, last_purchase_price,
                 sole, material, hsn_code, tax_code, image_id,
                 stock_id, created_at, updated_at)
                 VALUES (
                 :stockNo, :brandId, :itemCode, :itemCodeDesc, :colorId, :size,
                 :description, :retailPrice, :dealerPrice, :costPrice, :lastPurchasePrice,
                 :sole, :material, :hsnCode, :taxCode, :imageId,
                 :stockNo, NOW(), NOW())`, {
          stockNo,
          brandId,
          itemCode: itemCodeVal,
          itemCodeDesc,
          colorId: colour.id,
          size: sizeVal,
          description: r.description ?? null,
          retailPrice: r.retailPrice != null ? Number(r.retailPrice) : null,
          dealerPrice: r.dealerPrice != null ? Number(r.dealerPrice) : null,
          costPrice: r.costPrice != null ? Number(r.costPrice) : null,
          lastPurchasePrice: r.lastPurchasePrice != null ? Number(r.lastPurchasePrice) : null,
          sole: r.sole ?? null,
          material: r.material ?? null,
          hsnCode: r.hsnCode ?? null,
          taxCode: r.taxCode ?? null,
          imageId: r.imageId ?? null,
          stockId: stockNo,
        })
        out.inserted += 1
      } catch (e) {
        out.errors.push({ index: idx, message: e?.message || 'Row failed' })
      }
    }

    await conn.commit()
    res.status(201).json(out)
  } catch (err) {
    await conn.rollback()
    console.error('POST /items/bulk error', err)
    res.status(500).json({ message: err?.sqlMessage || err?.message || 'Server error' })
  } finally {
    conn.release()
  }
})

// POST /api/items/bulk-csv
router.post('/bulk-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'file required' })
    const text = req.file.buffer.toString('utf8')
    const parseLine = (line) => {
      const out = []
      let cur = ''
      let inQ = false
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i]
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i += 1 } else { inQ = !inQ }
        } else if (ch === ',' && !inQ) {
          out.push(cur)
          cur = ''
        } else {
          cur += ch
        }
      }
      out.push(cur)
      return out.map(s => s.trim())
    }
    const lines = text.split(/\r?\n/).filter(l => l.trim().length)
    if (!lines.length) return res.status(400).json({ message: 'empty csv' })
    const headers = parseLine(lines[0])
    const rows = []
    for (let i = 1; i < lines.length; i += 1) {
      const cols = parseLine(lines[i])
      const obj = {}
      for (let j = 0; j < headers.length; j += 1) obj[headers[j]] = cols[j] ?? ''
      rows.push(obj)
    }

    const mapRow = (r) => ({
      itemCode: r['Item Code'] || r['item_code'] || r['ITEM CODE'] || null,
      itemCodeDesc: r['Item Code Desc'] || r['item_code_desc'] || r['ITEM CODE DESC'] || r['Name'] || r['name'] || null,
      category: r['Category'] || r['category'] || null,
      brand: r['Brand'] || r['brand'] || null,
      colourCode: r['Colour Code'] || r['Color Code'] || r['colourCode'] || r['colorCode'] || r['COLOUR CODE'] || null,
      size: r['Size'] || r['size'] || null,
      retailPrice: r['Retailer Price'] || r['retailPrice'] || r['Retail Price'] || null,
      dealerPrice: r['Dealer Price'] || r['dealerPrice'] || null,
      costPrice: r['Cost Price'] || r['costPrice'] || null,
      lastPurchasePrice: r['Last Purchase Price'] || r['lastPurchasePrice'] || null,
      sole: r['Sole'] || r['sole'] || null,
      material: r['Material'] || r['material'] || null,
      hsnCode: r['HSN'] || r['HSN Code'] || r['hsnCode'] || null,
      taxCode: r['Tax Code'] || r['taxCode'] || null,
      description: r['Description'] || r['description'] || null,
      imageId: r['Image URL'] || r['imageId'] || null,
    })

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const out = { inserted: 0, errors: [] }

      const resolveBrand = async (brandName, category) => {
        const bn = String(brandName || '').trim()
        const cat = (category != null ? String(category) : '').trim() || null
        if (!bn) throw new Error('Brand required')
        const [found] = await conn.execute(`SELECT id FROM brand WHERE LOWER(brand_name) = LOWER(:bn) AND ((:cat IS NULL AND category IS NULL) OR LOWER(IFNULL(category,'')) = LOWER(IFNULL(:cat,''))) LIMIT 1`, { bn, cat })
        if (!found.length) throw new Error('Brand+Category not found')
        return found[0].id
      }
      const resolveColour = async (colorCode) => {
        if (colorCode == null || String(colorCode).trim() === '') return { id: null, code: null, name: null }
        const codeStr = String(colorCode).trim()
        const [crows] = await conn.execute('SELECT id, color_code, color_desc FROM colours WHERE CAST(color_code AS CHAR) = :code LIMIT 1', { code: codeStr })
        if (!crows.length) throw new Error(`Colour code not found: ${codeStr}`)
        return { id: crows[0].id, code: crows[0].color_code, name: crows[0].color_desc || null }
      }

      for (let idx = 0; idx < rows.length; idx += 1) {
        const r0 = mapRow(rows[idx] || {})
        try {
          const brandId = await resolveBrand(r0.brand, r0.category)
          const colour = await resolveColour(r0.colourCode)
          const sizeVal = r0.size != null && String(r0.size).trim() !== '' ? Number(r0.size) : NaN
          const itemCodeDesc = String(r0.itemCodeDesc || '').trim()
          if (!itemCodeDesc || !Number.isFinite(sizeVal) || !colour.id) throw new Error('Missing required fields')

          let itemCodeVal = (r0.itemCode || '').toString().trim()
          if (!itemCodeVal) {
            const [mx] = await conn.execute('SELECT LPAD(COALESCE(MAX(CAST(item_code AS UNSIGNED)),0)+1, 5, "0") AS nextCode FROM item_master')
            itemCodeVal = mx[0]?.nextCode || '00001'
          }
          const stockNo = `${itemCodeVal}155${colour.code}${sizeVal}`

          await conn.execute(`INSERT INTO item_master (
                   stock_no, brand_id, item_code, item_code_desc, color_id, size,
                   description, retail_price, dealer_price, cost_price, last_purchase_price,
                   sole, material, hsn_code, tax_code, image_id,
                   stock_id, created_at, updated_at)
                   VALUES (
                   :stockNo, :brandId, :itemCode, :itemCodeDesc, :colorId, :size,
                   :description, :retailPrice, :dealerPrice, :costPrice, :lastPurchasePrice,
                   :sole, :material, :hsnCode, :taxCode, :imageId,
                   :stockNo, NOW(), NOW())`, {
            stockNo,
            brandId,
            itemCode: itemCodeVal,
            itemCodeDesc,
            colorId: colour.id,
            size: sizeVal,
            description: r0.description ?? null,
            retailPrice: r0.retailPrice != null && String(r0.retailPrice).trim() !== '' ? Number(r0.retailPrice) : null,
            dealerPrice: r0.dealerPrice != null && String(r0.dealerPrice).trim() !== '' ? Number(r0.dealerPrice) : null,
            costPrice: r0.costPrice != null && String(r0.costPrice).trim() !== '' ? Number(r0.costPrice) : null,
            lastPurchasePrice: r0.lastPurchasePrice != null && String(r0.lastPurchasePrice).trim() !== '' ? Number(r0.lastPurchasePrice) : null,
            sole: r0.sole ?? null,
            material: r0.material ?? null,
            hsnCode: r0.hsnCode ?? null,
            taxCode: r0.taxCode ?? null,
            imageId: r0.imageId ?? null,
            stockId: stockNo,
          })
          out.inserted += 1
        } catch (e) {
          out.errors.push({ index: idx, message: e?.message || 'Row failed' })
        }
      }

      await conn.commit()
      res.status(201).json(out)
    } catch (err) {
      await conn.rollback()
      res.status(500).json({ message: err?.sqlMessage || err?.message || 'Server error' })
    }
  } catch (e) {
    res.status(500).json({ message: e?.message || 'Server error' })
  }
})
