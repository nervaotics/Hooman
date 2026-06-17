const { app } = require('electron')
const { autoUpdater } = require('electron-updater')

const DEFAULT_SETTINGS = {
  autoCheck: true,
  autoDownload: true,
  promptBeforeInstall: true,
  checkIntervalMinutes: 60,
}

let checkTimer = null

function getSettings(store) {
  const saved = store.get('updater_settings', {})
  return {
    ...DEFAULT_SETTINGS,
    ...(saved || {}),
    checkIntervalMinutes: Math.max(15, Number(saved?.checkIntervalMinutes ?? 60)),
  }
}

function saveSettings(store, patch = {}) {
  const next = { ...getSettings(store), ...(patch || {}) }
  next.checkIntervalMinutes = Math.max(15, Number(next.checkIntervalMinutes || 60))
  store.set('updater_settings', next)
  return next
}

function sendStatus(win, payload) {
  win?.webContents?.send('update-status', payload)
}

function applyUpdaterRuntimeConfig(store) {
  const cfg = getSettings(store)
  autoUpdater.autoDownload = Boolean(cfg.autoDownload)
  return cfg
}

function clearUpdateTimer() {
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
  }
}

function schedulePeriodicChecks(win, store) {
  clearUpdateTimer()
  const cfg = getSettings(store)
  if (!cfg.autoCheck || !app.isPackaged) return
  checkTimer = setInterval(() => {
    checkForUpdates(win, store).catch((err) => {
      console.warn('[Hooman] periodic update check failed:', err.message)
    })
  }, cfg.checkIntervalMinutes * 60 * 1000)
}

async function checkForUpdates(win, store) {
  if (!app.isPackaged) return { ok: false, skipped: 'not-packaged' }
  applyUpdaterRuntimeConfig(store)
  const result = await autoUpdater.checkForUpdates()
  const hasUpdate = Boolean(result?.updateInfo?.version)
  if (hasUpdate) {
    sendStatus(win, {
      type: 'available',
      version: result.updateInfo.version,
      message: `Version ${result.updateInfo.version} is available.`,
    })
  }
  return { ok: true, hasUpdate, version: result?.updateInfo?.version || null }
}

/**
 * @param {import('electron').BrowserWindow} win
 * @param {import('electron-store')} store
 */
function init(win, store) {
  try {
    applyUpdaterRuntimeConfig(store)
    autoUpdater.on('checking-for-update', () => {
      sendStatus(win, { type: 'checking', message: 'Checking for updates…' })
    })
    autoUpdater.on('update-available', (info) => {
      sendStatus(win, {
        type: 'available',
        version: info?.version || null,
        message: 'Update found. Downloading in background.',
      })
    })
    autoUpdater.on('update-not-available', () => {
      sendStatus(win, { type: 'none', message: 'Already on latest version.' })
    })
    autoUpdater.on('error', (err) => {
      sendStatus(win, { type: 'error', message: err?.message || 'Update failed' })
    })
    autoUpdater.on('update-downloaded', (info) => {
      win?.webContents?.send('update-ready')
      sendStatus(win, {
        type: 'downloaded',
        version: info?.version || null,
        message: 'Update downloaded and ready to install.',
      })
    })

    schedulePeriodicChecks(win, store)
    if (getSettings(store).autoCheck && app.isPackaged) {
      checkForUpdates(win, store).catch((err) => {
        console.warn('[Hooman] initial update check failed:', err.message)
      })
    }
  } catch (err) {
    console.warn('[Hooman] updater init skipped:', err.message)
  }
}

module.exports = {
  init,
  getSettings,
  saveSettings,
  checkForUpdates,
  schedulePeriodicChecks,
}
