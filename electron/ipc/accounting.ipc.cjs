const { authorize } = require('../lib/authGuard.cjs')
const accountingService = require('../services/accountingService.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerAccountingIpc(ipcMain, store) {
  ipcMain.handle('accounting:meta', async (_e, payload) => {
    await authorize(store, payload, { module: 'accounting', level: 'read' })
    return accountingService.getMeta()
  })

  ipcMain.handle('accounting:accounts', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'read' })
    return accountingService.listAccounts(auth.knex, auth.clean)
  })

  ipcMain.handle('accounting:account', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'read' })
    if (!auth.clean.id) throw new Error('id required')
    return accountingService.getAccount(auth.knex, auth.clean.id)
  })

  ipcMain.handle('accounting:createAccount', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'write' })
    return accountingService.createAccount(auth.knex, auth.clean)
  })

  ipcMain.handle('accounting:updateAccount', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    return accountingService.updateAccount(auth.knex, auth.clean.id, auth.clean)
  })

  ipcMain.handle('accounting:deleteAccount', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    return accountingService.deleteAccount(auth.knex, auth.clean.id)
  })

  ipcMain.handle('accounting:vouchers', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'read' })
    return accountingService.listVouchers(auth.knex, auth.clean)
  })

  ipcMain.handle('accounting:voucher', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'read' })
    if (!auth.clean.id) throw new Error('id required')
    return accountingService.getVoucher(auth.knex, auth.clean.id)
  })

  ipcMain.handle('accounting:createVoucher', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'write' })
    return accountingService.createVoucher(auth.knex, auth.clean, auth.user?.id)
  })

  ipcMain.handle('accounting:updateVoucher', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    return accountingService.updateVoucher(auth.knex, auth.clean.id, auth.clean)
  })

  ipcMain.handle('accounting:deleteVoucher', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    return accountingService.deleteVoucher(auth.knex, auth.clean.id)
  })

  ipcMain.handle('accounting:voidVoucher', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    return accountingService.voidVoucher(auth.knex, auth.clean.id)
  })

  ipcMain.handle('accounting:postVoucher', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    return accountingService.postVoucher(auth.knex, auth.clean.id)
  })

  ipcMain.handle('accounting:ledger', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'read' })
    if (!auth.clean.accountId) throw new Error('accountId required')
    return accountingService.getLedger(auth.knex, auth.clean)
  })

  ipcMain.handle('accounting:trialBalance', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'read' })
    return accountingService.getTrialBalance(auth.knex, auth.clean)
  })

  ipcMain.handle('accounting:balanceSheet', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'accounting', level: 'read' })
    return accountingService.getBalanceSheet(auth.knex, auth.clean)
  })
}
