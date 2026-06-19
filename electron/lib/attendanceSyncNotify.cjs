/** @type {(() => import('electron').BrowserWindow | null) | null} */
let getWindow = null

function setWindowGetter(fn) {
  getWindow = fn
}

function notifyAttendanceSynced(payload = {}) {
  const win = getWindow?.()
  if (win?.webContents && !win.webContents.isDestroyed()) {
    win.webContents.send('attendance-synced', payload)
  }
}

module.exports = { setWindowGetter, notifyAttendanceSynced }
