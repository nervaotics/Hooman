const { getOrCreateKnex, getDataProvider } = require('../db/connection.cjs')
const { upsertAttendanceLog } = require('../db/dialect.cjs')
const { listPending, markSynced, pendingCount } = require('./outbox.cjs')
const { notifyAttendanceSynced } = require('../lib/attendanceSyncNotify.cjs')

let syncTimer = null
let syncing = false

async function flushOutboxToDatabase(store) {
  if (syncing) return { synced: 0, pending: pendingCount() }
  if (getDataProvider(store) !== 'supabase') {
    return { synced: 0, pending: pendingCount(), skipped: 'not-supabase' }
  }

  const pending = listPending(200)
  if (!pending.length) return { synced: 0, pending: 0 }

  syncing = true
  let synced = 0
  const syncedIds = []

  try {
    const knex = getOrCreateKnex(store)
    for (const row of pending) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const saved = await upsertAttendanceLog(knex, {
          device_id: row.device_id,
          employee_device_id: row.employee_device_id,
          employee_id: row.employee_id,
          punch_time: row.punch_time,
          punch_type: row.punch_type,
          raw_data: row.raw_data,
        })
        if (saved > 0) synced += 1
        syncedIds.push(row.id)
      } catch (err) {
        console.warn('[Hooman] outbox row sync failed:', err.message)
        break
      }
    }
    markSynced(syncedIds)
    if (synced > 0) {
      notifyAttendanceSynced({ source: 'outbox', saved: synced })
    }
    return { synced, pending: pendingCount() }
  } finally {
    syncing = false
  }
}

function startSyncWorker(store, intervalMs = 15_000) {
  stopSyncWorker()
  syncTimer = setInterval(() => {
    flushOutboxToDatabase(store).catch((err) => {
      console.warn('[Hooman] outbox sync failed:', err.message)
    })
  }, intervalMs)
  setTimeout(() => {
    flushOutboxToDatabase(store).catch(() => {})
  }, 3000)
}

function stopSyncWorker() {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}

module.exports = { flushOutboxToDatabase, startSyncWorker, stopSyncWorker }
