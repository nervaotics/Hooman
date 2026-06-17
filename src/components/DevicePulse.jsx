import { useEffect, useState } from 'react'

export default function DevicePulse() {
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
              title={d.lastMessage ?? ''}
            >
              {d.status === 'online'
                ? '●'
                : d.status === 'offline'
                  ? '●'
                  : '●'}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
