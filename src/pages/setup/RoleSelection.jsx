import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function RoleSelection() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const chooseServer = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await window.electron.setupAsServer()
      if (res?.warning) {
        toast.warning(res.warning)
      }
      if (res?.remotePassword) {
        toast.info('Server setup complete. Keep remote DB password saved for IT troubleshooting.')
      }
      const boot = await window.electron.bootstrapStatus()
      if (boot.needsAdminSetup) navigate('/setup/admin', { replace: true })
      else navigate('/login', { replace: true })
    } catch (e) {
      setError(e?.message || 'Server setup failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
      <h1 className="text-xl font-semibold text-foreground">Set up this PC</h1>
      <p className="mt-2 text-sm text-muted">
        Choose whether this machine is the central server or a client connected to the server.
      </p>

      <div className="mt-6 grid gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={chooseServer}
          className="btn-primary w-full py-2"
        >
          This is the Server PC
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => navigate('/setup/client-ip')}
          className="rounded-md border border-border bg-sidebar px-4 py-2 text-sm text-foreground hover:bg-white/5"
        >
          This is a Client PC
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
