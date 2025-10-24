import express from 'express'
import { query } from '../db.js'

const router = express.Router()

// GET /api/reports/employee-sales?from=YYYY-MM-DD&to=YYYY-MM-DD&outletId=
router.get('/employee-sales', async (req, res) => {
  try {
    const from = req.query.from ? String(req.query.from) + ' 00:00:00' : null
    const to = req.query.to ? String(req.query.to) + ' 23:59:59' : null
    const outletId = req.query.outletId ? Number(req.query.outletId) : null

    const wh = []
    const params = {}
    if (from) { wh.push('sm.bill_date >= :from'); params.from = from }
    if (to) { wh.push('sm.bill_date <= :to'); params.to = to }
    if (outletId) { wh.push('sm.outlet_id = :outletId'); params.outletId = outletId }

    const sql = `
      SELECT 
        e.id AS employeeId,
        e.name AS employeeName,
        COUNT(DISTINCT sm.id) AS bills,
        COALESCE(SUM(si.qty), 0) AS qty,
        ROUND(COALESCE(SUM(sm.total), 0), 2) AS total
      FROM sales_master sm
      LEFT JOIN employees e ON e.id = sm.employee_id
      LEFT JOIN sales_items si ON si.sale_id = sm.id
      ${wh.length ? 'WHERE ' + wh.join(' AND ') : ''}
      GROUP BY e.id, e.name
      ORDER BY total DESC, bills DESC
    `
    const rows = await query(sql, params)
    res.json(rows)
  } catch (e) {
    console.error('GET /reports/employee-sales error', e)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/reports/overall-sales?groupBy=item|color|size&period=month|quarter|year&from=&to=&outletId=
router.get('/overall-sales', async (req, res) => {
  try {
    const groupBy = (req.query.groupBy || 'item').toString()
    const period = (req.query.period || 'month').toString()
    const from = req.query.from ? String(req.query.from) + ' 00:00:00' : null
    const to = req.query.to ? String(req.query.to) + ' 23:59:59' : null
    const outletId = req.query.outletId ? Number(req.query.outletId) : null

    const dimMap = {
      item: 'si.item_name',
      color: 'si.colour',
      size: 'si.size',
    }
    const dim = dimMap[groupBy] || dimMap.item

    let bucket = "DATE_FORMAT(sm.bill_date, '%Y-%m')"
    if (period === 'year') bucket = "DATE_FORMAT(sm.bill_date, '%Y')"
    else if (period === 'quarter') bucket = "CONCAT(YEAR(sm.bill_date), '-Q', QUARTER(sm.bill_date))"

    const wh = []
    const params = {}
    if (from) { wh.push('sm.bill_date >= :from'); params.from = from }
    if (to) { wh.push('sm.bill_date <= :to'); params.to = to }
    if (outletId) { wh.push('sm.outlet_id = :outletId'); params.outletId = outletId }

    const sql = `
      SELECT 
        ${bucket} AS bucket,
        ${dim} AS dimension,
        COALESCE(SUM(si.qty), 0) AS qty,
        ROUND(COALESCE(SUM(si.line_total), 0), 2) AS amount
      FROM sales_master sm
      JOIN sales_items si ON si.sale_id = sm.id
      ${wh.length ? 'WHERE ' + wh.join(' AND ') : ''}
      GROUP BY bucket, dimension
      ORDER BY bucket ASC, amount DESC
    `
    const rows = await query(sql, params)
    res.json(rows)
  } catch (e) {
    console.error('GET /reports/overall-sales error', e)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/reports/exchanges?from=&to=&outletId=
router.get('/exchanges', async (req, res) => {
  try {
    const from = req.query.from ? String(req.query.from) + ' 00:00:00' : null
    const to = req.query.to ? String(req.query.to) + ' 23:59:59' : null
    const outletId = req.query.outletId ? Number(req.query.outletId) : null

    const wh = []
    const params = {}
    if (from) { wh.push('em.exchange_date >= :from'); params.from = from }
    if (to) { wh.push('em.exchange_date <= :to'); params.to = to }
    if (outletId) { wh.push('em.outlet_id = :outletId'); params.outletId = outletId }

    const sql = `
      SELECT 
        em.id,
        em.exchange_date AS date,
        em.outlet_id AS outletId,
        em.customer_name AS customerName,
        em.customer_mobile AS customerMobile,
        em.reason,
        COALESCE(SUM(CASE WHEN ei.direction = 'return' THEN ei.qty ELSE 0 END), 0) AS returnQty,
        COALESCE(SUM(CASE WHEN ei.direction = 'issue' THEN ei.qty ELSE 0 END), 0) AS issueQty,
        ROUND(COALESCE(SUM(CASE WHEN ei.direction = 'issue' THEN (ei.qty * ei.price) ELSE 0 END), 0), 2) AS issueAmount
      FROM exchange_master em
      LEFT JOIN exchange_items ei ON ei.exchange_id = em.id
      ${wh.length ? 'WHERE ' + wh.join(' AND ') : ''}
      GROUP BY em.id
      ORDER BY em.id DESC
    `
    const rows = await query(sql, params)
    res.json(rows)
  } catch (e) {
    console.error('GET /reports/exchanges error', e)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
