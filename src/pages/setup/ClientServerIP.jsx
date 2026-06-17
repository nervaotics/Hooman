import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ClientServerIP() {
  const navigate = useNavigate()
  const [ip, setIp] = useState('192.168.0.107')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const testConnection = async () => {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await window.electron.testServerConnection({ ip })
      setMessage('Connection OK')
    } catch (e) {
      setError(e?.message || 'Connection failed')
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await window.electron.setupAsClient({ ip })
      const boot = await window.electron.bootstrapStatus()
      if (boot.needsAdminSetup) navigate('/setup/admin', { replace: true })
      else navigate('/login', { replace: true })
    } catch (e) {
      setError(e?.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
      <h1 className="text-xl font-semibold text-foreground">Client server connection</h1>
      <p className="mt-2 text-sm text-muted">
        Enter the Server PC IP. Default is your office server and can be edited.
      </p>

      <label className="mt-6 grid gap-1 text-sm">
        <span className="text-muted">Server IP</span>
        <input
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          className="rounded-md border border-border bg-sidebar px-3 py-2 text-foreground outline-none focus:border-accent"
          placeholder="192.168.0.107"
          required
        />
      </label>

      {message ? <p className="mt-3 text-sm text-emerald-400">{message}</p> : null}
      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex gap-2">
        <button type="button" disabled={busy} onClick={testConnection} className="btn-primary px-4 py-2">
          Test connection
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-md border border-border bg-sidebar px-4 py-2 text-sm text-foreground hover:bg-white/5"
        >
          Save and continue
        </button>
      </div>
    </div>
  )
}
