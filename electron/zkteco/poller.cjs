const cron = require('node-cron')
const Store = require('electron-store')
const { DEFAULT_DEVICES } = require('./devices.cjs')
const {
  periodBoundsUtc,
  parseDateKey,
  daysBetweenInclusive,
  normalizeDevicePunchTime,
} = require('../lib/timezone.cjs')
const { resolveDeviceUserId, buildPunchMapFromRows, lookupEmployeeId } = require('../lib/punchMap.cjs')

let lastPollResults = []
let syncChain = Promise.resolve()

function withDeviceSyncLock(fn) {
  const run = syncChain.then(fn, fn)
  syncChain = run.catch(() => {})
  return run
}

function inportForDevice(deviceIndex = 0) {
  return 40232 + (deviceIndex % 50)
}

function formatDeviceError(message) {
  const msg = String(message || '').trim()
  if (!msg) return 'Could not connect to device.'
  if (/EADDRINUSE/i.test(msg)) {
    return 'Sync busy — another device is using the connection port. Try again in a moment.'
  }
  if (/timeout/i.test(msg)) return 'Device did not respond in time.'
  if (/econnrefused|ehostunreach|enotfound|network is unreachable/i.test(msg)) {
    return 'Cannot reach this device on the network. Check IP and cable/Wi‑Fi.'
  }
  if (/ack error|zero length reply|^zero$/i.test(msg)) return 'Device rejected the connection.'
  return msg.length > 120 ? 'Could not connect to device.' : msg
}

function getLastPollResults() {
  return lastPollResults
}

function promisifyConnect(zk) {
  return new Promise((resolve, reject) => {
    zk.connect((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function promisifyGetAttendance(zk) {
  return new Promise((resolve, reject) => {
    zk.getAttendance((err, data) => {
      if (err) reject(err)
      else resolve(data || [])
    })
  })
}

function promisifyDisconnect(zk) {
  return new Promise((resolve) => {
    zk.disconnect(() => resolve())
  })
}

const MAX_SYNC_DAYS = 366

function resolveSyncPeriod(options = {}) {
  const fromDate = parseDateKey(options.fromDate)
  const toDate = parseDateKey(options.toDate)
  if (!fromDate && !toDate) return null
  if (!fromDate || !toDate) {
    throw new Error('Both fromDate and toDate are required for period sync (YYYY-MM-DD)')
  }
  if (fromDate > toDate) {
    throw new Error('fromDate must be on or before toDate')
  }
  const dayCount = daysBetweenInclusive(fromDate, toDate)
  if (dayCount > MAX_SYNC_DAYS) {
    throw new Error(`Period cannot exceed ${MAX_SYNC_DAYS} days`)
  }
  const { start, end } = periodBoundsUtc(fromDate, toDate)
  return { fromDate, toDate, start, end, dayCount }
}

/**
 * @param {import('electron-store')} store
 * @param {{ fromDate?: string, toDate?: string }} [options]
 * @param {number} [deviceIndex]
 */
async function pullFromDevice(device, store, options = {}, deviceIndex = 0) {
  let ZKLib
  try {
    ZKLib = require('zklib')
  } catch {
    return {
      success: false,
      error: 'zklib module not available',
      device: device.name,
      syncing: false,
    }
  }

  let ConnectionTypes
  try {
    ConnectionTypes = require('zklib/zklib/constants').ConnectionTypes
  } catch {
    return {
      success: false,
      error: 'Could not load zklib constants',
      device: device.name,
      syncing: false,
    }
  }

  const { getMergedDbConfig, isDbConfigComplete, getOrCreateKnex } = require('../db/connection.cjs')

  if (!isDbConfigComplete(getMergedDbConfig(store))) {
    return {
      success: false,
      error: 'Database not configured',
      device: device.name,
      syncing: false,
    }
  }

  const zk = new ZKLib({
    ip: device.ip,
    port: Number(device.port) || 4370,
    inport: inportForDevice(deviceIndex),
    timeout: 20000,
    connectionType: ConnectionTypes.UDP,
  })

  try {
    await promisifyConnect(zk)
    const logs = await promisifyGetAttendance(zk)
    const knex = getOrCreateKnex(store)

    const empRows = await knex('employees')
      .select('id', 'punch_code', 'employee_code')
      .where('is_deleted', false)
    const punchMap = buildPunchMapFromRows(empRows)

    const period = resolveSyncPeriod(options)
    let saved = 0
    let inPeriod = 0

    for (const log of logs) {
      const punchTime = normalizeDevicePunchTime(log.timestamp)
      if (!punchTime) continue
      if (period && (punchTime < period.start || punchTime > period.end)) continue
      inPeriod += 1

      const raw = JSON.stringify(log)
      const deviceUserId = resolveDeviceUserId(log)
      const employeeId = lookupEmployeeId(punchMap, deviceUserId)
      const q = `
        INSERT IGNORE INTO attendance_logs
        (device_id, employee_device_id, employee_id, punch_time, punch_type, raw_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
      `
      // eslint-disable-next-line no-await-in-loop
      const [result] = await knex.raw(q, [
        device.id,
        deviceUserId,
        employeeId,
        punchTime,
        log.state ?? 0,
        raw,
      ])
      if (Number(result?.affectedRows ?? 0) > 0) saved += 1
    }

    return {
      success: true,
      count: period ? inPeriod : logs.length,
      fetchedFromDevice: logs.length,
      savedToDatabase: saved,
      inPeriod: period ? inPeriod : logs.length,
      period: period ? { fromDate: period.fromDate, toDate: period.toDate } : null,
      device: device.name,
      ip: device.ip,
      syncing: false,
    }
  } catch (err) {
    return {
      success: false,
      error: formatDeviceError(err.message),
      device: device.name,
      ip: device.ip,
      syncing: false,
    }
  } finally {
    try {
      await promisifyDisconnect(zk)
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {import('electron-store')} store
 */
function start(store) {
  const storeRef = store || new Store()

  const runSync = () =>
    withDeviceSyncLock(async () => {
      const devices = storeRef.get('zkteco_devices', DEFAULT_DEVICES)
      const active = devices.filter((d) => d.enabled)
      const results = []
      for (let i = 0; i < active.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        results.push(await pullFromDevice(active[i], storeRef, {}, i))
      }
      lastPollResults = results

      try {
        const { getMergedDbConfig, isDbConfigComplete, getOrCreateKnex } = require('../db/connection.cjs')
        if (isDbConfigComplete(getMergedDbConfig(storeRef))) {
          const knex = getOrCreateKnex(storeRef)
          const attendanceService = require('../services/attendanceService.cjs')
          await attendanceService.linkAttendanceEmployeeIds(knex)
        }
      } catch (err) {
        console.warn('[Hooman] post-sync employee link failed:', err.message)
      }
    })

  cron.schedule('*/5 * * * *', () => {
    runSync().catch((err) => console.warn('[Hooman] scheduled ZKTeco sync failed:', err.message))
  })

  setTimeout(() => {
    runSync().catch((err) => console.warn('[Hooman] initial ZKTeco sync failed:', err.message))
  }, 4000)

  console.log('[Hooman] ZKTeco poller scheduled (every 5 minutes)')
}

module.exports = { start, pullFromDevice, getLastPollResults, withDeviceSyncLock }
