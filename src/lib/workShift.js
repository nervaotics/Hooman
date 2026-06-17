const SHIFT_START_H = 8
const SHIFT_START_LATE_M = 10
const SHIFT_END_H = 18

function localDateParts(isoDateStr) {
  const part = String(isoDateStr ?? '').trim().split('T')[0]
  const [y, m, d] = part.split('-').map(Number)
  return { y, m, d }
}

function atLocalTime(isoDateStr, hour, minute) {
  const { y, m, d } = localDateParts(isoDateStr)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, hour, minute, 0, 0)
}

export function classifyShiftForDay(attendanceDate, checkIn, checkOut) {
  const lateThreshold = atLocalTime(attendanceDate, SHIFT_START_H, SHIFT_START_LATE_M)
  const shiftEnd = atLocalTime(attendanceDate, SHIFT_END_H, 0)

  let isLate = false
  let overtimeHours = 0
  let regularHours = null

  if (!checkIn || !lateThreshold) {
    return { isLate, overtimeHours, regularHours }
  }

  const inDt = new Date(checkIn)
  if (inDt > lateThreshold) isLate = true

  if (checkOut && shiftEnd) {
    const outDt = new Date(checkOut)
    const msOt = Math.max(0, outDt.getTime() - shiftEnd.getTime())
    overtimeHours = Math.round((msOt / (1000 * 60 * 60)) * 100) / 100

    const msReg = Math.max(0, Math.min(outDt.getTime(), shiftEnd.getTime()) - inDt.getTime())
    regularHours = Math.round((msReg / (1000 * 60 * 60)) * 100) / 100
  }

  return { isLate, overtimeHours, regularHours }
}
