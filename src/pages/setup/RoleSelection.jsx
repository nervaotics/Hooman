import { useNavigate } from 'react-router-dom'

export default function RoleSelection() {
  const navigate = useNavigate()

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
      <h1 className="text-xl font-semibold text-foreground">Set up this PC</h1>
      <p className="mt-2 text-sm text-muted">
        Choose whether this machine polls biometric devices (Server) or is a regular workstation
        (Client). Both connect to the same Supabase project.
      </p>

      <div className="mt-6 grid gap-3">
        <button
          type="button"
          onClick={() => navigate('/setup/database', { state: { role: 'server' } })}
          className="btn-primary w-full"
        >
          This is the Server PC
        </button>
        <button
          type="button"
          onClick={() => navigate('/setup/database', { state: { role: 'client' } })}
          className="btn-secondary w-full"
        >
          This is a Client PC
        </button>
      </div>
    </div>
  )
}
