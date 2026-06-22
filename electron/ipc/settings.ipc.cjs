const {
  getMergedDbConfig,
  isDbConfigComplete,
  pingDatabase,
  resetKnex,
  runMigrations,
} = require('../db/connection.cjs')
const {
  getSupabaseConfig,
  getSupabasePublicMeta,
  mergeSupabasePayload,
  testPostgresConnection,
  writeSupabaseStore,
} = require('../db/supabaseConfig.cjs')
const { authorizeSettings } = require('../lib/authGuard.cjs')
const { stripToken } = require('../lib/ipcPayload.cjs')
const {
  getAutoLaunchSettings,
  saveAutoLaunchSettings,
} = require('../autoLaunch.cjs')
const {
  getAttendanceSyncSettings,
  saveAttendanceSyncSettings,
} = require('../lib/attendanceSyncSettings.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerSettingsIpc(ipcMain, store) {
  ipcMain.handle('settings:getDb', async (_e, payload) => {
    await authorizeSettings(store, payload)
    const merged = getMergedDbConfig(store)
    const supabase = getSupabasePublicMeta(store)
    const { password: _pw, ...rest } = merged
    return {
      merged: {
        ...rest,
        password: '',
        passwordIsSet: Boolean(merged.password || supabase?.dbPasswordIsSet),
        provider: merged.provider || 'supabase',
      },
      supabase,
    }
  })

  ipcMain.handle('settings:getSupabase', async (_e, payload) => {
    await authorizeSettings(store, payload)
    return getSupabasePublicMeta(store)
  })

  ipcMain.handle('settings:saveSupabase', async (_e, payload) => {
    await authorizeSettings(store, payload)
    const { clean } = stripToken(payload)
    const config = clean.url !== undefined ? clean : payload
    writeSupabaseStore(store, config)
    await resetKnex()
    await pingDatabase(store)
    await runMigrations(store)
    return { ok: true }
  })

  ipcMain.handle('settings:testSupabase', async (_e, payload) => {
    await authorizeSettings(store, payload)
    const { clean } = stripToken(payload)
    const config = clean.url !== undefined ? clean : payload
    const prev = getSupabaseConfig(store) || {}
    const merged = mergeSupabasePayload(config, prev)
    if (!merged.projectRef || !merged.dbPassword) {
      throw new Error('Supabase URL and database password are required')
    }
    return testPostgresConnection(merged)
  })

  ipcMain.handle('settings:saveDb', async () => {
    throw new Error('MySQL setup is no longer supported. Use Supabase settings instead.')
  })

  ipcMain.handle('settings:testDb', async () => {
    throw new Error('MySQL setup is no longer supported. Use Supabase settings instead.')
  })

  ipcMain.handle('settings:getDevices', async (_e, payload) => {
    await authorizeSettings(store, payload)
    const { DEFAULT_DEVICES } = require('../zkteco/devices.cjs')
    return store.get('zkteco_devices', DEFAULT_DEVICES)
  })

  ipcMain.handle('settings:saveDevices', async (_e, payload) => {
    await authorizeSettings(store, payload)
    const clean = stripToken(payload).clean
    const devices = Array.isArray(payload)
      ? payload
      : Array.isArray(clean)
        ? clean
        : clean?.devices
    if (!Array.isArray(devices)) throw new Error('devices must be an array')
    store.set('zkteco_devices', devices)
    return { ok: true }
  })

  ipcMain.handle('settings:getAutoLaunch', async (_e, payload) => {
    await authorizeSettings(store, payload)
    return {
      ...getAutoLaunchSettings(store),
      appRole: store.get('app_role', null),
    }
  })

  ipcMain.handle('settings:saveAutoLaunch', async (_e, payload) => {
    await authorizeSettings(store, payload)
    const { clean } = stripToken(payload)
    const patch = clean.enabled !== undefined ? clean : payload
    return saveAutoLaunchSettings(store, {
      enabled: patch.enabled,
      startMinimized: patch.startMinimized,
      runInBackground: patch.runInBackground,
    })
  })

  ipcMain.handle('settings:getAttendanceSync', async (_e, payload) => {
    await authorizeSettings(store, payload)
    return getAttendanceSyncSettings(store)
  })

  ipcMain.handle('settings:saveAttendanceSync', async (_e, payload) => {
    await authorizeSettings(store, payload)
    const { clean } = stripToken(payload)
    const patch = clean.pastDays !== undefined ? clean : payload
    return saveAttendanceSyncSettings(store, { pastDays: patch.pastDays })
  })
}
