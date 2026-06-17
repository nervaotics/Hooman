const { authorize } = require('../lib/authGuard.cjs')
const dashboardService = require('../services/dashboardService.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerDashboardIpc(ipcMain, store) {
  ipcMain.handle('dashboard:stats', async (_e, payload) => {
    const auth = await authorize(store, payload)
    return dashboardService.fetchDashboardStats(auth.knex, store)
  })
}
