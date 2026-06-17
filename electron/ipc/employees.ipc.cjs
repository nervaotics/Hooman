const { authorize } = require('../lib/authGuard.cjs')
const employeeService = require('../services/employeeService.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerEmployeesIpc(ipcMain, store) {
  ipcMain.handle('employees:getAll', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    return employeeService.fetchDirectory(auth.knex, auth.clean || {})
  })

  ipcMain.handle('employees:getOne', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    if (!auth.clean.id) throw new Error('id required')
    const detail = await employeeService.getEmployeeDetail(auth.knex, auth.clean.id)
    if (!detail) throw new Error('Employee not found')
    return detail
  })

  ipcMain.handle('employees:create', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    return employeeService.createEmployeeFull(auth.knex, auth.clean)
  })

  ipcMain.handle('employees:update', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    const { id, ...rest } = auth.clean
    return employeeService.updateEmployeeFull(auth.knex, id, rest)
  })

  ipcMain.handle('employees:delete', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    await employeeService.softDeleteEmployee(auth.knex, auth.clean.id)
    return { ok: true }
  })

  ipcMain.handle('employees:checkCnic', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    if (!auth.clean.cnic_number) return { exists: false }
    const row = await employeeService.checkCnicDuplicate(
      auth.knex,
      auth.clean.cnic_number,
      auth.clean.excludeId ?? null,
    )
    return { exists: Boolean(row), employee: row ? employeeService.mapEmployeeRow(row) : null }
  })

  ipcMain.handle('employees:uploadPhoto', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    if (!auth.clean.base64) throw new Error('base64 image required')
    const url = employeeService.saveEmployeePhoto(auth.clean.base64, auth.clean.filename)
    return { photo_url: url }
  })

  ipcMain.handle('employees:bulkImport', async (_e, payload) => {
    const auth = await authorize(store, payload, { superAdmin: true })
    if (!auth.clean.csv) throw new Error('csv content required')
    const bulkImport = require('../services/employeeBulkImport.cjs')
    const attendanceService = require('../services/attendanceService.cjs')
    const result = await bulkImport.bulkImportFromCsv(auth.knex, auth.clean.csv)
    await attendanceService.linkAttendanceEmployeeIds(auth.knex)
    return result
  })

  ipcMain.handle('employees:bulkImportTemplate', async (_e, payload) => {
    await authorize(store, payload, { superAdmin: true })
    const bulkImport = require('../services/employeeBulkImport.cjs')
    return { csv: bulkImport.CSV_TEMPLATE }
  })
}
