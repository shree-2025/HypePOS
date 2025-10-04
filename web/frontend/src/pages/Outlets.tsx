import { useEffect, useMemo, useState } from 'react'
import Shell from '@/components/layout/Shell'
import Card from '@/components/ui/Card'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import Button from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import { useOrg } from '@/context/org'
import PageHeader from '@/components/layout/PageHeader'
import Input from '@/components/ui/Input'
import api from '@/api/axios'

export default function Outlets() {
  const { outlets } = useOrg()

  type Row = { id: number; code: string; name: string; managerName: string; email: string; location?: string | null; createdAt?: string }
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [managerName, setManagerName] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  const [errors, setErrors] = useState<{ code?: string; name?: string; managerName?: string; email?: string; location?: string }>({})

  const outletsUrl = useMemo(() => {
    try {
      const base = String(api.defaults.baseURL || '')
      if (/\/api\/?$/.test(base)) {
        const baseWithSlash = base.endsWith('/') ? base : base + '/'
        return new URL('outlets', baseWithSlash).toString()
      }
      return '/api/outlets'
    } catch {
      return '/api/outlets'
    }
  }, [])

  useEffect(() => {
    let ignore = false
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get(outletsUrl)
        if (!ignore) setRows(res.data)
      } catch (e: any) {
        if (!ignore) setError(e?.response?.data?.message || 'Failed to load outlets')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [outletsUrl])

  const columns: Column<Row>[] = [
    { header: 'Code', key: 'code' },
    { header: 'Outlet', key: 'name' },
    { header: 'Manager', key: 'managerName' },
    { header: 'Email', key: 'email' },
    { header: 'Location', key: 'location' },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <Link to={`/outlets/${row.id}`}>
          <Button variant="outline">View</Button>
        </Link>
      )
    },
  ]

  return (
    <Shell>
      <PageHeader
        title="Outlets"
        subtitle="Manage your shops and view stock, sales and remaining inventory."
        actions={<Button variant="primary" onClick={() => setOpen(true)}>Add Outlet</Button>}
      />
      <Card>
        {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
        {success && <div className="mb-2 text-sm text-green-600">{success}</div>}
        <SimpleTable columns={columns} data={rows} />
      </Card>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900">Add Outlet</h2>
            <p className="mt-1 text-sm text-gray-500">Create a new outlet. An email with login and a temporary password will be sent.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const errs: typeof errors = {}
                if (!code) errs.code = 'Code is required'
                if (!name) errs.name = 'Outlet name is required'
                if (!managerName) errs.managerName = 'Manager name is required'
                if (!email) errs.email = 'Email is required'
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address'
                setErrors(errs)
                if (Object.keys(errs).length) return

                ;(async () => {
                  try {
                    setLoading(true)
                    const res = await api.post(outletsUrl, { code, name, managerName, email, location })
                    setRows(prev => [...prev, res.data])
                    setOpen(false)
                    setCode('')
                    setName('')
                    setManagerName('')
                    setEmail('')
                    setLocation('')
                    setErrors({})
                    setSuccess('Outlet created successfully. Email sent if SMTP is configured.')
                    setTimeout(() => setSuccess(null), 4000)
                  } catch (e: any) {
                    setError(e?.response?.data?.message || 'Failed to create outlet')
                  } finally {
                    setLoading(false)
                  }
                })()
              }}
            >
              <Input label="Code" value={code} onChange={(e: any) => setCode(e.target.value)} placeholder="S03" error={errors.code} />
              <Input label="Outlet Name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Outlet 03" error={errors.name} />
              <Input label="Manager Name" value={managerName} onChange={(e: any) => setManagerName(e.target.value)} placeholder="John Doe" error={errors.managerName} />
              <Input label="Email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="outlet@example.com" error={errors.email} />
              <Input label="Location" value={location} onChange={(e: any) => setLocation(e.target.value)} placeholder="City / Address" error={errors.location} />
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  )
}
