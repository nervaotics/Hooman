import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import MeshChartCard from './MeshChartCard.jsx'
import { Building2, CalendarDays, PieChart as PieIcon, TrendingUp, Wallet } from 'lucide-react'

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B']

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-sidebar px-3 py-2 text-xs shadow-lg">
      {label ? <p className="mb-1 font-medium text-foreground">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.name} className="text-muted">
          <span style={{ color: entry.color }}>{entry.name}: </span>
          <span className="font-medium text-foreground">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </p>
      ))}
    </div>
  )
}

function EmptyChart({ message = 'No data yet' }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-sidebar/30 text-sm text-muted">
      {message}
    </div>
  )
}

function rateColor(rate) {
  if (rate >= 85) return 'bg-success/80'
  if (rate >= 65) return 'bg-accent/80'
  if (rate >= 40) return 'bg-warning/80'
  if (rate > 0) return 'bg-danger/70'
  return 'bg-white/10'
}

export function AttendanceTrendChart({ data, loading }) {
  const chartData = (data || []).map((d) => ({
    ...d,
    name: d.label || d.date?.slice(5),
  }))

  return (
    <MeshChartCard
      title="Attendance trend"
      subtitle="Daily present rate over the last 7 days"
      icon={TrendingUp}
      variant="blue"
    >
      {loading ? (
        <EmptyChart message="Loading trend…" />
      ) : !chartData.length ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2D3148" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={
                <ChartTooltip formatter={(v) => `${v}%`} />
              }
            />
            <Area
              type="monotone"
              dataKey="rate"
              name="Attendance rate"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#attendanceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </MeshChartCard>
  )
}

export function AttendanceBreakdownChart({ summary, loading }) {
  const pieData = summary
    ? [
        { name: 'Present', value: summary.present, color: '#10B981' },
        { name: 'Absent', value: summary.absent, color: '#EF4444' },
        { name: 'Sunday off', value: summary.sundayOff, color: '#64748B' },
        { name: 'Half day', value: summary.halfDay, color: '#F59E0B' },
      ].filter((d) => d.value > 0)
    : []

  const total = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <MeshChartCard
      title="Today's breakdown"
      subtitle={
        loading
          ? 'Loading…'
          : `${summary?.attendanceRate ?? 0}% attendance rate · ${summary?.present ?? 0} present`
      }
      icon={PieIcon}
      variant="green"
    >
      {loading ? (
        <EmptyChart message="Loading…" />
      ) : !total ? (
        <EmptyChart message="No roster data for today" />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <ResponsiveContainer width="100%" height={200} className="max-w-[220px]">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
                stroke="none"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="grid gap-2 text-sm sm:min-w-[140px]">
            {pieData.map((d) => (
              <li key={d.name} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="font-semibold text-foreground">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </MeshChartCard>
  )
}

export function DepartmentChart({ data, loading }) {
  const chartData = data || []

  return (
    <MeshChartCard
      title="Headcount by department"
      subtitle="Active employees across departments"
      icon={Building2}
      variant="violet"
    >
      {loading ? (
        <EmptyChart message="Loading…" />
      ) : !chartData.length ? (
        <EmptyChart message="Add departments and employees to see this chart" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#2D3148" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Employees" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </MeshChartCard>
  )
}

export function EmploymentTypeChart({ data, loading }) {
  const chartData = (data || []).map((d) => ({
    name: d.type.replace(/\b\w/g, (c) => c.toUpperCase()),
    count: d.count,
  }))

  return (
    <MeshChartCard
      title="Employment types"
      subtitle="Full-time, part-time, and contract split"
      icon={Building2}
      variant="amber"
    >
      {loading ? (
        <EmptyChart message="Loading…" />
      ) : !chartData.length ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#2D3148" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Employees" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </MeshChartCard>
  )
}

export function PayrollStatusChart({ data, loading }) {
  const chartData = (data || []).map((d) => ({
    name: String(d.status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    count: d.count,
  }))

  return (
    <MeshChartCard
      title="Payroll runs"
      subtitle="Status of all payroll periods"
      icon={Wallet}
      variant="amber"
    >
      {loading ? (
        <EmptyChart message="Loading…" />
      ) : !chartData.length ? (
        <EmptyChart message="No payroll runs yet" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#2D3148" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Runs" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </MeshChartCard>
  )
}

export function AttendanceHeatmap({ heatmap, loading }) {
  const weeks = heatmap?.weeks || 4
  const cells = heatmap?.cells || []

  return (
    <MeshChartCard
      title="Attendance mesh"
      subtitle="4-week grid — darker green = higher attendance rate"
      icon={CalendarDays}
      variant="green"
      className="lg:col-span-2"
    >
      {loading ? (
        <EmptyChart message="Loading heatmap…" />
      ) : !cells.length ? (
        <EmptyChart />
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <div className="min-w-[320px]">
              <div className="mb-2 grid grid-cols-[2.5rem_repeat(7,1fr)] gap-1 text-center text-[10px] uppercase tracking-wide text-muted">
                <div />
                {['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              {Array.from({ length: weeks }, (_, wi) => wi + 1).map((weekNum) => (
                <div key={weekNum} className="mb-1 grid grid-cols-[2.5rem_repeat(7,1fr)] gap-1">
                  <div className="flex items-center text-[10px] text-muted">W{weekNum}</div>
                  {['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].map((_, dayIdx) => {
                    const cell = cells.find((c) => c.week === weekNum && c.day === dayIdx)
                    const rate = cell?.rate ?? 0
                    return (
                      <div
                        key={`${weekNum}-${dayIdx}`}
                        title={
                          cell
                            ? `${cell.date}: ${rate}% (${cell.present}/${cell.total})`
                            : 'No data'
                        }
                        className={`aspect-square rounded-md ${rateColor(rate)} transition-transform hover:scale-105`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted">
            <span>Low</span>
            <div className="flex gap-1">
              {[0, 40, 65, 85].map((r) => (
                <div key={r} className={`h-3 w-6 rounded-sm ${rateColor(r)}`} />
              ))}
            </div>
            <span>High</span>
          </div>
        </div>
      )}
    </MeshChartCard>
  )
}
