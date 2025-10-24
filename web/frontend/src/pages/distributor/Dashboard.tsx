import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import SalesChart from '@/components/charts/SalesChart'
import Button from '@/components/ui/Button'
import StatCard from '@/components/dashboard/StatCard'
import api from '@/api/axios'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import { Link } from 'react-router-dom'
import { useOrg } from '@/context/org'

export default function Dashboard() {
  const { role, selectedOutlet } = useOrg()
  const roleLabel = role === 'admin' ? 'Outlet Admin' : role === 'master' ? 'Master' : role === 'distributor' ? 'Distributor' : 'User'
  type OutletRow = { id: number; code: string; name: string; email?: string; location?: string; manager_name?: string }

  // Transfer KPI state
  const [stats, setStats] = useState<{ total: number; shipped: number; pending: number; confirmed: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr('')
        const { data } = await api.get('/transfers/requests/stats')
        setStats({ total: data.total || 0, shipped: data.shipped || 0, pending: data.pending || 0, confirmed: data.confirmed || 0 })
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'Failed to load transfer stats')
      } finally { setLoading(false) }
    })()
  }, [])

  const [outletRows, setOutletRows] = useState<OutletRow[]>([])
  const [outletsLoading, setOutletsLoading] = useState(false)
  const [outletsErr, setOutletsErr] = useState('')
  const [viewOutlet, setViewOutlet] = useState<OutletRow | null>(null)

  // Recent transfers for side panel
  type RecentRow = { id: number; transactionCode: string; status: string; totalQty: number; createdAt: string }
  const [recent, setRecent] = useState<RecentRow[]>([])
  const [recentErr, setRecentErr] = useState('')
  useEffect(() => {
    (async () => {
      try {
        setRecentErr('')
        const { data } = await api.get('/transfers/requests')
        const arr = Array.isArray(data) ? data.slice(0, 5) : []
        setRecent(arr)
      } catch (e: any) {
        setRecentErr(e?.response?.data?.message || 'Failed to load recent transfers')
      }
    })()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        setOutletsLoading(true); setOutletsErr('')
        const { data } = await api.get('/outlets')
        const arr: OutletRow[] = Array.isArray(data) ? data : []
        setOutletRows(arr)
      } catch (e: any) {
        setOutletsErr(e?.response?.data?.message || 'Failed to load outlets')
      } finally { setOutletsLoading(false) }
    })()
  }, [])

  const outletCols: Column<OutletRow & { actions?: any }>[] = [
    { header: 'Code', key: 'code' },
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Location', key: 'location' },
    { header: 'Manager', key: 'manager_name' },
    { header: 'Actions', key: 'actions', render: (row) => (
      <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => setViewOutlet(row)}>View</Button>
    ) },
  ]

  return (
    <Shell>
      <PageHeader
        title="Retail POS Dashboard"
        subtitle={role === 'admin' ? `${roleLabel}${viewOutlet ? ' — ' + viewOutlet.name : ''}` : 'Overview of today’s sales and inventory health.'}
      />

      {/* Transfer KPI cards (dynamic) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Transactions" value={stats ? String(stats.total) : (loading ? '…' : '0')} />
        <StatCard title="Shipped" value={stats ? String(stats.shipped) : (loading ? '…' : '0')} />
        <StatCard title="Pending" value={stats ? String(stats.pending) : (loading ? '…' : '0')} />
        <StatCard title="Confirmed" value={stats ? String(stats.confirmed) : (loading ? '…' : '0')} />
      </div>
      {err && <div className="mt-2 text-sm text-red-600">{err}</div>}

      {/* Transfers by status (vertical bar graph with axes/grid) + side panel */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Transfers by Status (Vertical, %)" className="lg:col-span-2">
          {(() => {
            const total = stats?.total || 0
            const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0
            const bars = [
              { key: 'Total', value: total > 0 ? 100 : 0, color: '#111827' },
              { key: 'Pending', value: pct(stats?.pending || 0), color: '#f59e0b' },
              { key: 'Shipped', value: pct(stats?.shipped || 0), color: '#3b82f6' },
              { key: 'Confirmed', value: pct(stats?.confirmed || 0), color: '#6366f1' },
            ]
            const W = 640, H = 260, PAD_L = 48, PAD_B = 32, PAD_R = 16, PAD_T = 16
            const plotW = W - PAD_L - PAD_R
            const plotH = H - PAD_T - PAD_B
            const ticks = [0, 20, 40, 60, 80, 100]
            const xStep = plotW / (bars.length * 2)
            const barWidth = Math.max(24, Math.min(56, xStep))
            const xPos = (i: number) => PAD_L + xStep * (1 + 2 * i)
            const yScale = (v: number) => PAD_T + plotH * (1 - v / 100)
            return (
              <div className="w-full overflow-x-auto">
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="260">
                  {/* Background */}
                  <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
                  {/* Grid horizontal lines and Y ticks */}
                  {ticks.map((t, i) => (
                    <g key={`h-${i}`}>
                      <line x1={PAD_L} y1={yScale(t)} x2={W - PAD_R} y2={yScale(t)} stroke="#e5e7eb" strokeWidth={1} />
                      <text x={PAD_L - 8} y={yScale(t) + 4} textAnchor="end" fontSize="10" fill="#6b7280">{t}%</text>
                    </g>
                  ))}
                  {/* Axes */}
                  <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="#111827" strokeWidth={1.2} />
                  <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#111827" strokeWidth={1.2} />
                  {/* Bars */}
                  {bars.map((b, i) => {
                    const x = xPos(i) - barWidth / 2
                    const y = yScale(b.value)
                    const h = (H - PAD_B) - y
                    return (
                      <g key={b.key}>
                        <rect x={x} y={y} width={barWidth} height={h} rx={4} fill={b.color} />
                        <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="#374151">{b.value}%</text>
                        <text x={x + barWidth / 2} y={H - PAD_B + 16} textAnchor="middle" fontSize="11" fill="#374151">{b.key}</text>
                      </g>
                    )
                  })}
                </svg>
                {total === 0 && <div className="mt-2 text-sm text-gray-500">No transfers yet</div>}
              </div>
            )
          })()}
        </Card>
        <Card title="Recent Transfers">
          {recentErr && <div className="mb-2 text-sm text-red-600">{recentErr}</div>}
          <SimpleTable
            density="compact"
            columns={[
              { header: 'Code', key: 'transactionCode' },
              { header: 'Status', key: 'status' },
              { header: 'Qty', key: 'totalQty', className: 'text-right' },
              { header: 'Date', key: 'createdAt' },
            ] as Column<RecentRow>[]}
            data={recent}
          />
        </Card>
      </div>

      {/* Outlets list and details */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Outlets" className="lg:col-span-2">
          {outletsErr && <div className="mb-2 text-sm text-red-600">{outletsErr}</div>}
          <SimpleTable columns={outletCols} data={outletRows} />
        </Card>
        <Card title="Outlet Details">
          {!viewOutlet && <div className="p-2 text-sm text-gray-600">Select an outlet and click View to see details here.</div>}
          {viewOutlet && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-600">Code:</span> {viewOutlet.code}</div>
              <div><span className="text-gray-600">Name:</span> {viewOutlet.name}</div>
              <div><span className="text-gray-600">Email:</span> {viewOutlet.email || '-'}</div>
              <div><span className="text-gray-600">Location:</span> {viewOutlet.location || '-'}</div>
              <div><span className="text-gray-600">Manager:</span> {viewOutlet.manager_name || '-'}</div>
              <div className="col-span-2 mt-2">
                <Button variant="outline" onClick={() => setViewOutlet(null)}>Close</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  )
}
