import { NavLink, Outlet } from 'react-router-dom'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Super administrator only — database, devices, bulk import, and user access control.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2 text-sm">
        <NavLink
          to="."
          end
          className={({ isActive }) =>
            isActive
              ? 'rounded-md bg-white/5 px-3 py-1 text-foreground'
              : 'rounded-md px-3 py-1 text-muted hover:text-foreground'
          }
        >
          Overview
        </NavLink>
        <NavLink
          to="bulk-import"
          className={({ isActive }) =>
            isActive
              ? 'rounded-md bg-white/5 px-3 py-1 text-foreground'
              : 'rounded-md px-3 py-1 text-muted hover:text-foreground'
          }
        >
          Bulk import
        </NavLink>
        <NavLink
          to="users"
          className={({ isActive }) =>
            isActive
              ? 'rounded-md bg-white/5 px-3 py-1 text-foreground'
              : 'rounded-md px-3 py-1 text-muted hover:text-foreground'
          }
        >
          Users
        </NavLink>
        <NavLink
          to="database"
          className={({ isActive }) =>
            isActive
              ? 'rounded-md bg-white/5 px-3 py-1 text-foreground'
              : 'rounded-md px-3 py-1 text-muted hover:text-foreground'
          }
        >
          Database
        </NavLink>
        <NavLink
          to="devices"
          className={({ isActive }) =>
            isActive
              ? 'rounded-md bg-white/5 px-3 py-1 text-foreground'
              : 'rounded-md px-3 py-1 text-muted hover:text-foreground'
          }
        >
          Devices
        </NavLink>
      </div>

      <Outlet />
    </div>
  )
}
