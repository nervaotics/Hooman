import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatUserError } from '@/lib/userMessage.js'
import { isElectron } from '@/lib/electron.js'
import PasswordInput from '@/components/PasswordInput.jsx'

export default function DatabaseSetup() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = location.state?.role || null
  const inDesktop = isElectron()
  const [form, setForm] = useState({
    url: '',
    dbPassword: '',
    dbHost: '',
    anonKey: '',
    serviceRoleKey: '',
    dbPasswordIsSet: false,
    anonKeyIsSet: false,
    serviceRoleKeyIsSet: false,
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!inDesktop) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const cfg = await window.electron.getDbConfig()
        const sb = cfg?.supabase
        if (cancelled) return
        if (sb) {
          setForm((f) => ({
            ...f,
            url: String(sb.url ?? f.url),
            dbHost: String(sb.dbHost ?? f.dbHost),
            dbPasswordIsSet: Boolean(sb.dbPasswordIsSet),
            anonKeyIsSet: Boolean(sb.anonKeyIsSet),
            serviceRoleKeyIsSet: Boolean(sb.serviceRoleKeyIsSet),
          }))
          if (sb.dbHost) setShowAdvanced(true)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [inDesktop])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const payload = () => ({
    url: form.url.trim(),
    dbPassword: form.dbPassword.trim() || undefined,
    dbHost: form.dbHost.trim() || undefined,
    anonKey: form.anonKey.trim() || undefined,
    serviceRoleKey: form.serviceRoleKey.trim() || undefined,
  })

  const test = async () => {
    if (!window.electron) return
    setBusy(true)
    setMessage('')
    try {
      await window.electron.testSupabaseConnection(payload())
      setMessage('Connection OK')
    } catch (e) {
      setMessage(formatUserError(e, 'Could not connect to Supabase.'))
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!window.electron) return
    setBusy(true)
    setMessage('')
    try {
      const data = payload()
      if (role === 'server') {
        await window.electron.setupAsServer(data)
      } else if (role === 'client') {
        await window.electron.setupAsClient(data)
      } else {
        await window.electron.saveSupabaseConfig(data)
      }
      const boot = await window.electron.bootstrapStatus()
      if (boot.needsAdminSetup) navigate('/setup/admin', { replace: true })
      else navigate('/login', { replace: true })
    } catch (e) {
      setMessage(formatUserError(e, 'Could not save Supabase settings.'))
    } finally {
      setBusy(false)
    }
  }

  const title =
    role === 'server'
      ? 'Connect Supabase (Server PC)'
      : role === 'client'
        ? 'Connect Supabase (Client PC)'
        : 'Connect Supabase'

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>

      {!inDesktop ? (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
          <p className="font-medium">Use the Hooman desktop window — not the browser.</p>
        </div>
      ) : null}

      <p className="mt-2 text-sm text-muted">
        {role === 'server'
          ? 'Use your API Project URL and database password from Supabase (Settings → API, and Settings → Database).'
          : 'All HRM data is stored in Supabase. Enter your project URL and database password.'}
      </p>

      <div className="mt-6 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Project URL</span>
          <input
            name="url"
            value={form.url}
            onChange={onChange}
            placeholder="https://abcdefghijklmnop.supabase.co"
            className="rounded-md border border-border bg-sidebar px-3 py-2 text-foreground outline-none focus:border-accent"
          />
          <span className="text-xs text-muted">
            From Supabase → Settings → API → Project URL (not the dashboard link).
          </span>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted">Database password</span>
          <PasswordInput
            name="dbPassword"
            value={form.dbPassword}
            onChange={onChange}
            placeholder={
              form.dbPasswordIsSet
                ? 'Leave blank to keep saved password'
                : 'From Settings → Database → Database password'
            }
          />
        </label>

        <button
          type="button"
          className="text-left text-xs text-accent hover:underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced connection options
        </button>

        {showAdvanced ? (
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Database host (optional)</span>
            <input
              name="dbHost"
              value={form.dbHost}
              onChange={onChange}
              placeholder="db.your-ref.supabase.co or aws-0-….pooler.supabase.com"
              className="rounded-md border border-border bg-sidebar px-3 py-2 text-foreground outline-none focus:border-accent"
            />
            <span className="text-xs text-muted">
              Leave blank for default db.YOUR-REF.supabase.co. If test fails with “cannot find server”, paste the
              Session pooler host from Settings → Database → Connection string (port 5432).
            </span>
          </label>
        ) : null}

        <label className="grid gap-1 text-sm">
          <span className="text-muted">Anon key (optional — for Realtime)</span>
          <PasswordInput
            name="anonKey"
            value={form.anonKey}
            onChange={onChange}
            placeholder={form.anonKeyIsSet ? 'Leave blank to keep saved key' : 'Settings → API → anon public'}
          />
        </label>
        {role === 'server' ? (
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Service role key (optional — Realtime on server)</span>
            <PasswordInput
              name="serviceRoleKey"
              value={form.serviceRoleKey}
              onChange={onChange}
              placeholder={
                form.serviceRoleKeyIsSet ? 'Leave blank to keep saved key' : 'Settings → API → service_role'
              }
            />
          </label>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 text-sm text-warning" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={test} className="btn-secondary disabled:opacity-50">
          Test connection
        </button>
        <button type="button" disabled={busy} onClick={save} className="btn-primary">
          Save & continue
        </button>
      </div>
    </div>
  )
}
