import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore.js'
import { canRead, canWrite, isSuperAdmin } from '@/lib/permissions.js'

export function RequireSuperAdmin() {
  const user = useAuthStore((s) => s.user)
  if (!isSuperAdmin(user)) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

export function RequireModuleAccess({ module, level = 'read', children }) {
  const user = useAuthStore((s) => s.user)
  const allowed = level === 'write' ? canWrite(user, module) : canRead(user, module)
  if (!allowed) {
    return <Navigate to="/" replace />
  }
  return children ?? <Outlet />
}
