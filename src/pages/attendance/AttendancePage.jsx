import { useCallback, useEffect, useState } from 'react'
import { Calendar, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@/lib/notify.js'
import { useAuthStore } from '@/store/authStore.js'
import { canWrite } from '@/lib/permissions.js'

function todayLocal() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date())
}

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user)
  const canSync = canWrite(user, 'employee_data')
  const today = todayLocal()
  const [viewMode, setViewMode] = useState('daily')
  const [date, setDate] = useState(today)
  const [syncFrom, setSyncFrom] = useState(today)
  const [syncTo, setSyncTo] = useState(today)
  const [syncAllOnDevice, setSyncAllOnDevice] = useState(false)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [punchRows, setPunchRows] = useState([])
  const [punchMeta, setPunchMeta] = useState({ total: 0, unlinked: 0 })
  const [timezone, setTimezone] = useState('Asia/Karachi')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const loadDaily = useCallback(async () => {
    const result = await window.electron.getDailyAttendance({ date, search })
    setRows(result.rows || [])
    setTimezone(result.timezone || 'Asia/Karachi')
  }, [date, search])

  const loadPunchLog = useCallback(async () => {
    const result = await window.electron.getAttendanceRange({
      fromDate: syncFrom,
      toDate: syncTo,
      search,
    })
    setPunchRows(result.rows || [])
    setPunchMeta({ total: result.total ?? 0, unlinked: result.unlinked ?? 0 })
    setTimezone(result.timezone || 'Asia/Karachi')
  }, [syncFrom, syncTo, search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (viewMode === 'daily') {
        await loadDaily()
      } else {
        await loadPunchLog()
      }
    } catch (e) {
      toastError(e, 'Could not load attendance.')
      setRows([])
      setPunchRows([])
      setPunchMeta({ total: 0, unlinked: 0 })
    } finally {
      setLoading(false)
    }
  }, [viewMode, loadDaily, loadPunchLog])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const handleSync = async () => {
    if (!syncAllOnDevice && (!syncFrom || !syncTo)) {
      toast.error('Please choose a from and to date for sync.')
      return
    }
    if (!syncAllOnDevice && syncFrom > syncTo) {
      toast.error('From date must be on or before to date.')
      return
    }

    setSyncing(true)
    try {
      const payload = syncAllOnDevice ? {} : { fromDate: syncFrom, toDate: syncTo }
      const { results, totals, period, linked } = await window.electron.syncAttendance(payload)
      const ok = (results || []).filter((r) => r.success).length
      const fail = (results || []).filter((r) => !r.success).length
      const failedDevices = (results || []).filter((r) => !r.success)

      if (period) {
        toast.success(
          `Synced ${ok} device${ok === 1 ? '' : 's'} for ${period.fromDate} to ${period.toDate}`,
          {
            description: `${totals?.fetchedFromDevice ?? 0} fetched, ${totals?.inPeriod ?? 0} in range, ${totals?.savedToDatabase ?? 0} new saved${linked ? `, ${linked} linked` : ''}`,
          },
        )
      } else if (ok) {
        toast.success(`Synced ${ok} device${ok === 1 ? '' : 's'} (all punches on device)`, {
          description: `${totals?.fetchedFromDevice ?? 0} fetched, ${totals?.savedToDatabase ?? 0} new saved${linked ? `, ${linked} linked` : ''}`,
        })
      }

      if (fail) {
        const detail = failedDevices.map((r) => r.device).join(', ')
        toast.warning(`${fail} device${fail === 1 ? '' : 's'} failed${detail ? `: ${detail}` : ''}`)
      }

      if (!syncAllOnDevice) {
        setDate(syncTo)
        setViewMode('punchlog')
      }
      await load()
    } catch (e) {
      toastError(e, 'Attendance sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  const emptyDaily = !loading && viewMode === 'daily' && rows.length === 0
  const emptyPunchLog = !loading && viewMode === 'punchlog' && punchRows.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Attendance</h1>
          <p className="mt-1 text-sm text-muted">
            ZKTeco punches and daily check-in/out ({timezone})
          </p>
        </div>
        <div className="flex rounded-md border border-border p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`rounded px-3 py-1.5 ${viewMode === 'daily' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'}`}
          >
            Daily summary
          </button>
          <button
            type="button"
            onClick={() => setViewMode('punchlog')}
            className={`rounded px-3 py-1.5 ${viewMode === 'punchlog' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'}`}
          >
            Punch log
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Manual sync from devices</h2>
        <p className="mt-1 text-xs text-muted">
          Pull punches for a date range, then view them in Punch log. Auto-sync every 5 minutes
          still runs in the background on the Server PC.
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
        {viewMode === 'daily' ? (
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
        ) : (
          <p className="text-sm text-muted">
            Showing punches from <strong className="font-medium text-foreground">{syncFrom}</strong>{' '}
            to <strong className="font-medium text-foreground">{syncTo}</strong>
          </p>
        )}
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee ID, name, or device user ID…"
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted">Loading attendance…</div>
      ) : viewMode === 'daily' ? (
        rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted">No employee punches for {date}.</p>
            <p className="mt-2 text-xs text-muted">
              Sync devices for this date, then check <strong className="font-medium">Punch log</strong>{' '}
              to see raw punches. Employees need a matching{' '}
              <strong className="font-medium">punch_code</strong> on the biometric device.
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
        )
      ) : punchRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted">
            No punches in database for {syncFrom} to {syncTo}.
          </p>
          <p className="mt-2 text-xs text-muted">
            Use <strong className="font-medium">Sync devices</strong> above with the same date range.
            If sync reports punches fetched but none appear here, check device timezone and date
            filters.
          </p>
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sidebar text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Device user ID</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Name</th>
              </tr>
            </thead>
            <tbody>
              {punchRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t border-border hover:bg-white/5 ${row.linked ? '' : 'bg-amber-500/5'}`}
                >
                  <td className="px-4 py-3 font-mono text-xs">{row.punch_date}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{row.punch_time}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.device_user_id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.employee_id}</td>
                  <td className="px-4 py-3">{row.employee_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && viewMode === 'daily' && rows.length > 0 ? (
        <p className="text-xs text-muted">
          {rows.length} employee{rows.length === 1 ? '' : 's'} with punches on {date}. Check_In and
          Check_Out use first and last punch of the day.
        </p>
      ) : null}

      {!loading && viewMode === 'punchlog' && punchRows.length > 0 ? (
        <p className="text-xs text-muted">
          {punchMeta.total} punch{punchMeta.total === 1 ? '' : 'es'} from {syncFrom} to {syncTo}.
          {punchMeta.unlinked > 0
            ? ` ${punchMeta.unlinked} not linked to an employee — set punch_code to match the device user ID (highlighted rows).`
            : ' All punches are linked to employees.'}
        </p>
      ) : null}

      {emptyDaily || emptyPunchLog ? (
        <p className="text-xs text-amber-600/90">
          Tip: open Punch log after syncing to verify punches were saved. Unlinked rows mean the
          device user ID does not match any employee punch_code yet.
        </p>
      ) : null}
    </div>
  )
}
