const bcrypt = require('bcryptjs')
const { insertReturningId, isPostgres } = require('../db/dialect.cjs')
const { validatePermissionsInput, isSuperAdmin } = require('../lib/permissions.cjs')
const { serializeUser } = require('../lib/authGuard.cjs')

const BCRYPT_ROUNDS = 12
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/

function validatePassword(password) {
  const p = String(password || '')
  if (p.length < 8) {
    const err = new Error('Password must be at least 8 characters')
    err.code = 'WEAK_PASSWORD'
    throw err
  }
  if (!/[a-zA-Z]/.test(p) || !/[0-9]/.test(p)) {
    const err = new Error('Password must include letters and numbers')
    err.code = 'WEAK_PASSWORD'
    throw err
  }
}

function validateUsername(username) {
  const u = String(username || '').trim()
  if (!USERNAME_RE.test(u)) {
    const err = new Error('Username must be 3–32 characters (letters, numbers, . _ -)')
    err.code = 'INVALID_USERNAME'
    throw err
  }
  return u
}

/**
 * @param {import('knex').Knex} knex
 */
async function listUsers(knex) {
  const rows = await knex('users')
    .select('id', 'username', 'role', 'permissions', 'is_active', 'last_login', 'created_at', 'updated_at')
    .orderBy('username')
  return rows.map(serializeUser)
}

/**
 * @param {import('knex').Knex} knex
 * @param {number} actorId
 */
async function createUser(knex, actorId, payload) {
  const username = validateUsername(payload.username)
  validatePassword(payload.password)
  const permissions = validatePermissionsInput(payload.permissions)

  const dup = await knex('users').where({ username }).first()
  if (dup) {
    const err = new Error('Username already exists')
    err.code = 'DUPLICATE_USERNAME'
    throw err
  }

  const password_hash = await bcrypt.hash(String(payload.password), BCRYPT_ROUNDS)
  const id = await insertReturningId(knex, 'users', {
    username,
    password_hash,
    role: 'staff',
    permissions: isPostgres(knex) ? permissions : JSON.stringify(permissions),
    is_active: true,
  })

  const row = await knex('users').where({ id }).first()
  return serializeUser(row)
}

/**
 * @param {import('knex').Knex} knex
 * @param {number} actorId
 */
async function updateUser(knex, actorId, userId, payload) {
  const target = await knex('users').where({ id: userId }).first()
  if (!target) throw new Error('User not found')

  if (isSuperAdmin(target) && actorId === userId && payload.is_active === false) {
    throw new Error('You cannot deactivate your own super administrator account')
  }

  if (isSuperAdmin(target) && payload.role === 'staff') {
    const err = new Error('Cannot downgrade a super administrator via this screen')
    err.code = 'FORBIDDEN'
    throw err
  }

  const patch = { updated_at: new Date() }

  if (payload.permissions !== undefined) {
    if (isSuperAdmin(target)) {
      throw new Error('Super administrator permissions cannot be edited')
    }
    patch.permissions = isPostgres(knex)
      ? validatePermissionsInput(payload.permissions)
      : JSON.stringify(validatePermissionsInput(payload.permissions))
  }

  if (payload.is_active !== undefined) {
    if (actorId === userId && payload.is_active === false) {
      throw new Error('You cannot deactivate your own account')
    }
    patch.is_active = Boolean(payload.is_active)
  }

  if (payload.password) {
    validatePassword(payload.password)
    patch.password_hash = await bcrypt.hash(String(payload.password), BCRYPT_ROUNDS)
  }

  await knex('users').where({ id: userId }).update(patch)
  const row = await knex('users').where({ id: userId }).first()
  return serializeUser(row)
}

/**
 * @param {import('knex').Knex} knex
 * @param {number} actorId
 */
async function deactivateUser(knex, actorId, userId) {
  if (actorId === userId) {
    throw new Error('You cannot deactivate your own account')
  }
  const target = await knex('users').where({ id: userId }).first()
  if (!target) throw new Error('User not found')
  if (isSuperAdmin(target)) {
    const others = await knex('users')
      .where('role', 'super_admin')
      .where('is_active', true)
      .whereNot({ id: userId })
      .count('* as cnt')
      .first()
    if (Number(others?.cnt ?? 0) === 0) {
      throw new Error('Cannot deactivate the only super administrator')
    }
  }
  await knex('users').where({ id: userId }).update({
    is_active: false,
    updated_at: new Date(),
  })
  return { ok: true }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  PERMISSION_MODULES: require('../lib/permissions.cjs').PERMISSION_MODULES,
}
