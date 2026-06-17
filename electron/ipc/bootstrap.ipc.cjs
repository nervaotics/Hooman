const {
  getMergedDbConfig,
  isDbConfigComplete,
  pingDatabase,
  runMigrations,
  getOrCreateKnex,
} = require('../db/connection.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerBootstrapIpc(ipcMain, store) {
  ipcMain.handle('bootstrap:status', async () => {
    const savedDb = store.get('db_config', null)
    const hasSavedDbConfig = Boolean(
      savedDb?.host && savedDb?.database && savedDb?.user !== undefined && savedDb?.user !== null,
    )
    let appRole = store.get('app_role', null)
    const merged = getMergedDbConfig(store)
    const hasDbConfig = isDbConfigComplete(merged)

    if (!appRole && hasSavedDbConfig) {
      const host = String(merged.host || '').toLowerCase()
      appRole = host === '127.0.0.1' || host === 'localhost' ? 'server' : 'client'
      store.set('app_role', appRole)
    }

    const needsRoleSetup = !appRole && !hasSavedDbConfig
    const inferredRole =
      appRole ||
      (String(merged.host || '').startsWith('127.') || merged.host === 'localhost'
        ? 'server'
        : 'client')
    if (!hasDbConfig) {
      return {
        appRole: inferredRole,
        needsRoleSetup,
        hasDbConfig: false,
        dbReachable: false,
        hasUsers: false,
        needsAdminSetup: false,
        needsDatabaseSetup: true,
      }
    }

    try {
      await pingDatabase(store)
    } catch (err) {
      return {
        appRole: inferredRole,
        needsRoleSetup,
        hasDbConfig: true,
        dbReachable: false,
        hasUsers: false,
        needsAdminSetup: false,
        needsDatabaseSetup: false,
        error: err.message,
      }
    }

    try {
      await runMigrations(store)
    } catch (err) {
      return {
        appRole: inferredRole,
        needsRoleSetup,
        hasDbConfig: true,
        dbReachable: true,
        hasUsers: false,
        needsAdminSetup: false,
        needsDatabaseSetup: false,
        migrationError: err.message,
      }
    }

    const knex = getOrCreateKnex(store)
    const row = await knex('users').count('* as cnt').first()
    const cnt = Number(row?.cnt ?? 0)
    return {
      appRole: inferredRole,
      needsRoleSetup,
      hasDbConfig: true,
      dbReachable: true,
      hasUsers: cnt > 0,
      needsAdminSetup: cnt === 0,
      needsDatabaseSetup: false,
    }
  })
}
