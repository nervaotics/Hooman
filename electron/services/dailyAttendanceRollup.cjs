const { classifyShiftForDay } = require('../lib/workShift.cjs')
const { dayBoundsUtc, localDateKey, ORG_TZ } = require('../lib/timezone.cjs')

/**
 * Build daily attendance rows from raw punches for payroll processing.
 * @param {import('knex').Knex} knex
 * @param {string} startStr YYYY-MM-DD
 * @param {string} endStr YYYY-MM-DD
 * @param {number[]} [employeeIds]
 */
async function fetchAttendanceForPeriod(knex, startStr, endStr, employeeIds = []) {
  const { start } = dayBoundsUtc(startStr, ORG_TZ)
  const { end } = dayBoundsUtc(endStr, ORG_TZ)

  let query = knex('attendance_logs')
    .select('employee_id', 'punch_time')
    .whereBetween('punch_time', [start, end])
    .whereNotNull('employee_id')
    .orderBy('punch_time', 'asc')

  if (employeeIds.length) {
    query = query.whereIn('employee_id', employeeIds)
  }

  const logs = await query
  const grouped = new Map()

  for (const log of logs) {
    const empId = log.employee_id
    const dateKey = localDateKey(log.punch_time, ORG_TZ)
    const key = `${empId}-${dateKey}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        employee_id: empId,
        attendance_date: dateKey,
        punches: [],
      })
    }
    grouped.get(key).punches.push(log.punch_time)
  }

  const rows = []
  for (const g of grouped.values()) {
    const checkIn = g.punches[0]
    const checkOut = g.punches.length > 1 ? g.punches[g.punches.length - 1] : null
    const { isLate } = classifyShiftForDay(g.attendance_date, checkIn, checkOut)
    rows.push({
      employee_id: g.employee_id,
      attendance_date: g.attendance_date,
      status: isLate ? 'Late' : 'Present',
      check_in_time: checkIn,
      check_out_time: checkOut,
    })
  }

  return rows
}

module.exports = { fetchAttendanceForPeriod }
