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
}
