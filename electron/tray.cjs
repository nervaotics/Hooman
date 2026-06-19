const { app, Tray, Menu, nativeImage } = require('electron')
const { getAutoLaunchSettings } = require('./autoLaunch.cjs')

/** @type {import('electron').Tray | null} */
let tray = null

/** 16×16 dark tile with “H” for tray when no .ico is bundled. */
const FALLBACK_TRAY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIUlEQVQ4T2NkYGD4z0ABYBzVMKoBBg0GDAwMDAwMDAwMDAwMDAwAAGQBAQf0F0p5AAAAAElFTkSuQmCC'

async function resolveTrayIcon() {
  try {
    const icon = await app.getFileIcon(process.execPath, { size: 'small' })
    if (icon && !icon.isEmpty()) return icon.resize({ width: 16, height: 16 })
  } catch {
    /* use fallback */
  }
  return nativeImage.createFromDataURL(`data:image/png;base64,${FALLBACK_TRAY_PNG}`)
}

/**
 * @param {{ getWindow: () => import('electron').BrowserWindow | null, createWindow: () => import('electron').BrowserWindow }} opts
 */
async function initTray(opts) {
  if (tray) return tray

  const icon = await resolveTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('Hooman — HRM')

  const showWindow = () => {
    let win = opts.getWindow()
    if (!win || win.isDestroyed()) win = opts.createWindow()
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show Hooman', click: showWindow },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true
          app.quit()
        },
      },
    ]),
  )

  tray.on('double-click', showWindow)
  return tray
}

/**
 * Server PC: closing the window hides to tray so poller/sync keep running.
 * @param {import('electron').BrowserWindow} win
 * @param {import('electron-store')} store
 */
function attachBackgroundCloseBehavior(win, store) {
  win.on('close', (event) => {
    if (app.isQuitting) return
    const role = store.get('app_role', null)
    const { runInBackground } = getAutoLaunchSettings(store)
    if (role !== 'client' && runInBackground) {
      event.preventDefault()
      win.hide()
    }
  })
}

function shouldKeepProcessAlive(store) {
  const role = store.get('app_role', null)
  const { runInBackground } = getAutoLaunchSettings(store)
  return role !== 'client' && runInBackground
}

module.exports = {
  initTray,
  attachBackgroundCloseBehavior,
  shouldKeepProcessAlive,
}
