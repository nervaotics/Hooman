import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { toastError } from '@/lib/notify.js'
import { useAppRole } from '@/hooks/useAppRole.js'

export default function SettingsOverview() {
  const { isServer } = useAppRole()
  const [db, setDb] = useState(null)
  const [autoLaunch, setAutoLaunch] = useState({
    enabled: false,
    startMinimized: false,
    runInBackground: false,
  })
  const [updates, setUpdates] = useState({
    autoCheck: true,
    autoDownload: true,
    promptBeforeInstall: true,
    checkIntervalMinutes: 60,
    appVersion: '',
    isPackaged: false,
  })
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [statusLine, setStatusLine] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const cfg = await window.electron.getDbConfig()
      if (!cancelled) setDb(cfg)
      const updaterCfg = await window.electron.getUpdaterSettings?.()
      if (!cancelled && updaterCfg) setUpdates(updaterCfg)
      const launchCfg = await window.electron.getAutoLaunchSettings?.()
      if (!cancelled && launchCfg) {
        setAutoLaunch({
          enabled: Boolean(launchCfg.enabled),
          startMinimized: Boolean(launchCfg.startMinimized),
          runInBackground: Boolean(launchCfg.runInBackground),
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!window.electron?.onUpdateStatus) return undefined
    const unsub = window.electron.onUpdateStatus((payload) => {
      if (payload?.phase === 'checking') {
        setStatusLine('Checking GitHub for updates…')
      } else if (payload?.phase === 'downloading') {
        setStatusLine(`Downloading update… ${payload.percent ?? 0}%`)
      } else if (payload?.phase === 'downloaded') {
        setStatusLine(
          payload.latestVersion
            ? `Update v${payload.latestVersion} downloaded — ready to install.`
            : 'Update downloaded — ready to install.',
        )
      } else if (payload?.message) {
        setStatusLine(String(payload.message))
      }
    })
    return () => unsub?.()
  }, [])

  const saveUpdates = async () => {
    setBusy(true)
    try {
      const next = await window.electron.saveUpdaterSettings?.(updates)
      if (next) setUpdates(next)
      toast.success('Updater settings saved')
    } catch (e) {
      toastError(e, 'Could not save updater settings.')
    } finally {
      setBusy(false)
    }
  }

  const saveAutoLaunch = async () => {
    setBusy(true)
    try {
      const next = await window.electron.saveAutoLaunchSettings?.(autoLaunch)
      if (next) setAutoLaunch(next)
      toast.success('Startup settings saved')
    } catch (e) {
      toastError(e, 'Could not save startup settings.')
    } finally {
      setBusy(false)
    }
  }

  const checkNow = async () => {
    setChecking(true)
    setStatusLine('Checking GitHub for updates…')
    try {
      const result = await window.electron.checkUpdatesNow?.()
      if (!result) {
        toast.error('Update check is unavailable in this build.')
        setStatusLine('Update check is unavailable in this build.')
        return
      }

      const message = String(result.message || '')
      setStatusLine(message)

      if (result.skipped) {
        toast.message(message)
        return
      }
      if (result.hasUpdate) {
        toast.success(message)
        return
      }
      if (result.ok) {
        toast.success(message)
        return
      }
      toast.error(message || 'Could not check for updates.')
    } catch (e) {
      toastError(e, 'Could not check for updates.')
      setStatusLine('Could not check for updates.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-4 text-sm text-muted">
      <div className="rounded-lg border border-border bg-card p-4">
        {db ? (
          <div className="space-y-2">
            <div>
              <span className="text-foreground">Provider:</span>{' '}
              {String(db.merged?.provider ?? 'supabase')}
            </div>
            <div>
              <span className="text-foreground">Project:</span>{' '}
              {String(db.supabase?.url ?? db.merged?.supabaseUrl ?? '—')}
            </div>
          </div>
        ) : (
          'Loading…'
        )}
      </div>

      {isServer ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-base font-semibold text-foreground">Windows startup (Server PC)</h3>
          <p className="mt-1 text-xs text-muted">
            Hooman registers in Windows startup so device polling and Supabase sync run after every
            reboot. Use the tray icon (near the clock) to open or quit the app.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoLaunch.enabled}
                onChange={(e) => setAutoLaunch((s) => ({ ...s, enabled: e.target.checked }))}
              />
              <span>Start Hooman when Windows signs in</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoLaunch.startMinimized}
                disabled={!autoLaunch.enabled}
                onChange={(e) =>
                  setAutoLaunch((s) => ({ ...s, startMinimized: e.target.checked }))
                }
              />
              <span>Start minimized to tray (no window on boot)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoLaunch.runInBackground}
                onChange={(e) =>
                  setAutoLaunch((s) => ({ ...s, runInBackground: e.target.checked }))
                }
              />
              <span>Keep running in tray when the window is closed</span>
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={saveAutoLaunch}
            className="btn-primary mt-4"
          >
            Save startup settings
          </button>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-semibold text-foreground">App updates</h3>
        <p className="mt-1 text-xs text-muted">
          Checks GitHub Releases for a newer installer. UI changes only reach installed PCs
          after you publish a new version tag.
        </p>
        <p className="mt-2 text-xs text-foreground">
          Current version:{' '}
          <span className="font-mono">v{updates.appVersion || '—'}</span>
          {updates.isPackaged === false ? (
            <span className="ml-2 text-muted">(development — auto-update disabled)</span>
          ) : null}
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || checking}
            onClick={saveUpdates}
            className="btn-primary"
          >
            Save updater settings
          </button>
          <button
            type="button"
            disabled={busy || checking}
            onClick={checkNow}
            className="btn-secondary"
          >
            {checking ? 'Checking…' : 'Check now'}
          </button>
        </div>
        {statusLine ? (
          <p className="mt-3 text-xs text-muted" aria-live="polite">
            {statusLine}
          </p>
        ) : null}
      </div>
    </div>
  )
}
