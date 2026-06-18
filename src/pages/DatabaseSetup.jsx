import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatUserError } from '@/lib/userMessage.js'
import { isElectron } from '@/lib/electron.js'
import PasswordInput from '@/components/PasswordInput.jsx'

export default function DatabaseSetup() {
  const navigate = useNavigate()
  const inDesktop = isElectron()
  const [form, setForm] = useState({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'hooman_hrm',
    passwordIsSet: false,
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!inDesktop) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const cfg = await window.electron.getDbConfig()
        const m = cfg?.merged || {}
        if (cancelled) return
        setForm((f) => ({
          ...f,
          host: String(m.host ?? f.host),
          port: Number(m.port ?? f.port),
          user: String(m.user ?? f.user),
          password: '',
          database: String(m.database ?? f.database),
          passwordIsSet: Boolean(m.passwordIsSet),
        }))
      } catch {
        /* ignore — wizard still usable */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [inDesktop])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: name === 'port' ? Number(value) || 0 : value,
    }))
  }

  const test = async () => {
    if (!window.electron) return
    setBusy(true)
    setMessage('')
    try {
      await window.electron.testDbConnection(form)
      setMessage('Connection OK')
    } catch (e) {
      setMessage(formatUserError(e, 'Could not connect to the database.'))
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!window.electron) return
    setBusy(true)
    setMessage('')
    try {
      await window.electron.saveDbConfig(form)
      const boot = await window.electron.bootstrapStatus()
      if (boot.needsAdminSetup) navigate('/setup/admin', { replace: true })
      else navigate('/login', { replace: true })
    } catch (e) {
      setMessage(formatUserError(e, 'Could not save database settings.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
      <h1 className="text-xl font-semibold text-foreground">Connect database</h1>

      {!inDesktop ? (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
          <p className="font-medium">Use the Hooman desktop window — not the browser.</p>
          <p className="mt-2 text-muted">
            You opened <code className="text-foreground">localhost:5173</code> in a browser.
            Hooman only works inside Electron. Stop this tab, run{' '}
            <code className="text-foreground">npm run dev</code> in the project folder, and use
            the <strong>Hooman</strong> window that opens automatically.
          </p>
        </div>
      ) : null}

      <p className="mt-2 text-sm text-muted">
        Point every Hooman workstation at your central MySQL server. Values here
        override <span className="text-foreground">.env</span> on this machine.
      </p>

      <div className="mt-6 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Host</span>
          <input
            name="host"
            value={form.host}
            onChange={onChange}
            className="rounded-md border border-border bg-sidebar px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Port</span>
          <input
            name="port"
            type="number"
            value={form.port}
            onChange={onChange}
            className="rounded-md border border-border bg-sidebar px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">User</span>
          <input
            name="user"
            value={form.user}
            onChange={onChange}
            className="rounded-md border border-border bg-sidebar px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Password</span>
          <PasswordInput
            name="password"
            value={form.password}
            onChange={onChange}
            placeholder={
              form.passwordIsSet
                ? 'Leave blank to keep the saved password'
                : 'Optional for local dev'
            }
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Database</span>
          <input
            name="database"
            value={form.database}
            onChange={onChange}
            className="rounded-md border border-border bg-sidebar px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>
      </div>

      {message ? (
        <p className="mt-4 text-sm text-warning" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={test}
          className="btn-secondary disabled:opacity-50"
        >
          Test connection
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="btn-primary"
        >
          Save & continue
        </button>
      </div>
    </div>
  )
}
