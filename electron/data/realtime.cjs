const { getDataProvider } = require('../db/connection.cjs')
const { getSupabaseRestClient } = require('./supabaseClient.cjs')
const { notifyAttendanceSynced } = require('../lib/attendanceSyncNotify.cjs')

/** @type {(() => void) | null} */
let unsubscribe = null

/**
 * Subscribe to attendance_logs inserts via Supabase Realtime.
 * @param {import('electron-store')} store
 */
function startAttendanceRealtime(store) {
  stopAttendanceRealtime()
  if (getDataProvider(store) !== 'supabase') return

  const client = getSupabaseRestClient(store)
  if (!client) return

  const channel = client
    .channel('hooman-attendance')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'attendance_logs' },
      () => {
        notifyAttendanceSynced({ source: 'realtime' })
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Hooman] Supabase Realtime subscribed (attendance_logs)')
      }
    })

  unsubscribe = () => {
    client.removeChannel(channel)
  }
}

function stopAttendanceRealtime() {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}

module.exports = { startAttendanceRealtime, stopAttendanceRealtime }
