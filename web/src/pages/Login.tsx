import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/feedback/Skeleton'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useOrg } from '@/context/org'

export default function Login() {
  const nav = useNavigate()
  const { login, loading } = useAuth()
  const { setRole, outlets, selectedOutletId, setSelectedOutletId } = useOrg()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [roleChoice, setRoleChoice] = useState<'master' | 'admin'>('master')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!email) errs.email = 'Email is required'
    if (!password) errs.password = 'Password is required'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const ok = await login(email, password)
    if (ok) {
      setRole(roleChoice)
      if (roleChoice === 'admin' && !selectedOutletId) {
        setSelectedOutletId(outlets[1]?.id || outlets[0]?.id)
      }
      nav(roleChoice === 'master' ? '/dashboard' : '/sales')
    }
  }

  const quickLogin = async (role: 'master' | 'admin') => {
    setRoleChoice(role)
    setEmail(role === 'master' ? 'master@demo.com' : 'admin@demo.com')
    setPassword('password')
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left: brand + side image */}
        <div className="relative hidden items-center justify-center bg-headerBlue p-8 text-white lg:flex">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 20% 20%, #fff 2px, transparent 2px), radial-gradient(circle at 80% 30%, #fff 2px, transparent 2px)', backgroundSize:'60px 60px'}} />
          <div className="relative z-10 max-w-sm text-center">
            {/* Brand logo */}
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/30">
              <svg width="28" height="28" viewBox="0 0 24 24" className="text-white"><path fill="currentColor" d="M3 18c0-2 3-3 6-3s6 1 6 3v2H3v-2Zm9.5-9.7c.8.8 2.2.8 3 0c.8-.9.8-2.2 0-3c-.8-.8-2.2-.8-3 0c-.8.8-.8 2.1 0 3ZM7 10a2 2 0 1 0 0-4a2 2 0 0 0 0 4Z"/></svg>
            </div>
            <h1 className="mb-2 text-2xl font-semibold">Retail POS</h1>
            <p className="text-white/80">Multi-outlet Point of Sale with centralized inventory and reporting.</p>
            {/* Side image mock (dummy image) */}
            <img
              src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop"
              alt="Retail illustration"
              className="mt-8 h-64 w-full rounded-xl object-cover ring-1 ring-white/20"
              loading="eager"
            />
          </div>
        </div>

        {/* Right: card with image + form */}
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
            {/* Card top: small image */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-headerBlue/10">
                  <svg width="20" height="20" viewBox="0 0 24 24" className="text-headerBlue"><path fill="currentColor" d="M3 18c0-2 3-3 6-3s6 1 6 3v2H3v-2Zm9.5-9.7c.8.8 2.2.8 3 0c.8-.9.8-2.2 0-3c-.8-.8-2.2-.8-3 0c-.8.8-.8 2.1 0 3ZM7 10a2 2 0 1 0 0-4a2 2 0 0 0 0 4Z"/></svg>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Welcome</div>
                  <div className="text-base font-semibold text-gray-900">Sign in to continue</div>
                </div>
              </div>
              {/* decorative card image (dummy) */}
              <img
                src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=400&auto=format&fit=crop"
                alt="Dashboard preview"
                className="h-12 w-20 rounded-md object-cover"
              />
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                {/* Role selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setRoleChoice('master')} className={`rounded-md border px-3 py-2 text-sm ${roleChoice==='master' ? 'border-teal bg-teal/10 text-teal' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Master</button>
                  <button type="button" onClick={() => setRoleChoice('admin')} className={`rounded-md border px-3 py-2 text-sm ${roleChoice==='admin' ? 'border-teal bg-teal/10 text-teal' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Outlet Admin</button>
                </div>

                {roleChoice === 'admin' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Outlet</label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none"
                      value={selectedOutletId}
                      onChange={(e) => setSelectedOutletId(e.target.value)}
                    >
                      {outlets.map(o => (
                        <option key={o.id} value={o.id}>{o.code} — {o.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <Input
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                />
                <Input
                  type="password"
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Sign In
                </Button>

                {/* Demo logins */}
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <Button type="button" variant="outline" onClick={() => quickLogin('master')}>Demo Master</Button>
                  <Button type="button" variant="outline" onClick={() => quickLogin('admin')}>Demo Outlet Admin</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
