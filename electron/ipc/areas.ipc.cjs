const { authorize } = require('../lib/authGuard.cjs')

async function assertUniqueAreaName(knex, name, excludeId = null) {
  let query = knex('areas').where({ name: String(name).trim(), is_deleted: false })
  if (excludeId) query = query.whereNot({ id: excludeId })
  const row = await query.first()
  if (row) {
    const err = new Error('A site with this name already exists')
    err.code = 'DUPLICATE'
    throw err
  }
}

async function assertUniqueAreaCode(knex, code, excludeId = null) {
  if (!code) return
  let query = knex('areas').where({ code: String(code).trim(), is_deleted: false })
  if (excludeId) query = query.whereNot({ id: excludeId })
  const row = await query.first()
  if (row) {
    const err = new Error('A site with this code already exists')
    err.code = 'DUPLICATE'
    throw err
  }
}

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerAreasIpc(ipcMain, store) {
  ipcMain.handle('areas:getAll', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'read' })
    return auth.knex('areas')
      .select('id', 'name', 'code')
      .where('is_deleted', false)
      .orderBy('name')
  })

  ipcMain.handle('areas:create', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    const name = String(auth.clean.name || '').trim()
    if (!name) throw new Error('Name is required')
    const code = auth.clean.code ? String(auth.clean.code).trim() : null
    await assertUniqueAreaName(auth.knex, name)
    await assertUniqueAreaCode(auth.knex, code)
    const [id] = await auth.knex('areas').insert({
      name,
      code,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    return { id }
  })

  ipcMain.handle('areas:update', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    const name = String(auth.clean.name || '').trim()
    if (!name) throw new Error('Name is required')
    const code = auth.clean.code ? String(auth.clean.code).trim() : null
    await assertUniqueAreaName(auth.knex, name, auth.clean.id)
    await assertUniqueAreaCode(auth.knex, code, auth.clean.id)
    await auth.knex('areas').where({ id: auth.clean.id }).update({
      name,
      code,
      updated_at: new Date(),
    })
    return { ok: true }
  })

  ipcMain.handle('areas:delete', async (_e, payload) => {
    const auth = await authorize(store, payload, { module: 'employee_data', level: 'write' })
    if (!auth.clean.id) throw new Error('id required')
    const id = auth.clean.id
    const inPosting = await auth.knex('employee_postings').where({ area_id: id }).first()
    if (inPosting) {
      throw new Error('Cannot delete — site is assigned to employees')
    }
    await auth.knex('areas').where({ id }).update({
      is_deleted: true,
      updated_at: new Date(),
    })
    return { ok: true }
  })
}
