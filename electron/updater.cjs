const { autoUpdater } = require('electron-updater')

/**
 * @param {import('electron').BrowserWindow} win
 */
function init(win) {
  try {
    autoUpdater.autoDownload = true
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.warn('[Hooman] update check failed:', err.message)
    })
    autoUpdater.on('update-downloaded', () => {
      win?.webContents?.send('update-ready')
    })
  } catch (err) {
    console.warn('[Hooman] updater init skipped:', err.message)
  }
}

module.exports = { init }
