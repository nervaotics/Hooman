const crypto = require('crypto')
const mysql = require('mysql2/promise')
const { getMergedDbConfig, runMigrations, pingDatabase } = require('../db/connection.cjs')
const { checkProxyBypass } = require('../network-check.cjs')

const REMOTE_USER = 'hrm_remote'
const DEFAULT_REMOTE_PASSWORD =
  process.env.HRM_REMOTE_PASSWORD || 'HoomanOffice#2026Secure'

function generatePassword() {
  return crypto.randomBytes(12).toString('base64').replace(/[/+=]/g, '').slice(0, 16)
}

async function ensureRemoteAccess(store, password) {
  const cfg = getMergedDbConfig(store)
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: Number(cfg.port || 3306),
    user: cfg.user || 'root',
    password: cfg.password || '',
    database: cfg.database,
  })
  try {
    await conn.query(
      `CREATE USER IF NOT EXISTS '${REMOTE_USER}'@'%' IDENTIFIED BY ?`,
      [password],
    )
    await conn.query(`ALTER USER '${REMOTE_USER}'@'%' IDENTIFIED BY ?`, [password])
    await conn.query(
      `GRANT ALL PRIVILEGES ON \`${cfg.database}\`.* TO '${REMOTE_USER}'@'%'`,
    )
    await conn.query('FLUSH PRIVILEGES')
  } finally {
    await conn.end().catch(() => {})
  }
}

module.exports = function registerSetupIpc(ipcMain, store) {
  ipcMain.handle('setup:getState', async () => {
    const appRole = store.get('app_role', null)
    const serverHost = store.get('server_host_suggestion', '192.168.0.107')
    return { appRole, serverHost }
  })

  ipcMain.handle('setup:testServerConnection', async (_e, payload = {}) => {
    const ip = String(payload.ip || '').trim()
    const base = getMergedDbConfig(store)
    if (!ip) throw new Error('Server IP is required')
    const cfg = {
      host: ip,
      port: Number(payload.port ?? base.port ?? 3306),
      user: String(payload.user || REMOTE_USER),
      password: String(payload.password || store.get('hrm_remote_password', DEFAULT_REMOTE_PASSWORD)),
      database: String(payload.database || base.database || 'hooman_hrm'),
    }
    const conn = await mysql.createConnection(cfg)
    try {
      await conn.query('select 1 as ok')
      return { ok: true }
    } finally {
      await conn.end().catch(() => {})
    }
  })

  ipcMain.handle('setup:asServer', async () => {
    const merged = getMergedDbConfig(store)
    const roleDb = {
      host: '127.0.0.1',
      port: Number(merged.port || 3306),
      user: merged.user || 'root',
      password: merged.password || '',
      database: merged.database || 'hooman_hrm',
    }
    store.set('db_config', roleDb)
    store.set('app_role', 'server')
    store.set('server_host_suggestion', '192.168.0.107')

    await pingDatabase(store)
    await runMigrations(store)

    const remotePassword = store.get('hrm_remote_password', DEFAULT_REMOTE_PASSWORD) || generatePassword()
    await ensureRemoteAccess(store, remotePassword)
    store.set('hrm_remote_password', remotePassword)

    const proxyCheck = await checkProxyBypass()

    return {
      success: true,
      appRole: 'server',
      remoteUser: REMOTE_USER,
      remotePassword,
      warning: proxyCheck.configured
        ? null
        : 'Your system proxy may not bypass local network addresses. If client PCs cannot connect, add 192.168.*;127.0.0.1;localhost to Windows proxy exceptions.',
    }
  })

  ipcMain.handle('setup:asClient', async (_e, payload = {}) => {
    const ip = String(payload.ip || '').trim()
    if (!ip) throw new Error('Server IP is required')
    const merged = getMergedDbConfig(store)
    const password = String(payload.password || store.get('hrm_remote_password', DEFAULT_REMOTE_PASSWORD))
    const clientDb = {
      host: ip,
      port: Number(payload.port ?? merged.port ?? 3306),
      user: String(payload.user || REMOTE_USER),
      password,
      database: String(payload.database || merged.database || 'hooman_hrm'),
    }
    const conn = await mysql.createConnection(clientDb)
    try {
      await conn.query('select 1 as ok')
    } finally {
      await conn.end().catch(() => {})
    }
    store.set('db_config', clientDb)
    store.set('app_role', 'client')
    store.set('server_host_suggestion', ip)
    return { success: true, appRole: 'client' }
  })
}
