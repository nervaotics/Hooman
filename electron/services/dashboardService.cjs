const { DEFAULT_DEVICES } = require('../zkteco/devices.cjs')
const { getLastPollResults } = require('../zkteco/poller.cjs')
const {
  localDateKey,
  fetchRosterSummary,
  fetchPresentRateTrend,
} = require('./attendanceService.cjs')

/**
 * @param {import('knex').Knex} knex
 * @param {import('electron-store')} store
 */
async function fetchDashboardStats(knex, store) {
  const today = localDateKey(new Date())

  const [
    employeeCountRow,
    pendingPayrollRow,
    attendanceSummary,
    attendanceTrend,
  ] = await Promise.all([
    knex('employees')
      .where('is_deleted', false)
      .where('status', 'active')
      .count('* as cnt')
      .first(),
    knex('payroll_runs')
      .whereIn('status', ['draft', 'processing'])
      .count('* as cnt')
      .first(),
    fetchRosterSummary(knex, today),
    fetchPresentRateTrend(knex, today, 7),
  ])

  const devices = store.get('zkteco_devices', DEFAULT_DEVICES)
  const lastPoll = getLastPollResults()
  const deviceStatus = devices.map((d) => {
    const hit = lastPoll.find((r) => r.device === d.name || r.ip === d.ip)
    let status = 'unknown'
    if (hit) status = hit.success ? 'online' : 'offline'
    return {
      id: d.id,
      name: d.name,
      enabled: d.enabled,
      status,
    }
  })

  const enabledDevices = deviceStatus.filter((d) => d.enabled)
  const onlineDevices = enabledDevices.filter((d) => d.status === 'online').length

  return {
    date: today,
    stats: {
      totalEmployees: Number(employeeCountRow?.cnt ?? 0),
      presentToday: attendanceSummary.present,
      pendingPayroll: Number(pendingPayrollRow?.cnt ?? 0),
      devicesOnline: onlineDevices,
      devicesTotal: enabledDevices.length,
    },
    attendanceSummary,
    attendanceTrend,
    devices: deviceStatus,
  }
}

module.exports = { fetchDashboardStats }
