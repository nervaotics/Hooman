const { authorize } = require('../lib/authGuard.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerLeavesIpc(ipcMain, store) {
  ipcMain.handle('leaves:getAll', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    return auth.knex('leave_requests').select('*').orderBy('id', 'desc').limit(500)
  })

  ipcMain.handle('leaves:apply', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    await auth.knex('leave_requests').insert({
      ...auth.clean,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    })
    return { ok: true }
  })

  ipcMain.handle('leaves:approve', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    await auth.knex('leave_requests').where({ id: auth.clean.id }).update({
      status: 'approved',
      approved_by: auth.clean.approved_by ?? auth.user.id,
      updated_at: new Date(),
    })
    return { ok: true }
  })

  ipcMain.handle('leaves:reject', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    await auth.knex('leave_requests').where({ id: auth.clean.id }).update({
      status: 'rejected',
      rejection_reason: auth.clean.reason ?? '',
      updated_at: new Date(),
    })
    return { ok: true }
  })

  ipcMain.handle('leaves:balances', async (_e, payload) => {
    await authorize(store, payload, { module: 'employee_data', level: 'read' })
    return []
  })
}
