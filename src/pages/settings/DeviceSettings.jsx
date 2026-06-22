import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toastError } from '@/lib/notify.js'
import { toast } from 'sonner'
import { KNOWN_POOLS } from '@/lib/constants.js'
import { useAppRole } from '@/hooks/useAppRole.js'

export default function DeviceSettings() {
  const { isServer, loading: roleLoading } = useAppRole()
  const [devices, setDevices] = useState([])
  const [pastDays, setPastDays] = useState(7)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [list, sync] = await Promise.all([
          window.electron.getDevices(),
          window.electron.getAttendanceSyncSettings?.(),
        ])
        if (cancelled) return
        setDevices(list || [])
        if (sync?.pastDays) setPastDays(Number(sync.pastDays))
      } catch {
        if (!cancelled) setDevices([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    setBusy(true)
    try {
      await window.electron.saveDevices(devices)
      await window.electron.saveAttendanceSyncSettings?.({ pastDays })
      toast.success('Device and sync settings saved')
    } catch (e) {
      toastError(e, 'Could not save device settings.')
    } finally {
      setBusy(false)
    }
  }

  const update = (idx, patch) => {
    setDevices((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    )
  }

  if (roleLoading) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  if (!isServer) {
    return <Navigate to="/settings" replace />
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-sidebar/40 p-4">
        <h2 className="text-sm font-semibold text-foreground">Automatic attendance fetch</h2>
        <p className="mt-1 text-xs text-muted">
          Every 5 minutes the Server PC pulls punches from enabled devices for this many past days
          (including today). Punches already in the database are skipped; only new ones are saved.
        </p>
        <label className="mt-4 grid max-w-xs gap-1 text-sm">
          <span className="text-muted">Past days to fetch</span>
          <input
            type="number"
            min={1}
            max={366}
            value={pastDays}
            onChange={(e) => setPastDays(Number(e.target.value) || 7)}
            className="rounded-md border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-accent"
          />
        </label>
        <p className="mt-2 text-xs text-muted">
          Example: <strong className="font-medium text-foreground">7</strong> = today plus the
          previous 6 days. Use manual sync on the Attendance page for a custom range or all punches
          on the device.
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted">
          ZKTeco readers on your LAN. Defaults include your first device; add more rows as you
          expand.
        </p>
        <div className="text-xs text-muted">
          Known office subnets: {KNOWN_POOLS.join(', ')}. Devices on 8.0, 15.0, and 20.0 can be
          added here once their IPs are known.
        </div>

        <div className="overflow-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sidebar text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">Port</th>
                <th className="px-3 py-2">Enabled</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d, idx) => (
                <tr key={d.id || idx} className="border-t border-border">
                  <td className="px-3 py-2">
                    <input
                      className="w-full rounded border border-border bg-card px-2 py-1 text-foreground"
                      value={d.name}
                      onChange={(e) => update(idx, { name: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full rounded border border-border bg-card px-2 py-1 text-foreground"
                      value={d.ip}
                      onChange={(e) => update(idx, { ip: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-28 rounded border border-border bg-card px-2 py-1 text-foreground"
                      value={d.port}
                      onChange={(e) =>
                        update(idx, { port: Number(e.target.value) || 4370 })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(d.enabled)}
                      onChange={(e) => update(idx, { enabled: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={save} className="btn-primary">
            Save settings
          </button>
          <button
            type="button"
            onClick={() =>
              setDevices((d) => [
                ...d,
                {
                  id: `dev-${Date.now()}`,
                  name: 'New reader',
                  ip: '192.168.0.50',
                  port: 4370,
                  subnet: '192.168.0.0',
                  enabled: true,
                },
              ])
            }
            className="btn-secondary"
          >
            Add device
          </button>
        </div>
      </div>
    </div>
  )
}
