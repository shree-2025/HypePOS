import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import api from '@/api/axios'

export default function ResetPassword() {
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!password || password.length < 6) return setError('Password must be at least 6 characters')
    if (password !== confirm) return setError('Passwords do not match')
    setLoading(true)
    try {
      await api.post('/auth/change-password', { newPassword: password })
      try { localStorage.setItem('mustChangePassword', 'false') } catch {}
      nav('/dashboard', { replace: true })
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
        <h1 className="text-xl font-semibold mb-1">Set a new password</h1>
        <p className="text-sm text-gray-600 mb-4">For security, please change your temporary password.</p>
        {error && <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input type="password" label="New Password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input type="password" label="Confirm Password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <Button type="submit" className="w-full" loading={loading}>Update Password</Button>
        </form>
      </div>
    </div>
  )
}
