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

/** Missing/private release feeds and “no update yet” are normal — stay quiet in the UI. */
function isBenignUpdateCheckError(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  if (!msg) return true
  if (/404/.test(msg) && /github|releases\.atom|latest\.yml/i.test(msg)) return true
  if (/authentication token/i.test(msg) && /404/.test(msg)) return true
  if (/cannot find channel|no published versions|unable to find latest version/i.test(msg)) {
    return true
  }
  return false
}

function logUpdateCheckIssue(err) {
  const firstLine = String(err?.message || err || 'unknown error').split('\n')[0]
  if (isBenignUpdateCheckError(err)) {
    console.log('[Hooman] update check: no release feed or already current')
    return
  }
  console.warn('[Hooman] update check failed:', firstLine)
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
    checkForUpdates(win, store).catch(logUpdateCheckIssue)
  }, cfg.checkIntervalMinutes * 60 * 1000)
}

async function checkForUpdates(win, store) {
  if (!app.isPackaged) return { ok: false, skipped: 'not-packaged' }
  applyUpdaterRuntimeConfig(store)
  try {
    const result = await autoUpdater.checkForUpdates()
    const hasUpdate = Boolean(result?.updateInfo?.version)
    return { ok: true, hasUpdate, version: result?.updateInfo?.version || null }
  } catch (err) {
    logUpdateCheckIssue(err)
    return { ok: true, hasUpdate: false, silent: true }
  }
}

/**
 * @param {import('electron').BrowserWindow} win
 * @param {import('electron-store')} store
 */
function init(win, store) {
  try {
    applyUpdaterRuntimeConfig(store)
    autoUpdater.on('error', (err) => {
      logUpdateCheckIssue(err)
    })
    autoUpdater.on('update-downloaded', () => {
      win?.webContents?.send('update-ready')
    })

    schedulePeriodicChecks(win, store)
    if (getSettings(store).autoCheck && app.isPackaged) {
      checkForUpdates(win, store).catch(logUpdateCheckIssue)
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
