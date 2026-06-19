import { NavLink, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import {
  LayoutDashboard,
  Building2,
  Users,
  Clock,
  Wallet,
  BookOpen,
  Briefcase,
  LineChart,
  AlertTriangle,
  DoorOpen,
  Settings,
  PanelLeftClose,
  PanelLeft,
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
  { to: '/organization', label: 'Departments & Sites', icon: Building2, superAdmin: true },
  { to: '/attendance', label: 'Attendance', icon: Clock, module: 'employee_data' },
  { to: '/payroll', label: 'Payroll', icon: Wallet, module: 'payroll_processing' },
  { to: '/accounting', label: 'Accounting', icon: BookOpen, module: 'accounting' },
  { to: '/performance', label: 'Performance', icon: LineChart, visible: () => true },
  { to: '/disciplinary', label: 'Disciplinary', icon: AlertTriangle, visible: () => true },
  { to: '/offboarding', label: 'Offboarding', icon: DoorOpen, visible: () => true },
  { to: '/settings', label: 'Settings', icon: Settings, superAdmin: true },
]

export default function Sidebar({ collapsed = false, onToggle, footer }) {
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
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[4.25rem]' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-border',
          collapsed ? 'justify-center px-2 py-3' : 'justify-between gap-2 px-4 py-4',
        )}
      >
        <div className={cn(collapsed && 'sr-only')}>
          <div className="text-lg font-semibold tracking-tight text-foreground">Hooman</div>
        </div>
        {collapsed ? (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md bg-card text-sm font-bold text-foreground"
            title="Hooman"
          >
            H
          </div>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'rounded-md border border-border p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-foreground',
            collapsed && 'mt-0',
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to))
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-md text-sm font-medium text-muted transition-colors',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-2 px-3 py-2',
                isActive && 'border-l-2 border-accent bg-white/5 text-foreground',
                isActive && !collapsed && 'pl-[10px]',
                isActive && collapsed && 'border-l-0 ring-1 ring-accent/40',
                !isActive && 'border-l-2 border-transparent hover:bg-white/5',
                !isActive && collapsed && 'border-l-0',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </NavLink>
          )
        })}
      </nav>

      {footer ? (
        <div className={cn('shrink-0 border-t border-border', collapsed ? 'p-2' : 'p-3')}>
          {footer}
        </div>
      ) : null}
    </aside>
  )
}
