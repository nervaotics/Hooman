import { useEffect, useState } from 'react'

export default function DevicePulse({ collapsed = false }) {
  const [rows, setRows] = useState([])

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      if (!window.electron?.getDeviceStatus) return
      try {
        const data = await window.electron.getDeviceStatus()
        if (!cancelled) setRows(data)
      } catch {
        if (!cancelled) setRows([])
      }
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-1" title="Device status">
        {rows.length === 0 ? (
          <span className="text-[10px] text-muted">—</span>
        ) : (
          rows.map((d) => (
            <span
              key={d.id}
              className={
                d.status === 'online'
                  ? 'text-success'
                  : d.status === 'offline'
                    ? 'text-danger'
                    : 'text-warning'
              }
              title={`${d.name}: ${d.status}${d.lastMessage ? ` — ${d.lastMessage}` : ''}`}
            >
              ●
            </span>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2 text-xs text-muted">
      <div className="font-semibold text-foreground">Devices</div>
      {rows.length === 0 ? (
        <div className="text-muted">No device data yet</div>
      ) : (
        rows.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2">
            <span className="truncate">{d.name}</span>
            <span
              className={
                d.status === 'online'
                  ? 'text-success'
                  : d.status === 'offline'
                    ? 'text-danger'
                    : 'text-warning'
              }
              title={
                d.status === 'online'
                  ? 'Connected'
                  : d.lastMessage || 'Offline or not synced yet'
              }
            >
              ●
            </span>
          </div>
        ))
      )}
    </div>
  )
}
