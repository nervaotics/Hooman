import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function SettingsOverview() {
  const [db, setDb] = useState(null)
  const [updates, setUpdates] = useState({
    autoCheck: true,
    autoDownload: true,
    promptBeforeInstall: true,
    checkIntervalMinutes: 60,
  })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const cfg = await window.electron.getDbConfig()
      if (!cancelled) setDb(cfg)
      const updaterCfg = await window.electron.getUpdaterSettings?.()
      if (!cancelled && updaterCfg) setUpdates(updaterCfg)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const saveUpdates = async () => {
    setBusy(true)
    try {
      const next = await window.electron.saveUpdaterSettings?.(updates)
      if (next) setUpdates(next)
      toast.success('Updater settings saved')
    } catch (e) {
      toast.error(e?.message || 'Could not save updater settings')
    } finally {
      setBusy(false)
    }
  }

  const checkNow = async () => {
    setBusy(true)
    try {
      await window.electron.checkUpdatesNow?.()
      toast.success('Update check started')
    } catch (e) {
      toast.error(e?.message || 'Update check failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 text-sm text-muted">
      <div className="rounded-lg border border-border bg-card p-4">
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

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-semibold text-foreground">App updates</h3>
        <p className="mt-1 text-xs text-muted">
          Checks for updates in the background and downloads silently when enabled.
        </p>

        <div className="mt-4 grid gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(updates.autoCheck)}
              onChange={(e) =>
                setUpdates((u) => ({ ...u, autoCheck: e.target.checked }))
              }
            />
            <span>Auto-check for updates</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(updates.autoDownload)}
              onChange={(e) =>
                setUpdates((u) => ({ ...u, autoDownload: e.target.checked }))
              }
            />
            <span>Download updates silently</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(updates.promptBeforeInstall)}
              onChange={(e) =>
                setUpdates((u) => ({
                  ...u,
                  promptBeforeInstall: e.target.checked,
                }))
              }
            />
            <span>Ask before install/restart</span>
          </label>
          <label className="grid gap-1">
            <span>Check interval (minutes)</span>
            <input
              type="number"
              min={15}
              value={updates.checkIntervalMinutes}
              onChange={(e) =>
                setUpdates((u) => ({
                  ...u,
                  checkIntervalMinutes: Number(e.target.value) || 60,
                }))
              }
              className="w-44 rounded border border-border bg-sidebar px-2 py-1 text-foreground"
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={saveUpdates}
            className="btn-primary px-4 py-2"
          >
            Save updater settings
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={checkNow}
            className="rounded-md border border-border bg-sidebar px-4 py-2 text-sm text-foreground hover:bg-white/5"
          >
            Check now
          </button>
        </div>
      </div>
    </div>
  )
}
