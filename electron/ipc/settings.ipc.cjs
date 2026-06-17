const {
  getMergedDbConfig,
  isDbConfigComplete,
  pingDatabase,
  resetKnex,
  runMigrations,
} = require('../db/connection.cjs')
const { authorizeSettings } = require('../lib/authGuard.cjs')
const { stripToken } = require('../lib/ipcPayload.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerSettingsIpc(ipcMain, store) {
  ipcMain.handle('settings:getDb', async (_e, payload) => {
    await authorizeSettings(store, payload)
    const merged = getMergedDbConfig(store)
    const saved = store.get('db_config', null)
    const { password: _pw, ...rest } = merged
    return {
      merged: {
        ...rest,
        password: '',
        passwordIsSet: Boolean(merged.password),
      },
      saved,
    }
  })

  ipcMain.handle('settings:saveDb', async (_e, payload) => {
    await authorizeSettings(store, payload)
    const { clean } = stripToken(payload)
    const config = clean.host !== undefined ? clean : payload
    if (!config?.host || !config?.database || !config?.user) {
      throw new Error('host, database, and user are required')
    }
    const prev = store.get('db_config', null)
    const nextPassword =
      config.password === undefined ||
      config.password === null ||
      String(config.password).trim() === ''
        ? prev?.password ?? ''
        : String(config.password)

    store.set('db_config', {
      host: config.host,
      port: config.port ?? 3306,
      user: config.user,
      password: nextPassword,
      database: config.database,
    })
    await resetKnex()
    await pingDatabase(store)
    await runMigrations(store)
    return { ok: true }
  })

  ipcMain.handle('settings:testDb', async (_e, payload) => {
    await authorizeSettings(store, payload)
    const base = getMergedDbConfig(store)
    const { clean } = stripToken(payload)
    const config = clean.host !== undefined ? clean : payload
    const testCfg = config?.host
      ? {
          host: config.host || base.host,
          port: Number(config.port ?? base.port ?? 3306),
          user: config.user || base.user,
          password:
            config.password === undefined ||
            config.password === null ||
            String(config.password).trim() === ''
              ? base.password
              : String(config.password),
          database: config.database || base.database,
        }
      : base

    if (!isDbConfigComplete(testCfg)) {
      throw new Error('Incomplete database configuration')
    }
    const knex = require('knex')({
      client: 'mysql2',
      connection: {
        host: testCfg.host,
        port: Number(testCfg.port || 3306),
        user: testCfg.user,
        password: testCfg.password ?? '',
        database: testCfg.database,
        timezone: 'Z',
      },
    })
    try {
      await knex.raw('select 1 as ok')
      await knex.destroy()
      return { ok: true }
    } catch (err) {
      await knex.destroy().catch(() => {})
      throw err
    }
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
}
