import React from 'react'
import Button from '@/components/ui/Button'
import Shell from '@/components/layout/Shell'
import api from '@/api/axios'

export default function EditProfile() {
  const [loading, setLoading] = React.useState(true)
  const [user, setUser] = React.useState<{ name?: string; email?: string; phone?: string } | null>(null)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await api.get('/auth/me')
        if (mounted) setUser({ name: data?.name, email: data?.email, phone: data?.phone })
      } catch {
        if (mounted) setUser({ name: 'User', email: 'user@example.com', phone: '' })
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <Shell>
      <div className="p-4 space-y-4">
        <div className="rounded-md bg-white shadow-soft p-4">
          <h1 className="text-lg font-semibold text-headerBlue">Edit Profile</h1>
          <p className="text-sm text-gray-600">Update your personal information.</p>
        </div>

        <div className="rounded-md bg-white shadow-soft p-4 max-w-xl">
          <div className="grid gap-3">
            <label className="text-sm text-gray-600">Full Name</label>
            <input className="rounded-md border px-3 py-2 text-sm" value={user?.name || ''} onChange={()=>{}} readOnly={loading} />
            <label className="text-sm text-gray-600">Email</label>
            <input className="rounded-md border px-3 py-2 text-sm" value={user?.email || ''} onChange={()=>{}} readOnly={loading} />
            <label className="text-sm text-gray-600">Phone</label>
            <input className="rounded-md border px-3 py-2 text-sm" value={user?.phone || ''} onChange={()=>{}} readOnly={loading} />
            <div className="pt-2">
              <Button disabled>Save</Button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
