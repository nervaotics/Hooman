import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  RefreshCw,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { formatUserError } from '@/lib/userMessage.js'
import { canRead, isSuperAdmin } from '@/lib/permissions.js'
import { callElectron } from '@/lib/electron.js'
import { useAuthStore } from '@/store/authStore.js'
import { useAppRole } from '@/hooks/useAppRole.js'

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

function Sparkline({ points }) {
  if (!points?.length) {
    return <p className="text-xs text-muted">Not enough attendance history yet.</p>
  }

  const w = 280
  const h = 72
  const pad = 8
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1))
  const ys = points.map((p) => pad + (1 - p.rate / 100) * (h - pad * 2))
  const d = points
    .map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(' ')

  const last = points[points.length - 1]
  const first = points[0]

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-xs text-accent" role="img" aria-label="7-day attendance rate">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" strokeOpacity={0.15} />
        <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-xs text-muted">
        <span>{first.date.slice(5)}</span>
        <span className="font-medium text-foreground">{last.rate}% today</span>
        <span>{last.date.slice(5)}</span>
      </div>
    </div>
  )
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
  const [attendanceTrend, setAttendanceTrend] = useState([])
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

  useEffect(() => {
    let cancelled = false

    const fetchData = async (silent = false) => {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      if (!silent) setError(null)
      try {
        const data = await callElectron('getDashboardStats')
        if (cancelled) return
        setStats(data.stats || emptyStats)
        setAttendanceSummary(data.attendanceSummary || emptySummary)
        setAttendanceTrend(data.attendanceTrend || [])
        setError(null)
      } catch (e) {
        if (cancelled) return
        setError(formatUserError(e, 'Could not load the dashboard.'))
        setStats(emptyStats)
        setAttendanceSummary(emptySummary)
        setAttendanceTrend([])
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
                setStats(data.stats || emptyStats)
                setAttendanceSummary(data.attendanceSummary || emptySummary)
                setAttendanceTrend(data.attendanceTrend || [])
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
          <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold text-foreground">Today&apos;s attendance</h2>
          </div>
          <p className="mt-1 text-xs text-muted">
            {loading
              ? 'Loading…'
              : `${attendanceSummary.attendanceRate}% rate · ${attendanceSummary.present} present · ${attendanceSummary.absent} absent`}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              ['Present', attendanceSummary.present],
              ['Absent', attendanceSummary.absent],
              ['Sunday off', attendanceSummary.sundayOff],
              ['Half day', attendanceSummary.halfDay],
              ['Roster', attendanceSummary.total],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-sidebar/50 px-3 py-2">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-0.5 font-semibold text-foreground">
                  {loading ? '—' : value}
                </dd>
              </div>
            ))}
          </dl>
          <Link to="/attendance" className="mt-4 inline-block text-xs text-accent hover:underline">
            View attendance table →
          </Link>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold text-foreground">7-day attendance rate</h2>
          </div>
          <p className="mt-1 text-xs text-muted">Share of active roster with a punch each day</p>
          <div className="mt-4">
            {loading ? (
              <p className="text-sm text-muted">Loading trend…</p>
            ) : (
              <Sparkline points={attendanceTrend} />
            )}
          </div>
        </section>
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
