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
  email?: string | null
  phone?: string | null
  active: 0 | 1 | boolean
}

export default function OutletEmployees() {
  const { selectedOutlet } = useOrg()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', active: true })
  const [errors, setErrors] = useState<{[k:string]:string}>({})
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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
      if (!outletId) return
      try {
        setLoading(true)
        setErrorMsg(null)
        const { data } = await api.get(employeesUrl, { params: { outletId } })
        if (!ignore) setEmployees(data)
      } catch (e: any) {
        if (!ignore) setErrorMsg(e?.response?.data?.message || 'Failed to load employees')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [employeesUrl, outletId])

  const columns: Column<Employee>[] = [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Phone', key: 'phone' },
    { header: 'Active', key: 'active', render: (r) => (r.active ? 'Yes' : 'No') },
    {
      header: 'Actions', key: 'actions', render: (r) => (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            setEditing(r)
            setForm({ name: r.name, email: r.email || '', phone: r.phone || '', active: !!r.active })
            setOpen(true)
          }}>Edit</Button>
          <Button variant="warning" onClick={async () => {
            try {
              await api.delete(`${employeesUrl}/${r.id}`)
              setEmployees(prev => prev.filter(e => e.id !== r.id))
              setSuccessMsg('Employee removed')
              setTimeout(() => setSuccessMsg(null), 2500)
            } catch (e: any) {
              setErrorMsg(e?.response?.data?.message || 'Failed to remove employee')
            }
          }}>Delete</Button>
        </div>
      )
    },
  ]

  const submitEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    const eobj: {[k:string]:string} = {}
    if (!form.name.trim()) eobj.name = 'Required'
    setErrors(eobj)
    if (Object.keys(eobj).length) return
    try {
      setLoading(true)
      setErrorMsg(null)
      if (!outletId) throw new Error('No outlet selected')
      if (editing) {
        const { data } = await api.put(`${employeesUrl}/${editing.id}`, {
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          active: !!form.active,
        })
        setEmployees(prev => prev.map(e => e.id === editing.id ? data : e))
        setSuccessMsg('Employee updated')
      } else {
        const { data } = await api.post(employeesUrl, {
          outletId,
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        })
        setEmployees(prev => [data, ...prev])
        setSuccessMsg('Employee added')
      }
      setTimeout(() => setSuccessMsg(null), 2500)
      setOpen(false)
      setEditing(null)
      setForm({ name: '', email: '', phone: '', active: true })
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
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Employees" className="lg:col-span-2">
          <div className="mb-3 flex justify-end">
            <Button onClick={() => { setEditing(null); setForm({ name: '', email: '', phone: '', active: true }); setOpen(true) }}>Add Employee</Button>
          </div>
          {errorMsg && <div className="mb-2 text-sm text-red-600">{errorMsg}</div>}
          {successMsg && <div className="mb-2 text-sm text-green-600">{successMsg}</div>}
          <SimpleTable columns={columns} data={employees} keyField="id" />
        </Card>
        <Card title="Tips">
          <ul className="text-sm list-disc pl-5 space-y-2 text-gray-700">
            <li>Use the Sales role for staff who operate the billing counter.</li>
            <li>Deactivate employees who have left to retain their history.</li>
            <li>Performance metrics update with sales activity.</li>
          </ul>
        </Card>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-xl bg-white p-5 shadow-soft">
            <h3 className="text-base font-semibold text-gray-900">{editing ? 'Edit Employee' : 'Add Employee'}</h3>
            <form className="mt-3 grid gap-3" onSubmit={submitEmployee}>
              <Input label="Full Name" value={form.name} onChange={(e: any) => setForm(f => ({...f, name: e.target.value}))} error={errors.name} />
              <Input label="Email" value={form.email} onChange={(e: any) => setForm(f => ({...f, email: e.target.value}))} />
              <Input label="Phone" value={form.phone} onChange={(e: any) => setForm(f => ({...f, phone: e.target.value}))} />
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
