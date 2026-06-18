import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatUserError } from '@/lib/userMessage.js'
import PasswordInput from '@/components/PasswordInput.jsx'

export default function FirstAdminSetup() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const boot = await window.electron.bootstrapStatus()
      if (cancelled) return
      if (!boot.needsAdminSetup) navigate('/login', { replace: true })
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
      await window.electron.createFirstAdmin({ username, password })
      navigate('/login', { replace: true })
    } catch (err) {
      setError(formatUserError(err, 'Could not create the administrator account.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
      <h1 className="text-xl font-semibold text-foreground">
        Create administrator
      </h1>
      <p className="mt-2 text-sm text-muted">
        This screen appears once per database. Choose credentials for the first
        super admin.
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
          <span className="text-muted">Password (min 8)</span>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
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
          className="btn-primary w-full py-2"
        >
          Create admin & go to sign in
        </button>
      </form>
    </div>
  )
}
