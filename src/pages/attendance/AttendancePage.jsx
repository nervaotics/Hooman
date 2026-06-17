import { useCallback, useEffect, useState } from 'react'
import { Calendar, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore.js'
import { canWrite } from '@/lib/permissions.js'

function todayLocal() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date())
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user)
  const canSync = canWrite(user, 'employee_data')
  const today = todayLocal()
  const [date, setDate] = useState(today)
  const [syncFrom, setSyncFrom] = useState(addDays(today, -6))
  const [syncTo, setSyncTo] = useState(today)
  const [syncAllOnDevice, setSyncAllOnDevice] = useState(false)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [timezone, setTimezone] = useState('Asia/Karachi')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.electron.getDailyAttendance({ date, search })
      setRows(result.rows || [])
      setTimezone(result.timezone || 'Asia/Karachi')
    } catch (e) {
      toast.error(e?.message || 'Could not load attendance')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [date, search])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const payload = syncAllOnDevice
        ? {}
        : { fromDate: syncFrom, toDate: syncTo }
      const { results, totals, period } = await window.electron.syncAttendance(payload)
      const ok = (results || []).filter((r) => r.success).length
      const fail = (results || []).filter((r) => !r.success).length

      if (period) {
        toast.success(
          `Synced ${ok} device${ok === 1 ? '' : 's'} for ${period.fromDate} to ${period.toDate}`,
          {
            description: `${totals?.inPeriod ?? 0} punch${totals?.inPeriod === 1 ? '' : 'es'} in period, ${totals?.savedToDatabase ?? 0} saved to database`,
          },
        )
      } else if (ok) {
        toast.success(`Synced ${ok} device${ok === 1 ? '' : 's'} (all punches on device)`)
      }
      if (fail) toast.warning(`${fail} device${fail === 1 ? '' : 's'} failed to sync`)
      await load()
    } catch (e) {
      toast.error(e?.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Attendance</h1>
          <p className="mt-1 text-sm text-muted">
            Daily check-in/out from ZKTeco devices ({timezone})
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Manual sync from devices</h2>
        <p className="mt-1 text-xs text-muted">
          Use a date range to backfill missed punches if the server was offline. Auto-sync every 5
          minutes still runs in the background on the Server PC.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-muted">
            <span>From</span>
            <input
              type="date"
              value={syncFrom}
              disabled={syncAllOnDevice || syncing}
              onChange={(e) => setSyncFrom(e.target.value)}
              className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-60"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted">
            <span>To</span>
            <input
              type="date"
              value={syncTo}
              disabled={syncAllOnDevice || syncing}
              onChange={(e) => setSyncTo(e.target.value)}
              className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-60"
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={syncAllOnDevice}
              disabled={syncing}
              onChange={(e) => setSyncAllOnDevice(e.target.checked)}
            />
            Sync all punches on device (ignore date range)
          </label>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !canSync}
            title={canSync ? 'Pull punches from devices' : 'Read-only — sync requires write access'}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync devices'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee ID or name…"
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted">Loading attendance…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted">No punches for {date}.</p>
          <p className="mt-2 text-xs text-muted">
            Ensure employees have a matching <strong className="font-medium">punch_code</strong> on
            the biometric device, then sync for the missing period.
          </p>
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sidebar text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Employee_ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Check_In</th>
                <th className="px-4 py-3">Check_Out</th>
                <th className="px-4 py-3">Total_Hrs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.employee_db_id} className="border-t border-border hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{row.employee_id}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{row.check_in}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{row.check_out}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.total_hrs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length > 0 ? (
        <p className="text-xs text-muted">
          {rows.length} employee{rows.length === 1 ? '' : 's'} with punches on {date}. Check_In and
          Check_Out use first and last punch of the day.
        </p>
      ) : null}
    </div>
  )
}
