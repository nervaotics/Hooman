const { authorize } = require('../lib/authGuard.cjs')
const { insertReturningId } = require('../db/dialect.cjs')

async function assertUniqueDepartmentName(knex, name, excludeId = null) {
  let query = knex('departments').where({ name: String(name).trim() })
  if (excludeId) query = query.whereNot({ id: excludeId })
  const row = await query.first()
  if (row) {
    const err = new Error('A department with this name already exists')
    err.code = 'DUPLICATE'
    throw err
  }
}

async function assertUniqueDepartmentCode(knex, code, excludeId = null) {
  if (!code) return
  let query = knex('departments').where({ code: String(code).trim() })
  if (excludeId) query = query.whereNot({ id: excludeId })
  const row = await query.first()
  if (row) {
    const err = new Error('A department with this code already exists')
    err.code = 'DUPLICATE'
    throw err
  }
}

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerDepartmentsIpc(ipcMain, store) {
  ipcMain.handle('departments:getAll', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    return auth.knex('departments').select('id', 'name', 'code').orderBy('name')
  })

  ipcMain.handle('departments:create', async (_e, payload) => {
    const auth = await authorize(store, payload, { superAdmin: true })
    const name = String(auth.clean.name || '').trim()
    if (!name) throw new Error('Name is required')
    const code = auth.clean.code ? String(auth.clean.code).trim() : null
    await assertUniqueDepartmentName(auth.knex, name)
    await assertUniqueDepartmentCode(auth.knex, code)
    const id = await insertReturningId(auth.knex, 'departments', {
      name,
      code,
    })
    return { id }
  })

  ipcMain.handle('departments:update', async (_e, payload) => {
    const auth = await authorize(store, payload, { superAdmin: true })
    if (!auth.clean.id) throw new Error('id required')
    const name = String(auth.clean.name || '').trim()
    if (!name) throw new Error('Name is required')
    const code = auth.clean.code ? String(auth.clean.code).trim() : null
    await assertUniqueDepartmentName(auth.knex, name, auth.clean.id)
    await assertUniqueDepartmentCode(auth.knex, code, auth.clean.id)
    await auth.knex('departments').where({ id: auth.clean.id }).update({
      name,
      code,
      updated_at: new Date(),
    })
    return { ok: true }
  })

  ipcMain.handle('departments:delete', async (_e, payload) => {
    const auth = await authorize(store, payload, { superAdmin: true })
    if (!auth.clean.id) throw new Error('id required')
    const id = auth.clean.id
    const inPosting = await auth.knex('employee_postings').where({ department_id: id }).first()
    const inEmployee = await auth.knex('employees')
      .where({ department_id: id, is_deleted: false })
      .first()
    if (inPosting || inEmployee) {
      throw new Error('Cannot delete — department is assigned to employees')
    }
    await auth.knex('departments').where({ id }).del()
    return { ok: true }
  })
}
