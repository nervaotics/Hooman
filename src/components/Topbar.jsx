import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore.js'
import { useNavigate } from 'react-router-dom'

export default function Topbar() {
  const user = useAuthStore((s) => s.user)
  const clearSession = useAuthStore((s) => s.clearSession)
  const navigate = useNavigate()

  return (
    <header className="z-10 flex shrink-0 items-center justify-between border-b border-border bg-sidebar px-6 py-3">
      <div className="text-sm text-muted">Asia/Karachi · UTC storage</div>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <div className="font-medium text-foreground">{user?.username}</div>
          <div className="text-xs text-muted">{user?.role}</div>
        </div>
        <button
          type="button"
          className="btn-secondary bg-sidebar"
          onClick={async () => {
            await window.electron?.logout?.()
            navigate('/login', { replace: true, state: { afterLogout: true } })
            clearSession()
          }}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </header>
  )
}
