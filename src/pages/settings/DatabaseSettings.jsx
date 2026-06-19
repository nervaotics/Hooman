import { useNavigate } from 'react-router-dom'

export default function DatabaseSettings() {
  const navigate = useNavigate()
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted">
      <p>
        Change your Supabase project URL, database password, or API keys. The wizard tests the
        connection and reapplies the schema if needed.
      </p>
      <button
        type="button"
        className="btn-primary mt-4"
        onClick={() => navigate('/setup/database')}
      >
        Open Supabase setup
      </button>
    </div>
  )
}
