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
    const appRole = store.get('app_role', null)
    const merged = getMergedDbConfig(store)
    const hasDbConfig = isDbConfigComplete(merged)
    const inferredRole = appRole || (String(merged.host || '').startsWith('127.') || merged.host === 'localhost' ? 'server' : 'client')
    const needsRoleSetup = !appRole && !hasDbConfig
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
