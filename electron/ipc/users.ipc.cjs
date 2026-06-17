const { authorize } = require('../lib/authGuard.cjs')
const userService = require('../services/userService.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerUsersIpc(ipcMain, store) {
  ipcMain.handle('users:list', async (_e, payload) => {
    const auth = await authorize(store, payload, { superAdmin: true })
    return userService.listUsers(auth.knex)
  })

  ipcMain.handle('users:create', async (_e, payload) => {
    const auth = await authorize(store, payload, { superAdmin: true })
    const { clean } = auth
    return userService.createUser(auth.knex, auth.user.id, clean)
  })

  ipcMain.handle('users:update', async (_e, payload) => {
    const auth = await authorize(store, payload, { superAdmin: true })
    const { clean } = auth
    if (!clean.id) throw new Error('id required')
    const { id, ...rest } = clean
    return userService.updateUser(auth.knex, auth.user.id, id, rest)
  })

  ipcMain.handle('users:deactivate', async (_e, payload) => {
    const auth = await authorize(store, payload, { superAdmin: true })
    const { clean } = auth
    if (!clean.id) throw new Error('id required')
    return userService.deactivateUser(auth.knex, auth.user.id, clean.id)
  })

  ipcMain.handle('users:permissionModules', async (_e, payload) => {
    await authorize(store, payload, { superAdmin: true })
    return { modules: userService.PERMISSION_MODULES }
  })
}
