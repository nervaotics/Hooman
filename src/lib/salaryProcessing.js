import { classifyShiftForDay } from './workShift.js'

export const SALARY_STANDARD_DAYS = 26
export const SALARY_STANDARD_DAY_HOURS = 8
export const PUBLIC_HOLIDAY_DATES = new Set([])

const MS_HOUR = 3600000

function parseLocalDate(dateStr) {
  const part = String(dateStr ?? '').trim().split('T')[0]
  const [y, m, d] = part.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

function atLocalTime(dateStr, hour, minute) {
  const dt = parseLocalDate(dateStr)
  if (!dt) return null
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), hour, minute, 0, 0)
}

const WORKED_STATUSES = new Set(['Present', 'Late', 'Half Day'])

function isWorked(status) {
  return WORKED_STATUSES.has(String(status || ''))
}

function payDayUnits(status) {
  const s = String(status || '')
  if (s === 'Half Day') return 0.5
  if (s === 'Present' || s === 'Late') return 1
  return 0
}

function totalHoursBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  if (ms <= 0) return 0
  return Math.round((ms / MS_HOUR) * 100) / 100
}

function lateHoursFromCheckIn(attendanceDate, checkIn) {
  if (!checkIn) return 0
  const threshold = atLocalTime(attendanceDate, 8, 10)
  if (!threshold) return 0
  const tIn = new Date(checkIn)
  if (tIn <= threshold) return 0
  return Math.round(((tIn.getTime() - threshold.getTime()) / MS_HOUR) * 100) / 100
}

function isSundayDate(dateStr) {
  const d = parseLocalDate(dateStr)
  return d && d.getDay() === 0
}

function isSaturdayDate(dateStr) {
  const d = parseLocalDate(dateStr)
  return d && d.getDay() === 6
}

function isWeekdayMonFri(dateStr) {
  const d = parseLocalDate(dateStr)
  const w = d ? d.getDay() : -1
  return w >= 1 && w <= 5
}

function isHolidayCalendarDate(dateStr) {
  return isSundayDate(dateStr) || PUBLIC_HOLIDAY_DATES.has(String(dateStr).split('T')[0])
}

const roundMoney2 = (n) => Math.round((Number(n) || 0) * 100) / 100

export function computeSalaryProcessingMetrics(attendanceRows, monthlyGross, opts = {}) {
  const arrears = Number(opts.arrears) || 0
  const deduction = Number(opts.deduction) || 0

  const gross = Math.max(0, Number(monthlyGross) || 0)
  const ratePerDay = gross > 0 ? gross / SALARY_STANDARD_DAYS : 0
  const hourlyBase = gross > 0 ? gross / SALARY_STANDARD_DAYS / SALARY_STANDARD_DAY_HOURS : 0
  const ratePerOvertimeHour = hourlyBase * 2
  const holidayRatePerHour = hourlyBase * 3

  let payDays = 0
  let satDays = 0
  let satHrs = 0
  let normalOtHrs = 0
  let holidayDays = 0
  let holidayHrs = 0
  let lateHrs = 0

  for (const row of attendanceRows || []) {
    if (!isWorked(row.status)) continue
    const d = String(row.attendance_date ?? '').split('T')[0]
    const units = payDayUnits(row.status)
    const spanHrs = totalHoursBetween(row.check_in_time, row.check_out_time)
    const { overtimeHours } = classifyShiftForDay(d, row.check_in_time, row.check_out_time)

    if (isHolidayCalendarDate(d)) {
      holidayDays += units
      holidayHrs += spanHrs
      continue
    }

    if (isSaturdayDate(d)) {
      satDays += units
      satHrs += spanHrs
      continue
    }

    if (isWeekdayMonFri(d)) {
      payDays += units
      normalOtHrs += overtimeHours
      lateHrs += lateHoursFromCheckIn(d, row.check_in_time)
    }
  }

  const totalOvertimeHrs = roundMoney2(satHrs + normalOtHrs)
  const wagesAmount = roundMoney2(ratePerDay * payDays)
  const amountOvertime = roundMoney2(totalOvertimeHrs * ratePerOvertimeHour)
  const holidayAmount = roundMoney2(holidayHrs * holidayRatePerHour)
  const deductedAmount = roundMoney2(hourlyBase * lateHrs)

  const totalSalaryRaw =
    wagesAmount + amountOvertime + holidayAmount + arrears - deduction - deductedAmount
  const totalSalary = Math.round(totalSalaryRaw)

  return {
    monthlyGross: gross,
    ratePerDay: roundMoney2(ratePerDay),
    payDays: roundMoney2(payDays),
    wagesAmount,
    satDays: roundMoney2(satDays),
    satHrs: roundMoney2(satHrs),
    normalOtHrs: roundMoney2(normalOtHrs),
    totalOvertimeHrs,
    ratePerOvertimeHour: roundMoney2(ratePerOvertimeHour),
    amountOvertime,
    holidayDays: roundMoney2(holidayDays),
    holidayHrs: roundMoney2(holidayHrs),
    holidayRatePerHour: roundMoney2(holidayRatePerHour),
    holidayAmount,
    totalDays: roundMoney2(payDays + satDays + holidayDays),
    deduction,
    lateHrs: roundMoney2(lateHrs),
    arrears: roundMoney2(arrears),
    deductedAmount,
    hourlyBase: roundMoney2(hourlyBase),
    totalSalary,
  }
}

export function formatGenderShort(gender) {
  const g = String(gender || '').trim().toLowerCase()
  if (g.startsWith('m')) return 'M'
  if (g.startsWith('f')) return 'F'
  return '—'
}
