import { useNavigate } from 'react-router-dom'

export default function DatabaseSettings() {
  const navigate = useNavigate()
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted">
      <p>
        Use the full database wizard to change host, credentials, or database
        name. That flow tests the connection and reapplies migrations.
      </p>
      <button
        type="button"
        className="btn-primary mt-4"
        onClick={() => navigate('/setup/database')}
      >
        Open database setup
      </button>
    </div>
  )
}
