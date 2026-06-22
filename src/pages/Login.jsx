import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatUserError } from '@/lib/userMessage.js'
import { useAuthStore } from '@/store/authStore.js'
import PasswordInput from '@/components/PasswordInput.jsx'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const boot = await window.electron.bootstrapStatus()
        if (cancelled) return
        if (boot.needsRoleSetup) {
          navigate('/setup/role', { replace: true })
          return
        }
        if (!boot.hasDbConfig || !boot.dbReachable || boot.migrationError) {
          navigate('/setup/database', { replace: true })
          return
        }
        if (boot.needsAdminSetup) {
          navigate('/setup/admin', { replace: true })
        }
      } catch {
        if (!cancelled) navigate('/setup/role', { replace: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await window.electron.login({ username, password })
      setSession(res.user, res.token)
      const afterLogout = location.state?.afterLogout
      const from = location.state?.from
      const dest =
        afterLogout || !from || from === '/login'
          ? '/'
          : from
      navigate(dest, { replace: true })
    } catch (err) {
      setError(formatUserError(err, 'Could not sign in. Check your username and password.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
      <h1 className="text-xl font-semibold text-foreground">Sign in to Hooman</h1>
      <p className="mt-2 text-sm text-muted">
        Use your Hooman account on the shared database.
      </p>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-md border border-border bg-sidebar px-3 py-2 text-foreground outline-none focus:border-accent"
            autoComplete="username"
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Password</span>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full"
        >
          Sign in
        </button>
      </form>
    </div>
  )
}
