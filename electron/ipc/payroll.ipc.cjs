const { authorize } = require('../lib/authGuard.cjs')
const payrollService = require('../services/payrollService.cjs')
const payrollExportService = require('../services/payrollExportService.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerPayrollIpc(ipcMain, store) {
  ipcMain.handle('payroll:periods', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'read' })
    return payrollService.listPeriods(auth.knex)
  })

  ipcMain.handle('payroll:period', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'read' })
    if (!auth.clean.id) throw new Error('id required')
    const period = await payrollService.getPeriod(auth.knex, auth.clean.id)
    const records = await payrollService.listRecords(auth.knex, auth.clean.id)
    return { period, records }
  })

  ipcMain.handle('payroll:createPeriod', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'write' })
    const { clean, user } = auth
    const period = await payrollService.createPeriod(auth.knex, clean, user?.id)
    return { period }
  })

  ipcMain.handle('payroll:updatePeriod', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    const period = await payrollService.updatePeriod(auth.knex, auth.clean.id, auth.clean)
    return { period }
  })

  ipcMain.handle('payroll:deletePeriod', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    return payrollService.deletePeriod(auth.knex, auth.clean.id)
  })

  ipcMain.handle('payroll:processPeriod', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    const result = await payrollService.processPeriod(auth.knex, auth.clean.id)
    const records = await payrollService.listRecords(auth.knex, auth.clean.id)
    return { ...result, records }
  })

  ipcMain.handle('payroll:updateRecord', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    return payrollService.updateRecordAdjustments(auth.knex, auth.clean.id, auth.clean)
  })

  ipcMain.handle('payroll:approvePeriod', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    return payrollService.approvePeriod(auth.knex, auth.clean.id)
  })

  ipcMain.handle('payroll:revertPeriod', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    return payrollService.revertPeriod(auth.knex, auth.clean.id)
  })

  ipcMain.handle('payroll:statutorySettings', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'read' })
    return payrollService.getStatutorySettings(auth.knex)
  })

  ipcMain.handle('payroll:saveStatutorySettings', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'write' })
    return payrollService.saveStatutorySettings(auth.knex, auth.clean)
  })

  ipcMain.handle('payroll:periodAttendance', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'read' })
    const { periodId, employeeIds } = auth.clean
    if (!periodId) throw new Error('periodId required')
    const period = await payrollService.getPeriod(auth.knex, periodId)
    if (!period) throw new Error('Period not found')
    const rows = await payrollService.fetchAttendanceForPeriod(
      auth.knex,
      period.start_date,
      period.end_date,
      employeeIds || [],
    )
    return { rows }
  })

  ipcMain.handle('payroll:history', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'read' })
    return payrollService.listPeriods(auth.knex)
  })

  ipcMain.handle('payroll:exportStatutory', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'payroll_processing', level: 'read' })
    if (!auth.clean.periodId) throw new Error('periodId required')
    const format = auth.clean.format
    return payrollExportService.exportStatutoryCsv(auth.knex, auth.clean.periodId, format)
  })
}
