const { stripToken } = require('../lib/ipcPayload.cjs')
const {
  getMergedDbConfig,
  isDbConfigComplete,
  ensureMigrations,
} = require('../db/connection.cjs')
const { getProvider } = require('../data/provider.cjs')
const authRepo = require('../data/repositories/auth.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerAuthIpc(ipcMain, store) {
  ipcMain.handle('auth:login', async (_e, credentials) => {
    if (!isDbConfigComplete(getMergedDbConfig(store))) {
      throw new Error('Database is not configured')
    }
    await ensureMigrations(store)
    const provider = getProvider(store)
    return authRepo.login(provider, credentials)
  })

  ipcMain.handle('auth:logout', async () => ({ ok: true }))

  ipcMain.handle('auth:createFirstAdmin', async (_e, payload) => {
    if (!isDbConfigComplete(getMergedDbConfig(store))) {
      throw new Error('Database is not configured')
    }
    await ensureMigrations(store)
    const provider = getProvider(store)
    return authRepo.createFirstAdmin(provider, payload)
  })

  ipcMain.handle('auth:session', async (_e, payload) => {
    const { token } = stripToken(payload)
    await ensureMigrations(store)
    const provider = getProvider(store)
    return authRepo.session(provider, token)
  })
}
