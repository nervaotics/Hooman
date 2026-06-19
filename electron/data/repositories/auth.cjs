const bcrypt = require('bcryptjs')
const { signPayload, verifyToken } = require('../../lib/jwt.cjs')
const { serializeUser } = require('../../lib/authGuard.cjs')
const { insertReturningId } = require('../../db/dialect.cjs')

/**
 * @param {{ knex: import('knex').Knex }} provider
 */
async function login(provider, credentials = {}) {
  const knex = provider.knex
  const { username, password } = credentials
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

  return { token, user: serializeUser(user) }
}

/**
 * @param {{ knex: import('knex').Knex }} provider
 */
async function createFirstAdmin(provider, payload = {}) {
  const knex = provider.knex
  const { username, password } = payload
  if (!username || !password) throw new Error('Username and password required')
  if (password.length < 8) throw new Error('Password must be at least 8 characters')

  const row = await knex('users').count('* as cnt').first()
  if (Number(row?.cnt ?? 0) > 0) {
    throw new Error('An administrator account already exists')
  }

  const password_hash = await bcrypt.hash(password, 12)
  await insertReturningId(knex, 'users', {
    username,
    password_hash,
    role: 'super_admin',
    permissions: null,
    is_active: true,
  })

  return { ok: true }
}

/**
 * @param {{ knex: import('knex').Knex }} provider
 * @param {string | undefined} token
 */
async function session(provider, token) {
  const decoded = verifyToken(token)
  if (!decoded) return { user: null }
  const user = await provider.knex('users').where({ id: decoded.sub, is_active: true }).first()
  if (!user) return { user: null }
  return { user: serializeUser(user) }
}

module.exports = { login, createFirstAdmin, session }
