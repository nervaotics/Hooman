const { toUserMessage } = require('../lib/userErrors.cjs')
const {
  getMergedDbConfig,
  isDbConfigComplete,
  pingDatabase,
  getOrCreateKnex,
  ensureMigrations,
  getSupabaseConfig,
  isSupabaseConfigured,
} = require('../db/connection.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerBootstrapIpc(ipcMain, store) {
  ipcMain.handle('bootstrap:status', async () => {
    let appRole = store.get('app_role', null)
    let supabase = null
    try {
      supabase = getSupabaseConfig(store)
    } catch (err) {
      return {
        appRole,
        needsRoleSetup: !appRole,
        hasDbConfig: false,
        dbReachable: false,
        hasUsers: false,
        needsAdminSetup: false,
        needsDatabaseSetup: true,
        provider: 'supabase',
        error: toUserMessage(err, 'Saved Supabase credentials could not be read. Set them up again.'),
      }
    }
    const hasSupabase = isSupabaseConfigured(supabase)
    const merged = getMergedDbConfig(store)
    const hasDbConfig = hasSupabase || isDbConfigComplete(merged)

    const needsRoleSetup = !appRole

    if (!hasDbConfig) {
      return {
        appRole,
        needsRoleSetup,
        hasDbConfig: false,
        dbReachable: false,
        hasUsers: false,
        needsAdminSetup: false,
        needsDatabaseSetup: true,
        provider: 'supabase',
      }
    }

    try {
      await pingDatabase(store)
    } catch (err) {
      return {
        appRole,
        needsRoleSetup,
        hasDbConfig: true,
        dbReachable: false,
        hasUsers: false,
        needsAdminSetup: false,
        needsDatabaseSetup: false,
        provider: hasSupabase ? 'supabase' : 'legacy',
        error: toUserMessage(err, 'Cannot connect to Supabase.'),
      }
    }

    try {
      await ensureMigrations(store)
    } catch (err) {
      return {
        appRole,
        needsRoleSetup,
        hasDbConfig: true,
        dbReachable: true,
        hasUsers: false,
        needsAdminSetup: false,
        needsDatabaseSetup: false,
        provider: hasSupabase ? 'supabase' : 'legacy',
        migrationError: toUserMessage(err, 'Could not update the database schema.'),
      }
    }

    const knex = getOrCreateKnex(store)
    const row = await knex('users').count('* as cnt').first()
    const cnt = Number(row?.cnt ?? 0)
    return {
      appRole,
      needsRoleSetup,
      hasDbConfig: true,
      dbReachable: true,
      hasUsers: cnt > 0,
      needsAdminSetup: cnt === 0,
      needsDatabaseSetup: false,
      provider: hasSupabase ? 'supabase' : 'legacy',
    }
  })
}
