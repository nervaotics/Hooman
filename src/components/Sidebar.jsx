import { NavLink, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import {
  LayoutDashboard,
  Building2,
  Users,
  Clock,
  Palmtree,
  Wallet,
  Briefcase,
  LineChart,
  AlertTriangle,
  DoorOpen,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils.js'
import { useAuthStore } from '@/store/authStore.js'
import { canRead, isSuperAdmin } from '@/lib/permissions.js'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, visible: () => true },
  {
    to: '/recruitment',
    label: 'Recruitment',
    icon: Briefcase,
    module: 'employee_data',
  },
  { to: '/employees', label: 'Employees', icon: Users, module: 'employee_data' },
  { to: '/organization', label: 'Departments & Sites', icon: Building2, module: 'employee_data' },
  { to: '/attendance', label: 'Attendance', icon: Clock, module: 'employee_data' },
  { to: '/leaves', label: 'Leaves', icon: Palmtree, module: 'employee_data' },
  { to: '/payroll', label: 'Payroll', icon: Wallet, module: 'payroll_processing' },
  { to: '/performance', label: 'Performance', icon: LineChart, visible: () => true },
  { to: '/disciplinary', label: 'Disciplinary', icon: AlertTriangle, visible: () => true },
  { to: '/offboarding', label: 'Offboarding', icon: DoorOpen, visible: () => true },
  { to: '/settings', label: 'Settings', icon: Settings, superAdmin: true },
]

export default function Sidebar({ footer }) {
  const user = useAuthStore((s) => s.user)

  const items = useMemo(() => {
    return nav.filter((item) => {
      if (item.superAdmin) return isSuperAdmin(user)
      if (item.module) return canRead(user, item.module)
      if (item.visible) return item.visible(user)
      return true
    })
  }, [user])

  const location = useLocation()

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="shrink-0 border-b border-border px-4 py-4">
        <div className="text-lg font-semibold tracking-tight text-foreground">Hooman</div>
        <div className="mt-1 inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted">
          v0.1.0
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors',
                (isActive ||
                  (item.to !== '/' && location.pathname.startsWith(item.to))) &&
                  'border-l-2 border-accent bg-white/5 pl-[10px] text-foreground',
                !isActive &&
                  !(item.to !== '/' && location.pathname.startsWith(item.to)) &&
                  'border-l-2 border-transparent hover:bg-white/5',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {footer ? (
        <div className="shrink-0 border-t border-border p-3">{footer}</div>
      ) : null}
    </aside>
  )
}
