const { checkProxyBypass } = require('../network-check.cjs')
const {
  getSupabaseConfig,
  isSupabaseConfigured,
  extractProjectRef,
  writeSupabaseStore,
} = require('../db/supabaseConfig.cjs')
const {
  pingDatabase,
  resetKnex,
  runMigrations,
} = require('../db/connection.cjs')
const { enableServerAutoLaunchDefaults } = require('../autoLaunch.cjs')

async function persistSupabaseConfig(store, payload = {}) {
  writeSupabaseStore(store, payload)
  await resetKnex()
  await pingDatabase(store)
  await runMigrations(store)
}

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerSetupIpc(ipcMain, store) {
  ipcMain.handle('setup:getState', async () => {
    const appRole = store.get('app_role', null)
    const supabase = getSupabaseConfig(store)
    return {
      appRole,
      hasSupabase: isSupabaseConfigured(supabase),
      supabaseUrl: supabase?.url || '',
    }
  })

  ipcMain.handle('setup:testSupabase', async (_e, payload = {}) => {
    const url = String(payload.url || '').trim()
    const dbPassword = String(payload.dbPassword || '').trim()
    const projectRef = extractProjectRef(url)
    if (!url || !dbPassword || !projectRef) {
      throw new Error('Supabase URL and database password are required')
    }
    const knex = require('knex')({
      client: 'pg',
      connection: {
        host: `db.${projectRef}.supabase.co`,
        port: 5432,
        user: 'postgres',
        password: dbPassword,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
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

  ipcMain.handle('setup:saveSupabase', async (_e, payload = {}) => {
    await persistSupabaseConfig(store, payload)
    return { ok: true }
  })

  ipcMain.handle('setup:asServer', async (_e, payload = {}) => {
    if (payload.url && payload.dbPassword) {
      await persistSupabaseConfig(store, payload)
    } else if (!isSupabaseConfigured(getSupabaseConfig(store))) {
      throw new Error('Connect Supabase first (URL and database password).')
    }

    store.set('app_role', 'server')
    store.set('auto_start_xampp', false)
    enableServerAutoLaunchDefaults(store)

    const proxyCheck = await checkProxyBypass()
    return {
      success: true,
      appRole: 'server',
      warning: proxyCheck.configured
        ? null
        : 'Your system proxy may not bypass local network addresses. If device sync fails, add 192.168.* to Windows proxy exceptions.',
    }
  })

  ipcMain.handle('setup:asClient', async (_e, payload = {}) => {
    await persistSupabaseConfig(store, payload)
    store.set('app_role', 'client')
    store.set('auto_start_xampp', false)
    return { success: true, appRole: 'client' }
  })

  ipcMain.handle('setup:testServerConnection', async () => {
    throw new Error('LAN MySQL client setup is no longer used. Connect via Supabase instead.')
  })
}
