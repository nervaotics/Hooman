const { authorize } = require('../lib/authGuard.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerPayrollIpc(ipcMain, store) {
  ipcMain.handle('payroll:run', async (_e, payload) => {
    await authorize(store, payload, { module: 'payroll_processing', level: 'write' })
    return { ok: false, message: 'Payroll run not implemented yet' }
  })

  ipcMain.handle('payroll:history', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'read' })
    return auth.knex('payroll_runs').select('*').orderBy('id', 'desc').limit(100)
  })

  ipcMain.handle('payroll:slip', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'read' })
    if (!auth.clean.id) throw new Error('id required')
    return auth.knex('payroll_slips').where({ id: auth.clean.id }).first()
  })
}
