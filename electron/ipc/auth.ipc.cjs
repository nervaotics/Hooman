const bcrypt = require('bcryptjs')
const { stripToken } = require('../lib/ipcPayload.cjs')
const { signPayload, verifyToken } = require('../lib/jwt.cjs')
const { serializeUser } = require('../lib/authGuard.cjs')
const {
  getMergedDbConfig,
  isDbConfigComplete,
  getOrCreateKnex,
  runMigrations,
} = require('../db/connection.cjs')

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {import('electron-store')} store
 */
module.exports = function registerAuthIpc(ipcMain, store) {
  ipcMain.handle('auth:login', async (_e, credentials) => {
    if (!isDbConfigComplete(getMergedDbConfig(store))) {
      throw new Error('Database is not configured')
    }
    await runMigrations(store)
    const knex = getOrCreateKnex(store)
    const { username, password } = credentials || {}
    if (!username || !password) throw new Error('Please enter your username and password.')

    const user = await knex('users').where({ username, is_active: true }).first()
    if (!user) throw new Error('Wrong username or password.')

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) throw new Error('Wrong username or password.')

    await knex('users').where({ id: user.id }).update({ last_login: knex.fn.now() })

    const token = signPayload({
      sub: user.id,
      role: user.role,
      username: user.username,
    })

    return {
      token,
      user: serializeUser(user),
    }
  })

  ipcMain.handle('auth:logout', async () => ({ ok: true }))

  ipcMain.handle('auth:createFirstAdmin', async (_e, payload) => {
    const { username, password } = payload || {}
    if (!username || !password) throw new Error('Username and password required')
    if (password.length < 8) throw new Error('Password must be at least 8 characters')

    if (!isDbConfigComplete(getMergedDbConfig(store))) {
      throw new Error('Database is not configured')
    }
    await runMigrations(store)
    const knex = getOrCreateKnex(store)

    const row = await knex('users').count('* as cnt').first()
    if (Number(row?.cnt ?? 0) > 0) {
      throw new Error('An administrator account already exists')
    }

    const password_hash = await bcrypt.hash(password, 12)
    await knex('users').insert({
      username,
      password_hash,
      role: 'super_admin',
      permissions: null,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })

    return { ok: true }
  })

  ipcMain.handle('auth:session', async (_e, payload) => {
    const { token } = stripToken(payload)
    const decoded = verifyToken(token)
    if (!decoded) return { user: null }
    await runMigrations(store)
    const knex = getOrCreateKnex(store)
    const user = await knex('users').where({ id: decoded.sub, is_active: true }).first()
    if (!user) return { user: null }
    return { user: serializeUser(user) }
  })
}
