const { localDateKey, formatTimeLocal, dayBoundsUtc, ORG_TZ } = require('../lib/timezone.cjs')

function calculateHours(checkIn, checkOut) {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null
  return Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100
}

/**
 * @param {import('knex').Knex} knex
 */
async function buildPunchMap(knex) {
  const rows = await knex('employees')
    .select('id', 'punch_code', 'employee_code')
    .where('is_deleted', false)

  const map = new Map()
  for (const row of rows) {
    if (row.punch_code) map.set(String(row.punch_code).trim(), row.id)
    if (row.employee_code) map.set(String(row.employee_code).trim(), row.id)
  }
  return map
}

/**
 * Link attendance_logs.employee_id from punch_code / employee_device_id.
 * @param {import('knex').Knex} knex
 */
async function linkAttendanceEmployeeIds(knex) {
  const punchMap = await buildPunchMap(knex)
  const unlinked = await knex('attendance_logs')
    .select('id', 'employee_device_id')
    .whereNull('employee_id')
    .limit(5000)

  let updated = 0
  for (const log of unlinked) {
    const empId = punchMap.get(String(log.employee_device_id ?? '').trim())
    if (!empId) continue
    // eslint-disable-next-line no-await-in-loop
    await knex('attendance_logs').where({ id: log.id }).update({
      employee_id: empId,
      updated_at: new Date(),
    })
    updated += 1
  }
  return updated
}

/**
 * Daily attendance table: employee_ID, Name, Check_In, Check_Out, Total_Hrs.
 * @param {import('knex').Knex} knex
 * @param {string} dateStr YYYY-MM-DD (org timezone calendar day)
 * @param {{ search?: string }} filters
 */
async function fetchDailyTable(knex, dateStr, filters = {}) {
  await linkAttendanceEmployeeIds(knex)

  const { start, end } = dayBoundsUtc(dateStr)
  const logs = await knex('attendance_logs')
    .select('id', 'employee_id', 'employee_device_id', 'punch_time')
    .whereBetween('punch_time', [start, end])
    .orderBy('punch_time', 'asc')

  const employees = await knex('employees')
    .select('id', 'employee_code', 'name', 'first_name', 'last_name', 'punch_code')
    .where('is_deleted', false)

  const punchMap = await buildPunchMap(knex)
  const employeeById = new Map(employees.map((e) => [e.id, e]))

  const grouped = new Map()

  for (const log of logs) {
    let empId = log.employee_id
    if (!empId) {
      empId = punchMap.get(String(log.employee_device_id ?? '').trim()) ?? null
    }
    if (!empId) continue

    if (!grouped.has(empId)) grouped.set(empId, [])
    grouped.get(empId).push(log.punch_time)
  }

  const rows = []
  for (const [empId, punches] of grouped.entries()) {
    const emp = employeeById.get(empId)
    if (!emp) continue

    const name =
      emp.name ||
      [emp.first_name, emp.last_name].filter(Boolean).join(' ') ||
      '—'
    const checkIn = punches[0]
    const checkOut = punches.length > 1 ? punches[punches.length - 1] : null
    const totalHrs = checkOut ? calculateHours(checkIn, checkOut) : null

    rows.push({
      employee_id: emp.employee_code,
      employee_db_id: emp.id,
      punch_code: emp.punch_code,
      name,
      check_in: formatTimeLocal(checkIn),
      check_out: checkOut ? formatTimeLocal(checkOut) : '—',
      total_hrs: totalHrs != null ? totalHrs.toFixed(2) : '—',
      punch_count: punches.length,
    })
  }

  rows.sort((a, b) => String(a.employee_id).localeCompare(String(b.employee_id)))

  if (filters.search) {
    const q = String(filters.search).toLowerCase()
    return rows.filter(
      (r) =>
        String(r.employee_id).toLowerCase().includes(q) ||
        String(r.name).toLowerCase().includes(q) ||
        String(r.punch_code || '').toLowerCase().includes(q),
    )
  }

  return rows
}

function addCalendarDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/**
 * Roster summary for one calendar day (org timezone).
 * @param {import('knex').Knex} knex
 * @param {string} dateStr
 */
async function fetchRosterSummary(knex, dateStr) {
  const totalRow = await knex('employees')
    .where('is_deleted', false)
    .where('status', 'active')
    .count('* as cnt')
    .first()
  const total = Number(totalRow?.cnt ?? 0)

  const presentRows = await fetchDailyTable(knex, dateStr)
  const present = presentRows.length

  const dow = new Date(`${dateStr}T07:00:00Z`).getUTCDay()
  const sundayOff = dow === 0 ? total : 0
  const absent = dow === 0 ? 0 : Math.max(0, total - present)
  const workdayTotal = Math.max(0, total - sundayOff)
  const attendanceRate = workdayTotal > 0 ? Math.round((present / workdayTotal) * 100) : 0

  return {
    present,
    absent,
    onLeave: 0,
    halfDay: 0,
    sundayOff,
    total,
    attendanceRate,
  }
}

/**
 * @param {import('knex').Knex} knex
 * @param {string} endDateStr
 * @param {number} dayCount
 */
async function fetchPresentRateTrend(knex, endDateStr, dayCount = 7) {
  const points = []
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const dateStr = addCalendarDays(endDateStr, -i)
    // eslint-disable-next-line no-await-in-loop
    const summary = await fetchRosterSummary(knex, dateStr)
    points.push({ date: dateStr, rate: summary.attendanceRate })
  }
  return points
}

module.exports = {
  ORG_TZ,
  localDateKey,
  fetchDailyTable,
  fetchRosterSummary,
  fetchPresentRateTrend,
  linkAttendanceEmployeeIds,
  calculateHours,
}
