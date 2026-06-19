const { app } = require('electron')
const { autoUpdater } = require('electron-updater')

const DEFAULT_SETTINGS = {
  autoCheck: true,
  autoDownload: true,
  promptBeforeInstall: true,
  checkIntervalMinutes: 60,
}

let checkTimer = null

function parseSemver(version) {
  const match = String(version || '')
    .trim()
    .replace(/^v/i, '')
    .match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function isNewerVersion(remoteVersion, currentVersion) {
  const remote = parseSemver(remoteVersion)
  const current = parseSemver(currentVersion)
  if (!remote || !current) return false
  for (let i = 0; i < 3; i += 1) {
    if (remote[i] > current[i]) return true
    if (remote[i] < current[i]) return false
  }
  return false
}

function sendStatus(win, payload) {
  if (win?.webContents && !win.webContents.isDestroyed()) {
    win.webContents.send('update-status', payload)
  }
}

function getSettings(store) {
  const saved = store.get('updater_settings', {})
  return {
    ...DEFAULT_SETTINGS,
    ...(saved || {}),
    checkIntervalMinutes: Math.max(15, Number(saved?.checkIntervalMinutes ?? 60)),
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged,
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

function messageForCheckError(err) {
  if (isBenignUpdateCheckError(err)) {
    return 'No published release found on GitHub yet. Tag and publish a new version to enable auto-update.'
  }
  return `Update check failed: ${String(err?.message || err).split('\n')[0]}`
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

async function checkForUpdates(win, store, { manual = false } = {}) {
  const currentVersion = app.getVersion()

  if (!app.isPackaged) {
    const payload = {
      ok: false,
      skipped: true,
      reason: 'not-packaged',
      currentVersion,
      latestVersion: null,
      hasUpdate: false,
      message:
        'Auto-update only works in the installed app. Run npm run dev for local changes, or build and install a new release.',
    }
    if (manual) sendStatus(win, { phase: 'skipped', ...payload })
    return payload
  }

  applyUpdaterRuntimeConfig(store)
  if (manual) sendStatus(win, { phase: 'checking', currentVersion })

  try {
    const result = await autoUpdater.checkForUpdates()
    const latestVersion = result?.updateInfo?.version || null
    const hasUpdate = Boolean(latestVersion && isNewerVersion(latestVersion, currentVersion))
    const payload = {
      ok: true,
      currentVersion,
      latestVersion,
      hasUpdate,
      version: hasUpdate ? latestVersion : currentVersion,
      message: hasUpdate
        ? `Update available: v${latestVersion}`
        : `You are on the latest version (v${currentVersion}).`,
    }
    if (manual) {
      sendStatus(win, { phase: hasUpdate ? 'available' : 'not-available', ...payload })
    }
    return payload
  } catch (err) {
    logUpdateCheckIssue(err)
    const payload = {
      ok: false,
      currentVersion,
      latestVersion: null,
      hasUpdate: false,
      version: null,
      message: messageForCheckError(err),
    }
    if (manual) sendStatus(win, { phase: 'error', ...payload })
    return payload
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
      sendStatus(win, {
        phase: 'error',
        message: messageForCheckError(err),
        currentVersion: app.getVersion(),
      })
    })
    autoUpdater.on('download-progress', (progress) => {
      sendStatus(win, {
        phase: 'downloading',
        percent: Math.round(Number(progress?.percent) || 0),
        currentVersion: app.getVersion(),
      })
    })
    autoUpdater.on('update-downloaded', (info) => {
      sendStatus(win, {
        phase: 'downloaded',
        latestVersion: info?.version || null,
        currentVersion: app.getVersion(),
      })
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
