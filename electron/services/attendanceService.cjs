const {
  localDateKey,
  formatTimeLocal,
  dayBoundsUtc,
  ORG_TZ,
} = require('../lib/timezone.cjs')
const { punchKeyVariants, buildPunchMapFromRows, lookupEmployeeId } = require('../lib/punchMap.cjs')

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
  return buildPunchMapFromRows(rows)
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
    const empId = lookupEmployeeId(punchMap, log.employee_device_id)
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
      empId = lookupEmployeeId(punchMap, log.employee_device_id)
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

/**
 * Raw punch log for a date range (includes unlinked device IDs).
 * @param {import('knex').Knex} knex
 * @param {string} fromDate YYYY-MM-DD
 * @param {string} toDate YYYY-MM-DD
 * @param {{ search?: string }} [filters]
 */
async function fetchPunchLog(knex, fromDate, toDate, filters = {}) {
  await linkAttendanceEmployeeIds(knex)

  const { start } = dayBoundsUtc(fromDate)
  const { end } = dayBoundsUtc(toDate)

  const logs = await knex('attendance_logs as al')
    .leftJoin('employees as e', 'al.employee_id', 'e.id')
    .select(
      'al.id',
      'al.device_id',
      'al.employee_device_id',
      'al.employee_id',
      'al.punch_time',
      'e.employee_code',
      'e.name',
      'e.punch_code',
    )
    .whereBetween('al.punch_time', [start, end])
    .orderBy('al.punch_time', 'desc')

  const punchMap = await buildPunchMap(knex)
  let rows = logs.map((log) => {
    const deviceId = String(log.employee_device_id ?? '').trim()
    let linkedId = log.employee_id || lookupEmployeeId(punchMap, deviceId)

    return {
      id: log.id,
      punch_time: formatTimeLocal(log.punch_time),
      punch_date: localDateKey(log.punch_time),
      device_user_id: deviceId || '—',
      employee_id: log.employee_code || '—',
      employee_name: log.name || '—',
      linked: Boolean(linkedId),
    }
  })

  if (filters.search) {
    const q = String(filters.search).toLowerCase()
    rows = rows.filter(
      (r) =>
        String(r.device_user_id).toLowerCase().includes(q) ||
        String(r.employee_id).toLowerCase().includes(q) ||
        String(r.employee_name).toLowerCase().includes(q),
    )
  }

  const unlinked = rows.filter((r) => !r.linked).length
  return {
    fromDate,
    toDate,
    timezone: ORG_TZ,
    rows,
    total: rows.length,
    unlinked,
  }
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
  fetchPunchLog,
  fetchRosterSummary,
  fetchPresentRateTrend,
  linkAttendanceEmployeeIds,
  calculateHours,
  buildPunchMap,
  punchKeyVariants,
}
