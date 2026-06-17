const fs = require('fs')
const path = require('path')
const net = require('net')
const { spawn } = require('child_process')
const { getMergedDbConfig, pingDatabase } = require('./db/connection.cjs')

const DEFAULT_XAMPP_PATHS = ['C:\\xampp', 'D:\\xampp', 'E:\\xampp']

function isServerRole(store) {
  const appRole = store.get('app_role', null)
  if (appRole === 'server') return true
  if (appRole === 'client') return false
  const merged = getMergedDbConfig(store)
  const host = String(merged.host || '').toLowerCase()
  return host === '127.0.0.1' || host === 'localhost'
}

function shouldAutoStart(store) {
  return store.get('auto_start_xampp', true) !== false
}

function resolveXamppPath(store) {
  const candidates = [
    store.get('xampp_path'),
    process.env.XAMPP_ROOT,
    process.env.XAMPP_PATH,
    ...DEFAULT_XAMPP_PATHS,
  ].filter(Boolean)

  for (const root of candidates) {
    const normalized = path.normalize(String(root))
    const mysqlStart = path.join(normalized, 'mysql_start.bat')
    const mysqld = path.join(normalized, 'mysql', 'bin', 'mysqld.exe')
    if (fs.existsSync(mysqlStart) || fs.existsSync(mysqld)) {
      return normalized
    }
  }
  return null
}

function isMysqlPortOpen(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
    socket.connect(Number(port), host)
  })
}

async function isMysqlReachable(store) {
  const merged = getMergedDbConfig(store)
  const host = merged.host || '127.0.0.1'
  const port = Number(merged.port || 3306)
  if (await isMysqlPortOpen(host, port)) return true
  try {
    await pingDatabase(store)
    return true
  } catch {
    return false
  }
}

function spawnDetached(command, args, options = {}) {
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    ...options,
  })
  child.unref()
  return child
}

function startMysqlFromXampp(xamppPath) {
  const mysqlStartBat = path.join(xamppPath, 'mysql_start.bat')
  if (fs.existsSync(mysqlStartBat)) {
    spawnDetached('cmd.exe', ['/c', mysqlStartBat], { cwd: xamppPath })
    return { started: true, method: 'mysql_start.bat', path: mysqlStartBat }
  }

  const mysqld = path.join(xamppPath, 'mysql', 'bin', 'mysqld.exe')
  const myIni = path.join(xamppPath, 'mysql', 'bin', 'my.ini')
  if (fs.existsSync(mysqld)) {
    const args = fs.existsSync(myIni)
      ? [`--defaults-file=${myIni}`, '--standalone']
      : ['--standalone']
    spawnDetached(mysqld, args, { cwd: path.dirname(mysqld) })
    return { started: true, method: 'mysqld.exe', path: mysqld }
  }

  return { started: false, method: null, path: null }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * On Server PC, ensure XAMPP MySQL is running before Hooman connects.
 * @param {import('electron-store')} store
 */
async function ensureXamppMysql(store) {
  if (process.platform !== 'win32') {
    return { ok: true, skipped: 'not-windows' }
  }
  if (!isServerRole(store)) {
    return { ok: true, skipped: 'not-server' }
  }
  if (!shouldAutoStart(store)) {
    return { ok: true, skipped: 'auto-start-disabled' }
  }

  if (await isMysqlReachable(store)) {
    return { ok: true, alreadyRunning: true }
  }

  const xamppPath = resolveXamppPath(store)
  if (!xamppPath) {
    console.warn('[Hooman] XAMPP not found — start MySQL manually or set xampp_path in config.')
    return { ok: false, error: 'xampp-not-found' }
  }

  store.set('xampp_path', xamppPath)
  const startResult = startMysqlFromXampp(xamppPath)
  if (!startResult.started) {
    return { ok: false, error: 'mysql-start-failed', xamppPath }
  }

  console.log(`[Hooman] Starting XAMPP MySQL via ${startResult.method} (${xamppPath})`)

  for (let attempt = 1; attempt <= 15; attempt += 1) {
    await sleep(2000)
    if (await isMysqlReachable(store)) {
      return {
        ok: true,
        started: true,
        xamppPath,
        method: startResult.method,
        attempts: attempt,
      }
    }
  }

  return {
    ok: false,
    error: 'mysql-start-timeout',
    xamppPath,
    method: startResult.method,
  }
}

module.exports = {
  ensureXamppMysql,
  resolveXamppPath,
  isServerRole,
}
