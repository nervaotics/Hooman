import { Navigate } from 'react-router-dom'

/** Legacy route — LAN MySQL client setup replaced by Supabase. */
export default function ClientServerIP() {
  return <Navigate to="/setup/database" replace state={{ role: 'client' }} />
}
