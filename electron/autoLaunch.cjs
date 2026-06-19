const path = require('path')
const { app } = require('electron')

/**
 * @param {import('electron-store')} store
 */
function getAutoLaunchSettings(store) {
  const role = store.get('app_role', null)
  const saved = store.get('auto_launch_settings', null) || {}
  const serverDefaults = role === 'server'
  return {
    enabled: saved.enabled ?? serverDefaults,
    startMinimized: saved.startMinimized ?? serverDefaults,
    runInBackground: saved.runInBackground ?? serverDefaults,
  }
}

/**
 * @param {import('electron-store')} store
 * @param {{ enabled?: boolean, startMinimized?: boolean, runInBackground?: boolean }} patch
 */
function saveAutoLaunchSettings(store, patch = {}) {
  const prev = getAutoLaunchSettings(store)
  const next = {
    enabled: patch.enabled ?? prev.enabled,
    startMinimized: patch.startMinimized ?? prev.startMinimized,
    runInBackground: patch.runInBackground ?? prev.runInBackground,
  }
  store.set('auto_launch_settings', next)
  applyAutoLaunch(store, next)
  return next
}

/**
 * Register Hooman to start when Windows/macOS user logs in.
 * @param {import('electron-store')} store
 * @param {{ enabled?: boolean, startMinimized?: boolean }} [override]
 */
function applyAutoLaunch(store, override) {
  if (process.platform !== 'win32' && process.platform !== 'darwin') return

  const { enabled, startMinimized } = override || getAutoLaunchSettings(store)
  const openAtLogin = Boolean(enabled)

  /** @type {import('electron').Settings} */
  const opts = {
    openAtLogin,
    path: app.getPath('exe'),
  }

  const hiddenArg = '--hidden'
  const isDev = !app.isPackaged

  if (isDev) {
    opts.path = process.execPath
    opts.args = openAtLogin
      ? [path.resolve(process.argv[1]), ...(startMinimized ? [hiddenArg] : [])]
      : []
  } else if (openAtLogin && startMinimized) {
    opts.args = [hiddenArg]
  }

  try {
    app.setLoginItemSettings(opts)
    console.log(`[Hooman] Auto-launch ${openAtLogin ? 'enabled' : 'disabled'}`)
  } catch (err) {
    console.warn('[Hooman] Auto-launch:', err.message)
  }
}

/**
 * Default server PC: start at login, tray background, poller always on.
 * @param {import('electron-store')} store
 */
function enableServerAutoLaunchDefaults(store) {
  saveAutoLaunchSettings(store, {
    enabled: true,
    startMinimized: true,
    runInBackground: true,
  })
}

function isStartedHidden() {
  return process.argv.includes('--hidden')
}

module.exports = {
  getAutoLaunchSettings,
  saveAutoLaunchSettings,
  applyAutoLaunch,
  enableServerAutoLaunchDefaults,
  isStartedHidden,
}
