import { useEffect, useState } from 'react'

export default function SettingsOverview() {
  const [db, setDb] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const cfg = await window.electron.getDbConfig()
      if (!cancelled) setDb(cfg)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted">
      {db ? (
        <div className="space-y-2">
          <div>
            <span className="text-foreground">Host:</span>{' '}
            {String(db.merged?.host ?? '')}
          </div>
          <div>
            <span className="text-foreground">Database:</span>{' '}
            {String(db.merged?.database ?? '')}
          </div>
          <div>
            <span className="text-foreground">User:</span>{' '}
            {String(db.merged?.user ?? '')}
          </div>
        </div>
      ) : (
        'Loading…'
      )}
    </div>
  )
}
