import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore.js'

export default function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hydrated = useAuthStore((s) => s.hydrated)
  const restoreTokenFromDisk = useAuthStore((s) => s.restoreTokenFromDisk)
  const applyUser = useAuthStore((s) => s.applyUser)
  const clearSession = useAuthStore((s) => s.clearSession)
  const setHydrated = useAuthStore((s) => s.setHydrated)

  const [boot, setBoot] = useState(null)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        restoreTokenFromDisk()
        if (!window.electron?.bootstrapStatus) {
          setBoot({
            hasDbConfig: false,
            dbReachable: false,
            needsAdminSetup: false,
            hasUsers: false,
            needsDatabaseSetup: true,
            error: 'Not running inside Electron',
          })
          setHydrated(true)
          return
        }

        const b = await window.electron.bootstrapStatus()
        if (cancelled) return
        setBoot(b)

        const token = useAuthStore.getState().token
        const setupIncomplete = b.needsRoleSetup || !b.hasDbConfig || !b.dbReachable || b.migrationError

        if (token && setupIncomplete) {
          clearSession()
          window.electron?.setAuthToken?.(null)
        } else if (token) {
          try {
            const s = await window.electron.session()
            if (s.user) applyUser(s.user)
            else clearSession()
          } catch {
            clearSession()
            window.electron?.setAuthToken?.(null)
          }
        }
      } catch {
        if (!cancelled) {
          setBoot({
            hasDbConfig: false,
            dbReachable: false,
            needsAdminSetup: false,
            hasUsers: false,
            needsRoleSetup: true,
            needsDatabaseSetup: true,
          })
        }
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applyUser, clearSession, restoreTokenFromDisk, setHydrated])

  if (!hydrated || !boot) {
    return (
      <div className="flex min-h-full items-center justify-center bg-surface text-muted">
        Starting Hooman…
      </div>
    )
  }

  if (boot.needsRoleSetup) {
    return <Navigate to="/setup/role" replace />
  }

  if (!boot.hasDbConfig || !boot.dbReachable || boot.migrationError) {
    return (
      <Navigate
        to="/setup/database"
        replace
        state={{ boot, from: location.pathname }}
      />
    )
  }

  if (boot.needsAdminSetup) {
    return <Navigate to="/setup/admin" replace />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
