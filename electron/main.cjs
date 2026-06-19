const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')

require('dotenv').config()

const {
  registerPhotoScheme,
  registerPhotoProtocol,
} = require('./photoProtocol.cjs')
const {
  applyAutoLaunch,
  isStartedHidden,
} = require('./autoLaunch.cjs')
const {
  initTray,
  attachBackgroundCloseBehavior,
  shouldKeepProcessAlive,
} = require('./tray.cjs')

registerPhotoScheme()

app.isQuitting = false

const store = new Store({ name: 'hooman-config' })

const { migrateSupabaseSecretsIfNeeded } = require('./db/supabaseConfig.cjs')

const TITLE_BAR_OVERLAY = {
  color: '#0F1117',
  symbolColor: '#F1F5F9',
  height: 36,
}

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy()
  }

  const launchHidden = isStartedHidden()

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Hooman',
    backgroundColor: TITLE_BAR_OVERLAY.color,
    show: false,
    ...(process.platform === 'win32'
      ? {
          titleBarStyle: 'hidden',
          titleBarOverlay: TITLE_BAR_OVERLAY,
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (!launchHidden) {
    mainWindow.once('ready-to-show', () => mainWindow.show())
  }

  attachBackgroundCloseBehavior(mainWindow, store)

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173'
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devUrl)
    if (!launchHidden) {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  return mainWindow
}

function watchPreloadInDev() {
  if (process.env.NODE_ENV !== 'development') return

  const preloadPath = path.join(__dirname, 'preload.cjs')
  let timer = null

  fs.watch(preloadPath, () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      console.log('[Hooman] preload.cjs changed — recreating window…')
      createWindow()
    }, 400)
  })
}

async function tryMigrateOnLaunch() {
  const {
    getMergedDbConfig,
    isDbConfigComplete,
    pingDatabase,
    ensureMigrations,
  } = require('./db/connection.cjs')
  try {
    const merged = getMergedDbConfig(store)
    if (!isDbConfigComplete(merged)) return
    await pingDatabase(store)
    await ensureMigrations(store)
    console.log('[Hooman] Database migrations OK')
  } catch (e) {
    console.warn('[Hooman] Startup migration skipped:', e.message)
  }
}

app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark'
  registerPhotoProtocol()

  migrateSupabaseSecretsIfNeeded(store)
  applyAutoLaunch(store)

  await tryMigrateOnLaunch()

  const { wrapIpcMain } = require('./lib/ipcWrap.cjs')
  wrapIpcMain(ipcMain)

  const win = createWindow()
  watchPreloadInDev()

  await initTray({
    getWindow: () => (mainWindow && !mainWindow.isDestroyed() ? mainWindow : null),
    createWindow,
  })

  require('./ipc/bootstrap.ipc.cjs')(ipcMain, store)
  require('./ipc/setup.ipc.cjs')(ipcMain, store)
  require('./ipc/settings.ipc.cjs')(ipcMain, store)
  require('./ipc/auth.ipc.cjs')(ipcMain, store)
  require('./ipc/users.ipc.cjs')(ipcMain, store)
  require('./ipc/employees.ipc.cjs')(ipcMain, store)
  require('./ipc/departments.ipc.cjs')(ipcMain, store)
  require('./ipc/areas.ipc.cjs')(ipcMain, store)
  require('./ipc/attendance.ipc.cjs')(ipcMain, store)
  require('./ipc/dashboard.ipc.cjs')(ipcMain, store)
  require('./ipc/payroll.ipc.cjs')(ipcMain, store)
  require('./ipc/accounting.ipc.cjs')(ipcMain, store)
  require('./ipc/recruitment.ipc.cjs')(ipcMain, store)

  const updater = require('./updater.cjs')
  ipcMain.handle('updater:getSettings', async () => updater.getSettings(store))
  ipcMain.handle('updater:saveSettings', async (_e, payload = {}) => {
    const next = updater.saveSettings(store, payload)
    updater.schedulePeriodicChecks(win, store)
    return next
  })
  ipcMain.handle('updater:checkNow', async () =>
    updater.checkForUpdates(win, store, { manual: true }),
  )
  ipcMain.handle('updater:install', async () => {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.quitAndInstall(false, true)
    return { ok: true }
  })

  const appRole = store.get('app_role', null)
  const { getDataProvider } = require('./db/connection.cjs')

  if (getDataProvider(store) === 'supabase') {
    const { startSyncWorker } = require('./sync/syncWorker.cjs')
    const { startAttendanceRealtime } = require('./data/realtime.cjs')
    startSyncWorker(store)
    startAttendanceRealtime(store)
  }

  if (appRole !== 'client') {
    require('./zkteco/poller.cjs').start(store, {
      getWindow: () => (mainWindow && !mainWindow.isDestroyed() ? mainWindow : null),
    })
  }

  updater.init(win, store)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (shouldKeepProcessAlive(store)) return
  if (process.platform !== 'darwin') app.quit()
})
