const { localDateKey } = require('./timezone.cjs')

const DEFAULT_PAST_DAYS = 7
const MIN_PAST_DAYS = 1
const MAX_PAST_DAYS = 366

function clampPastDays(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return DEFAULT_PAST_DAYS
  return Math.min(MAX_PAST_DAYS, Math.max(MIN_PAST_DAYS, n))
}

function addCalendarDays(dateStr, days) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/**
 * @param {import('electron-store')} store
 */
function getAttendanceSyncSettings(store) {
  const saved = store.get('attendance_sync_settings', null) || {}
  return {
    pastDays: clampPastDays(saved.pastDays ?? DEFAULT_PAST_DAYS),
  }
}

/**
 * @param {import('electron-store')} store
 * @param {{ pastDays?: number }} patch
 */
function saveAttendanceSyncSettings(store, patch = {}) {
  const prev = getAttendanceSyncSettings(store)
  const next = {
    pastDays: patch.pastDays !== undefined ? clampPastDays(patch.pastDays) : prev.pastDays,
  }
  store.set('attendance_sync_settings', next)
  return next
}

/**
 * Date range for automatic device polling (inclusive, org timezone).
 * @param {import('electron-store')} store
 */
function resolvePollerSyncOptions(store) {
  const { pastDays } = getAttendanceSyncSettings(store)
  const toDate = localDateKey()
  const fromDate = addCalendarDays(toDate, -(pastDays - 1))
  return { fromDate, toDate, pastDays }
}

module.exports = {
  DEFAULT_PAST_DAYS,
  MIN_PAST_DAYS,
  MAX_PAST_DAYS,
  getAttendanceSyncSettings,
  saveAttendanceSyncSettings,
  resolvePollerSyncOptions,
}
