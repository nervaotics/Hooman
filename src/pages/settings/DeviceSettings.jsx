import { useEffect, useState } from 'react'
import { toastError } from '@/lib/notify.js'
import { toast } from 'sonner'
import { KNOWN_POOLS } from '@/lib/constants.js'

export default function DeviceSettings() {
  const [devices, setDevices] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await window.electron.getDevices()
        if (!cancelled) setDevices(list)
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
      toast.success('Devices saved')
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        ZKTeco readers on your LAN. Defaults include your first device; add more
        rows as you expand.
      </p>
      <div className="text-xs text-muted">
        Known office subnets: {KNOWN_POOLS.join(', ')}. Devices on 8.0, 15.0, and
        20.0 can be added here once their IPs are known.
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
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="btn-primary px-4 py-2"
        >
          Save devices
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
          className="rounded-md border border-border bg-sidebar px-4 py-2 text-sm text-foreground hover:bg-white/5"
        >
          Add device
        </button>
      </div>
    </div>
  )
}
