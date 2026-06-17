const { stripToken } = require('./ipcPayload.cjs')
const { verifyToken } = require('./jwt.cjs')
const { getOrCreateKnex, runMigrations } = require('../db/connection.cjs')
const { canAccess, isSuperAdmin, permissionsForClient } = require('./permissions.cjs')

function unauthorized(message = 'Unauthorized') {
  const err = new Error(message)
  err.code = 'UNAUTHORIZED'
  return err
}

function forbidden(message = 'You do not have permission for this action') {
  const err = new Error(message)
  err.code = 'FORBIDDEN'
  return err
}

function serializeUser(row) {
  if (!row) return null
  const superAdmin = isSuperAdmin(row)
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    isSuperAdmin: superAdmin,
    employeeId: row.employee_id,
    isActive: Boolean(row.is_active),
    permissions: permissionsForClient(row),
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Authenticate JWT and load fresh user row (permissions always from DB).
 * @param {import('electron-store')} store
 * @param {object} payload
 * @param {{ module?: string, level?: 'read'|'write', superAdmin?: boolean }} opts
 */
async function authorize(store, payload, opts = {}) {
  await runMigrations(store)
  const knex = getOrCreateKnex(store)
  const { token, clean } = stripToken(payload)
  const decoded = verifyToken(token)
  if (!decoded?.sub) throw unauthorized()

  const row = await knex('users').where({ id: decoded.sub, is_active: true }).first()
  if (!row) throw unauthorized()

  const user = serializeUser(row)

  if (opts.superAdmin && !isSuperAdmin(row)) {
    throw forbidden('Super administrator access required')
  }

  if (opts.module) {
    const level = opts.level || 'read'
    if (!canAccess(row, opts.module, level)) {
      throw forbidden()
    }
  }

  return { knex, user, row, clean, decoded }
}

/**
 * Settings during first-time setup (no users yet) skip auth.
 */
async function authorizeSettings(store, payload) {
  await runMigrations(store)
  const knex = getOrCreateKnex(store)
  const countRow = await knex('users').count('* as cnt').first()
  if (Number(countRow?.cnt ?? 0) === 0) {
    const { clean } = stripToken(payload || {})
    return { knex, user: null, clean, setupMode: true }
  }
  return { ...(await authorize(store, payload, { superAdmin: true })), setupMode: false }
}

module.exports = {
  authorize,
  authorizeSettings,
  serializeUser,
  unauthorized,
  forbidden,
}
