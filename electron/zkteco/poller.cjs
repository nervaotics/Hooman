const cron = require('node-cron')
const Store = require('electron-store')
const { DEFAULT_DEVICES } = require('./devices.cjs')

let lastPollResults = []

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

/**
 * @param {import('electron-store')} store
 */
async function pullFromDevice(device, store) {
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
    inport: 40232,
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
    const punchMap = new Map()
    for (const row of empRows) {
      if (row.punch_code) punchMap.set(String(row.punch_code).trim(), row.id)
      if (row.employee_code) punchMap.set(String(row.employee_code).trim(), row.id)
    }

    for (const log of logs) {
      const punchTime =
        log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp)
      const raw = JSON.stringify(log)
      const deviceUserId = String(log.uid ?? log.id ?? '').trim()
      const employeeId = punchMap.get(deviceUserId) ?? null
      const q = `
        INSERT IGNORE INTO attendance_logs
        (device_id, employee_device_id, employee_id, punch_time, punch_type, raw_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
      `
      await knex.raw(q, [
        device.id,
        deviceUserId,
        employeeId,
        punchTime,
        log.state ?? 0,
        raw,
      ])
    }

    return {
      success: true,
      count: logs.length,
      device: device.name,
      ip: device.ip,
      syncing: false,
    }
  } catch (err) {
    return {
      success: false,
      error: err.message,
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

  const runSync = async () => {
    const devices = storeRef.get('zkteco_devices', DEFAULT_DEVICES)
    const active = devices.filter((d) => d.enabled)
    const results = await Promise.all(active.map((d) => pullFromDevice(d, storeRef)))
    lastPollResults = results
  }

  cron.schedule('*/5 * * * *', runSync)

  setTimeout(() => {
    runSync().catch((err) => console.warn('[Hooman] initial ZKTeco sync failed:', err.message))
  }, 4000)

  console.log('[Hooman] ZKTeco poller scheduled (every 5 minutes)')
}

module.exports = { start, pullFromDevice, getLastPollResults }
