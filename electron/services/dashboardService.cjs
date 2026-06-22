const { DEFAULT_DEVICES } = require('../zkteco/devices.cjs')
const { getLastPollResults } = require('../zkteco/poller.cjs')
const {
  localDateKey,
  fetchRosterSummary,
  fetchPresentRateTrend,
} = require('./attendanceService.cjs')

/**
 * @param {import('knex').Knex} knex
 */
async function fetchEmployeesByDepartment(knex) {
  const rows = await knex('employees as e')
    .leftJoin('departments as d', 'e.department_id', 'd.id')
    .where('e.is_deleted', false)
    .where('e.status', 'active')
    .select(knex.raw("COALESCE(d.name, 'Unassigned') as name"))
    .count('* as count')
    .groupByRaw("COALESCE(d.name, 'Unassigned')")
    .orderBy('count', 'desc')
    .limit(8)

  return rows.map((r) => ({
    name: String(r.name || 'Unassigned'),
    count: Number(r.count ?? 0),
  }))
}

/**
 * @param {import('knex').Knex} knex
 */
async function fetchEmploymentTypeBreakdown(knex) {
  const rows = await knex('employees')
    .where('is_deleted', false)
    .where('status', 'active')
    .select('employment_type')
    .count('* as count')
    .groupBy('employment_type')
    .orderBy('count', 'desc')

  return rows.map((r) => ({
    type: String(r.employment_type || 'other').replace(/-/g, ' '),
    count: Number(r.count ?? 0),
  }))
}

/**
 * @param {import('knex').Knex} knex
 */
async function fetchPayrollStatusBreakdown(knex) {
  const rows = await knex('payroll_runs')
    .select('status')
    .count('* as count')
    .groupBy('status')
    .orderBy('count', 'desc')

  return rows.map((r) => ({
    status: String(r.status || 'unknown'),
    count: Number(r.count ?? 0),
  }))
}

/**
 * Last N weeks × weekdays attendance rate grid (for heatmap).
 * @param {import('knex').Knex} knex
 * @param {string} endDateStr
 * @param {number} weeks
 */
async function fetchAttendanceHeatmap(knex, endDateStr, weeks = 4) {
  const cells = []
  const totalDays = weeks * 7

  for (let idx = 0; idx < totalDays; idx += 1) {
    const daysAgo = totalDays - 1 - idx
    const dateStr = addCalendarDays(endDateStr, -daysAgo)
    // eslint-disable-next-line no-await-in-loop
    const summary = await fetchRosterSummary(knex, dateStr)
    cells.push({
      week: Math.floor(idx / 7) + 1,
      day: idx % 7,
      date: dateStr,
      rate: summary.attendanceRate,
      present: summary.present,
      total: summary.total,
    })
  }

  return { weeks, cells }
}

function addCalendarDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/**
 * @param {import('knex').Knex} knex
 * @param {string} endDateStr
 * @param {number} dayCount
 */
async function fetchAttendanceTrendDetailed(knex, endDateStr, dayCount = 7) {
  const points = []
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const dateStr = addCalendarDays(endDateStr, -i)
    // eslint-disable-next-line no-await-in-loop
    const summary = await fetchRosterSummary(knex, dateStr)
    const label = new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-PK', {
      timeZone: 'Asia/Karachi',
      weekday: 'short',
    })
    points.push({
      date: dateStr,
      label,
      rate: summary.attendanceRate,
      present: summary.present,
      absent: summary.absent,
    })
  }
  return points
}

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
    attendanceTrendDetailed,
    employeesByDepartment,
    employmentTypes,
    payrollStatus,
    attendanceHeatmap,
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
    fetchAttendanceTrendDetailed(knex, today, 7),
    fetchEmployeesByDepartment(knex),
    fetchEmploymentTypeBreakdown(knex),
    fetchPayrollStatusBreakdown(knex),
    fetchAttendanceHeatmap(knex, today, 4),
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
    attendanceTrendDetailed,
    employeesByDepartment,
    employmentTypes,
    payrollStatus,
    attendanceHeatmap,
    devices: deviceStatus,
  }
}

module.exports = { fetchDashboardStats }
