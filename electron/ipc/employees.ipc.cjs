const { authorize } = require('../lib/authGuard.cjs')
const { getProvider } = require('../data/provider.cjs')
const employeesRepo = require('../data/repositories/employees.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerEmployeesIpc(ipcMain, store) {
  ipcMain.handle('employees:getAll', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    return employeesRepo.getAll(getProvider(store), auth.clean || {})
  })

  ipcMain.handle('employees:getOne', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    if (!auth.clean.id) throw new Error('id required')
    const detail = await employeesRepo.getOne(getProvider(store), auth.clean.id)
    if (!detail) throw new Error('Employee not found')
    return detail
  })

  ipcMain.handle('employees:create', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    return employeesRepo.create(getProvider(store), auth.clean)
  })

  ipcMain.handle('employees:update', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    const { id, ...rest } = auth.clean
    return employeesRepo.update(getProvider(store), id, rest)
  })

  ipcMain.handle('employees:delete', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    await employeesRepo.remove(getProvider(store), auth.clean.id)
    return { ok: true }
  })

  ipcMain.handle('employees:checkCnic', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    const employeeService = require('../services/employeeService.cjs')
    return employeeService.checkCnicDuplicate(
      auth.knex,
      auth.clean.cnic_number,
      auth.clean.excludeId,
    )
  })

  ipcMain.handle('employees:uploadPhoto', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    const employeeService = require('../services/employeeService.cjs')
    return employeeService.saveEmployeePhoto(auth.clean.base64, auth.clean.filename)
  })

  ipcMain.handle('employees:bulkImport', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    const bulk = require('../services/employeeBulkImport.cjs')
    return bulk.bulkImportFromCsv(auth.knex, auth.clean.csv)
  })

  ipcMain.handle('employees:bulkImportTemplate', async (_e, payload) => {
    await authorize(store, payload, { module: 'employee_data', level: 'read' })
    const bulk = require('../services/employeeBulkImport.cjs')
    return bulk.CSV_TEMPLATE
  })
}
