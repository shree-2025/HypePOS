import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/feedback/Skeleton'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import api from '@/api/axios'
import { useOrg } from '@/context/org'
import logo from '@/public/hype_logo.png'
import Alert from '@/components/ui/Alert'
import loginBg from '@/public/login bg.jpg'

export default function Login() {
  const nav = useNavigate()
  const { login, loading } = useAuth()
  const { setRole, outlets, setOutlets, selectedOutletId, setSelectedOutletId } = useOrg()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [roleChoice, setRoleChoice] = useState<'master' | 'admin' | 'distributor' | 'salers'>('master')
  const [formError, setFormError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!email) errs.email = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email'
    if (!password) errs.password = 'Password is required'
    else if (password.length < 6) errs.password = 'Minimum 6 characters'
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      const result = await login(email, password, roleChoice)
      if (!result.ok) {
        const msg = String((result as any)?.message || 'Invalid email or password or role')
        setFormError(msg)
        const m = msg.toLowerCase()
        const fieldErrs: typeof errors = {}
        if (m.includes('email')) fieldErrs.email = 'Invalid email'
        if (m.includes('password')) fieldErrs.password = 'Invalid password'
        if (!fieldErrs.email && !fieldErrs.password) {
          // Generic highlight when server doesn't specify the field
          fieldErrs.email = ' '
          fieldErrs.password = ' '
        }
        setErrors(fieldErrs)
        return
      }
      // If first login with temporary password, force reset
      if (result.mustChangePassword) {
        return nav('/reset-password', { replace: true })
      }
      // Map selected role to org role; for Sales, grant distributor-level access
      if (roleChoice === 'salers') setRole('distributor')
      else setRole(roleChoice)
      // Auto-select outlet for Outlet Admin by email
      if (roleChoice === 'admin') {
        try {
          const { data } = await api.get('/api/outlets', { params: { email } })
          if (Array.isArray(data) && data.length) {
            const list = data.map((o: any) => ({ id: String(o.id), name: o.name, code: o.code }))
            setOutlets(list)
            setSelectedOutletId(String(list[0].id))
          }
        } catch {}
      } else if ((roleChoice === 'distributor' || roleChoice === 'salers') && !selectedOutletId) {
        setSelectedOutletId(outlets[1]?.id || outlets[0]?.id)
      }
      nav(roleChoice === 'salers' ? '/sales' : '/dashboard', { replace: true })
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed'
      setFormError(String(msg))
    }
  }


  return (
    <div
      className="relative min-h-screen"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Decorative background: subtle grid pattern + soft blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)",
            backgroundSize: '22px 22px',
          }}
        />
        {/* Soft blobs */}
        <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-gradient-to-br from-black/10 to-black/0 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-tr from-gray-400/20 to-white/0 blur-3xl" />
        {/* Centered vector halo behind card */}
        <div
          className="absolute left-1/2 top-1/2 h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle at center, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.02) 45%, transparent 60%)',
            filter: 'blur(2px)'
          }}
        />
      </div>
      <div className="relative flex min-h-screen items-center justify-center p-6">
        {/* Single centered card */}
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur-sm">
          {/* Header: black with white text */}
          <div className="bg-black px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <img src={logo} alt="HypePOS" className="h-16 w-16 object-contain" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/70">Welcome</div>
                <div className="text-xl font-semibold leading-tight">Sign in to HYPEPOS</div>
              </div>
            </div>
          </div>
          {/* Body */}
          <div className="p-6">
            {formError && (
              <div className="mb-4">
                <Alert variant="warning" title={formError} />
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                {/* Role dropdown */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none"
                    value={roleChoice}
                    onChange={(e) => setRoleChoice(e.target.value as any)}
                  >
                    <option value="master">Master Head Office </option>
                    <option value="distributor">Distribution Center</option>
                    <option value="admin">POS</option>
                    <option value="salers">Sales</option>
                  </select>
                </div>

                {/* Outlet selector removed per request; default outlet set automatically on submit */}

                <Input
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                />
                <Input
                  type={showPass ? 'text' : 'password'}
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="p-1 focus:outline-none focus:ring-2 focus:ring-primary-300 rounded"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                      title={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? (
                        // Eye off icon
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.62-1.44 1.5-2.75 2.57-3.86" />
                          <path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" />
                          <path d="M23 12c-.62 1.44-1.5 2.75-2.57 3.86" />
                          <path d="M14.12 14.12 20 20" />
                          <path d="M3 3l5.88 5.88" />
                        </svg>
                      ) : (
                        // Eye icon
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  }
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Sign In
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
