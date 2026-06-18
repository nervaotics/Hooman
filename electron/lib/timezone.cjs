const ORG_TZ = process.env.ORG_TZ || 'Asia/Karachi'

function localDateKey(date = new Date(), timeZone = ORG_TZ) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(date))
}

function formatTimeLocal(date, timeZone = ORG_TZ) {
  if (!date) return null
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(date))
}

function dayBoundsUtc(dateStr, timeZone = ORG_TZ) {
  const startLocal = `${dateStr}T00:00:00`
  const endLocal = `${dateStr}T23:59:59.999`
  const start = zonedLocalToUtc(startLocal, timeZone)
  const end = zonedLocalToUtc(endLocal, timeZone)
  return { start, end }
}

function periodBoundsUtc(fromDateStr, toDateStr, timeZone = ORG_TZ) {
  const { start } = dayBoundsUtc(fromDateStr, timeZone)
  const { end } = dayBoundsUtc(toDateStr, timeZone)
  return { start, end }
}

function parseDateKey(value) {
  const raw = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  return raw
}

function daysBetweenInclusive(fromDateStr, toDateStr) {
  const [y1, m1, d1] = fromDateStr.split('-').map(Number)
  const [y2, m2, d2] = toDateStr.split('-').map(Number)
  const a = Date.UTC(y1, m1 - 1, d1)
  const b = Date.UTC(y2, m2 - 1, d2)
  return Math.floor((b - a) / (24 * 60 * 60 * 1000)) + 1
}

function wallClockToUtc(y, monthIndex, day, hour, minute, second, timeZone = ORG_TZ) {
  const pad = (n) => String(n).padStart(2, '0')
  const localIso = `${y}-${pad(monthIndex + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`
  return zonedLocalToUtc(localIso, timeZone)
}

/** ZKTeco decoders use local Date(); re-interpret wall clock as org timezone. */
function normalizeDevicePunchTime(value, timeZone = ORG_TZ) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return wallClockToUtc(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    timeZone,
  )
}

function zonedLocalToUtc(localIso, timeZone) {
  const [datePart, timePart] = localIso.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh = 0, mm = 0, ss = 0, ms = 0] = timePart.split(/[:.]/).map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm, ss, ms)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(guess)).map((p) => [p.type, p.value]),
  )
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  const offset = asUtc - guess
  return new Date(guess - offset)
}

module.exports = {
  ORG_TZ,
  localDateKey,
  formatTimeLocal,
  dayBoundsUtc,
  periodBoundsUtc,
  parseDateKey,
  daysBetweenInclusive,
  normalizeDevicePunchTime,
  wallClockToUtc,
}
