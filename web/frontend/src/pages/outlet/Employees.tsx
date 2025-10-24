import { useEffect, useMemo, useState } from 'react'
import Shell from '@/components/layout/Shell'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import SimpleTable, { Column } from '@/components/tables/SimpleTable'
import { useOrg } from '@/context/org'
import api from '@/api/axios'

export type Employee = {
  id: number
  outletId: number
  name: string
  role?: 'cashier' | 'salesperson' | 'supervisor' | string | null
  email?: string | null
  phone?: string | null
  joinDate?: string | null
  active: 0 | 1 | boolean
}

export default function OutletEmployees() {
  const { selectedOutlet } = useOrg()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({ name: '', role: 'salesperson', email: '', phone: '', joinDate: '', active: true })
  const [errors, setErrors] = useState<{[k:string]:string}>({})
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [filters, setFilters] = useState<{ q?: string; role?: string; status?: string; from?: string; to?: string }>({})

  const outletId = selectedOutlet?.id ? Number(selectedOutlet.id) : null

  const employeesUrl = useMemo(() => {
    const base = String(api.defaults.baseURL || '')
    const baseWithSlash = base.endsWith('/') ? base : base + '/'
    if (/\/api\/?$/.test(base)) return new URL('employees', baseWithSlash).toString()
    return '/api/employees'
  }, [])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        setLoading(true)
        setErrorMsg(null)
        const params = { ...(outletId ? { outletId } : {}), ...(filters.q ? { q: filters.q } : {}), ...(filters.role ? { role: filters.role } : {}), ...(filters.status ? { status: filters.status } : {}), ...(filters.from ? { from: filters.from } : {}), ...(filters.to ? { to: filters.to } : {}) }
        const { data } = await api.get(employeesUrl, { params })
        if (!ignore) setEmployees(data)
      } catch (e: any) {
        if (!ignore) setErrorMsg(e?.response?.data?.message || 'Failed to load employees')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [employeesUrl, outletId, filters])

  const columns: Column<Employee>[] = [
    { header: 'ID', key: 'id', className: 'w-14' },
    { header: 'Name', key: 'name', className: 'max-w-[180px] break-words' },
    { header: 'Role', key: 'role', className: 'w-24', render: (r) => (r.role ? (r.role.charAt(0).toUpperCase()+r.role.slice(1)) : '-') },
    { header: 'Contact', key: 'phone', className: 'w-32', render: (r) => r.phone || '-' },
    { header: 'Email', key: 'email', className: 'max-w-[260px] break-all', render: (r) => <span className="block whitespace-normal break-all">{r.email || '-'}</span> },
    { header: 'Join Date', key: 'joinDate', className: 'w-28', render: (r) => r.joinDate ? new Date(r.joinDate).toLocaleDateString() : '-' },
    { header: 'Status', key: 'active', className: 'w-20', render: (r) => (r.active ? 'Active' : 'Inactive') },
    {
      header: 'Actions', key: 'actions', className: 'w-40', render: (r) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="px-2 py-1 text-xs"
            onClick={() => {
              setEditing(r)
              setForm({ name: r.name, role: (r.role as any) || 'salesperson', email: r.email || '', phone: r.phone || '', joinDate: r.joinDate || '', active: !!r.active })
              setOpen(true)
            }}
          >Edit</Button>
          <Button
            variant="warning"
            className="px-2 py-1 text-xs"
            onClick={async () => {
              try {
                await api.delete(`${employeesUrl}/${r.id}`)
                setEmployees(prev => prev.filter(e => e.id !== r.id))
                setSuccessMsg('Employee removed')
                setTimeout(() => setSuccessMsg(null), 2500)
              } catch (e: any) {
                setErrorMsg(e?.response?.data?.message || 'Failed to remove employee')
              }
            }}
          >Delete</Button>
        </div>
      )
    },
  ]

  const submitEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    const eobj: {[k:string]:string} = {}
    if (!form.name.trim()) eobj.name = 'Required'
    if (!form.role) eobj.role = 'Required'
    setErrors(eobj)
    if (Object.keys(eobj).length) return
    try {
      setLoading(true)
      setErrorMsg(null)
      if (editing) {
        const { data } = await api.put(`${employeesUrl}/${editing.id}`, {
          name: form.name.trim(),
          role: form.role,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          joinDate: form.joinDate || null,
          active: !!form.active,
        })
        setEmployees(prev => prev.map(e => e.id === editing.id ? data : e))
        setSuccessMsg('Employee updated')
      } else {
        const { data } = await api.post(employeesUrl, {
          name: form.name.trim(),
          role: form.role,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          joinDate: form.joinDate || null,
          active: !!form.active,
        })
        setEmployees(prev => [data, ...prev])
        setSuccessMsg('Employee added')
      }
      setTimeout(() => setSuccessMsg(null), 2500)
      setOpen(false)
      setEditing(null)
      setForm({ name: '', role: 'salesperson', email: '', phone: '', joinDate: '', active: true })
      setErrors({})
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to save employee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell>
      <PageHeader
        title={selectedOutlet ? `${selectedOutlet.name} — Employees` : 'Employees'}
        subtitle="Manage your outlet employees and track their performance."
      />
      <div className="grid gap-4">
        <Card title="Employees">
          {/* Filters */}
          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-5">
            <input className="input-base md:col-span-2" placeholder="Search by name, email or phone" value={filters.q || ''} onChange={(e) => setFilters(f => ({...f, q: e.target.value}))} />
            <select className="input-base" value={filters.role || ''} onChange={(e) => setFilters(f => ({...f, role: e.target.value || undefined}))}>
              <option value="">All Roles</option>
              <option value="cashier">Cashier</option>
              <option value="salesperson">Salesperson</option>
              <option value="supervisor">Supervisor</option>
            </select>
            <select className="input-base" value={filters.status || ''} onChange={(e) => setFilters(f => ({...f, status: e.target.value || undefined}))}>
              <option value="">Any Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <input type="date" className="input-base" value={filters.from || ''} onChange={(e) => setFilters(f => ({...f, from: e.target.value || undefined}))} />
          </div>
          <div className="mb-3 flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setFilters({})}>Clear</Button>
              <Button variant="outline" onClick={() => { /* triggers effect via state change */ setFilters(f => ({...f})) }}>Refresh</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                // Export CSV
                const rows = employees
                const header = ['ID','Name','Role','Phone','Email','Join Date','Status']
                const csv = [header.join(','), ...rows.map(r => [r.id, `"${r.name}"`, r.role||'', r.phone||'', r.email||'', r.joinDate||'', r.active? 'Active':'Inactive'].join(','))].join('\n')
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'employees.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}>Export CSV</Button>
              <Button onClick={() => { setEditing(null); setForm({ name: '', role: 'salesperson', email: '', phone: '', joinDate: '', active: true }); setOpen(true) }}>Add Employee</Button>
            </div>
          </div>
          {errorMsg && <div className="mb-2 text-sm text-red-600">{errorMsg}</div>}
          {successMsg && <div className="mb-2 text-sm text-green-600">{successMsg}</div>}
          <SimpleTable columns={columns} data={employees} keyField="id" density="compact" />
        </Card>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl bg-white p-5 shadow-soft">
            <h3 className="text-base font-semibold text-gray-900">{editing ? 'Edit Employee' : 'Add Employee'}</h3>
            <form className="mt-3 grid gap-3" onSubmit={submitEmployee}>
              <Input label="Full Name" value={form.name} onChange={(e: any) => setForm(f => ({...f, name: e.target.value}))} error={errors.name} />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Role / Designation</label>
                <select className="input-base" value={form.role} onChange={(e) => setForm(f => ({...f, role: e.target.value as any}))}>
                  <option value="cashier">Cashier</option>
                  <option value="salesperson">Salesperson</option>
                  <option value="supervisor">Supervisor</option>
                </select>
                {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role}</p>}
              </div>
              <Input label="Email" value={form.email} onChange={(e: any) => setForm(f => ({...f, email: e.target.value}))} />
              <Input label="Phone" value={form.phone} onChange={(e: any) => setForm(f => ({...f, phone: e.target.value}))} />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Date of Joining</label>
                <input type="date" className="input-base" value={form.joinDate} onChange={(e) => setForm(f => ({...f, joinDate: e.target.value}))} />
              </div>
              <div className="flex items-center gap-2">
                <input id="active" type="checkbox" checked={!!form.active} onChange={(e) => setForm(f => ({...f, active: e.target.checked}))} />
                <label htmlFor="active" className="text-sm text-gray-700">Active</label>
              </div>
              <div className="mt-1 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (editing ? 'Save' : 'Add')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  )
}
