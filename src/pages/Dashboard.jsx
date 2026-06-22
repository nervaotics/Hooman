import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { formatUserError } from '@/lib/userMessage.js'
import { canRead, isSuperAdmin } from '@/lib/permissions.js'
import { callElectron } from '@/lib/electron.js'
import { useAuthStore } from '@/store/authStore.js'
import { useAppRole } from '@/hooks/useAppRole.js'
import {
  AttendanceBreakdownChart,
  AttendanceHeatmap,
  AttendanceTrendChart,
  DepartmentChart,
  EmploymentTypeChart,
  PayrollStatusChart,
} from '@/components/dashboard/DashboardCharts.jsx'

function greetingForHour(hour) {
  if (hour < 5) return 'Good evening'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLine() {
  return new Date().toLocaleDateString('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const emptyStats = {
  totalEmployees: 0,
  presentToday: 0,
  pendingPayroll: 0,
  devicesOnline: 0,
  devicesTotal: 0,
}

const emptySummary = {
  present: 0,
  absent: 0,
  halfDay: 0,
  sundayOff: 0,
  total: 0,
  attendanceRate: 0,
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const { isServer } = useAppRole()
  const showPayroll = canRead(user, 'payroll_processing')
  const showEmployees = canRead(user, 'employee_data')
  const showSettings = isSuperAdmin(user)
  const showDevices = showSettings && isServer
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState(emptyStats)
  const [attendanceSummary, setAttendanceSummary] = useState(emptySummary)
  const [attendanceTrendDetailed, setAttendanceTrendDetailed] = useState([])
  const [employeesByDepartment, setEmployeesByDepartment] = useState([])
  const [employmentTypes, setEmploymentTypes] = useState([])
  const [payrollStatus, setPayrollStatus] = useState([])
  const [attendanceHeatmap, setAttendanceHeatmap] = useState(null)
  const [error, setError] = useState(null)

  const displayName = useMemo(() => {
    const raw = user?.username || 'there'
    return String(raw).split(/\s+/)[0] || 'there'
  }, [user])

  const greeting = useMemo(
    () =>
      greetingForHour(
        Number(
          new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Karachi',
            hour: 'numeric',
            hour12: false,
          }).format(new Date()),
        ),
      ),
    [],
  )

  const applyDashboardData = (data) => {
    setStats(data.stats || emptyStats)
    setAttendanceSummary(data.attendanceSummary || emptySummary)
    setAttendanceTrendDetailed(data.attendanceTrendDetailed || data.attendanceTrend || [])
    setEmployeesByDepartment(data.employeesByDepartment || [])
    setEmploymentTypes(data.employmentTypes || [])
    setPayrollStatus(data.payrollStatus || [])
    setAttendanceHeatmap(data.attendanceHeatmap || null)
  }

  const resetDashboardData = () => {
    setStats(emptyStats)
    setAttendanceSummary(emptySummary)
    setAttendanceTrendDetailed([])
    setEmployeesByDepartment([])
    setEmploymentTypes([])
    setPayrollStatus([])
    setAttendanceHeatmap(null)
  }

  useEffect(() => {
    let cancelled = false

    const fetchData = async (silent = false) => {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      if (!silent) setError(null)
      try {
        const data = await callElectron('getDashboardStats')
        if (cancelled) return
        applyDashboardData(data)
        setError(null)
      } catch (e) {
        if (cancelled) return
        setError(formatUserError(e, 'Could not load the dashboard.'))
        resetDashboardData()
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchData(false)
    const id = setInterval(() => fetchData(true), 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const cards = [
    showEmployees && {
      label: 'Total employees',
      value: stats.totalEmployees,
      hint: 'Active directory',
      to: '/employees',
      icon: Users,
    },
    showEmployees && {
      label: 'Present today',
      value: stats.presentToday,
      hint: 'Checked in via device',
      to: '/attendance',
      icon: Clock,
    },
    showPayroll && {
      label: 'Payroll in progress',
      value: stats.pendingPayroll,
      hint: 'Draft or processing',
      to: '/payroll',
      icon: Wallet,
    },
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
            <Sparkles className="h-3.5 w-3.5" />
            Workspace overview
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            {greeting}, {displayName}
          </h1>
          <p className="mt-1 text-sm text-muted">{todayLine()}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRefreshing(true)
            callElectron('getDashboardStats')
              .then((data) => {
                applyDashboardData(data)
                setError(null)
              })
              .catch((e) => setError(formatUserError(e, 'Could not load the dashboard.')))
              .finally(() => setRefreshing(false))
          }}
          disabled={refreshing}
          className="btn-secondary disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.label}
              to={card.to}
              className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent/40 hover:bg-white/[0.02]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-md bg-white/5 p-2 text-muted group-hover:text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <TrendingUp className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-3 text-xs uppercase tracking-wide text-muted">{card.label}</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">
                {loading ? '…' : card.value}
              </div>
              <div className="mt-1 text-xs text-muted">{card.hint}</div>
            </Link>
          )
        })}
      </div>

      {showEmployees ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AttendanceTrendChart data={attendanceTrendDetailed} loading={loading} />
          <AttendanceBreakdownChart summary={attendanceSummary} loading={loading} />
          <AttendanceHeatmap heatmap={attendanceHeatmap} loading={loading} />
          <DepartmentChart data={employeesByDepartment} loading={loading} />
          <EmploymentTypeChart data={employmentTypes} loading={loading} />
          <div className="flex items-end">
            <Link to="/attendance" className="text-xs text-accent hover:underline">
              View full attendance table →
            </Link>
          </div>
        </div>
      ) : null}

      {showPayroll ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <PayrollStatusChart data={payrollStatus} loading={loading} />
          <div className="flex items-end">
            <Link to="/payroll" className="text-xs text-accent hover:underline">
              Open payroll →
            </Link>
          </div>
        </div>
      ) : null}

      {showDevices ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Biometric devices</h2>
          <p className="mt-1 text-xs text-muted">
            {loading
              ? 'Loading device status…'
              : `${stats.devicesOnline} of ${stats.devicesTotal} enabled devices online`}
          </p>
          <Link to="/settings/devices" className="mt-3 inline-block text-xs text-accent hover:underline">
            Manage devices →
          </Link>
        </section>
      ) : null}
    </div>
  )
}
