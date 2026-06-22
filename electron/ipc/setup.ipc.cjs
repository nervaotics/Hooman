const { checkProxyBypass } = require('../network-check.cjs')
const {
  getSupabaseConfig,
  isSupabaseConfigured,
  mergeSupabasePayload,
  testPostgresConnection,
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
    const prev = getSupabaseConfig(store)
    const merged = mergeSupabasePayload(payload, prev)
    if (!merged.projectRef || !merged.dbPassword) {
      throw new Error(
        'Supabase project URL and database password are required. URL must look like https://abcdefgh.supabase.co',
      )
    }
    return testPostgresConnection(merged)
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
