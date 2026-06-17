function parseLocalDate(isoDateStr) {
  const part = String(isoDateStr ?? '').trim().split('T')[0]
  const [y, m, d] = part.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

function getPayrollPeriod21stTo20th(periodMonth, periodYear) {
  const m = Number(periodMonth)
  const y = Number(periodYear)
  if (!m || m < 1 || m > 12 || !y) return { start_date: '', end_date: '' }

  const end = new Date(y, m - 1, 20, 12, 0, 0, 0)
  const start = new Date(y, m - 2, 21, 12, 0, 0, 0)

  const pad = (n) => String(n).padStart(2, '0')
  const iso = (dt) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`

  return { start_date: iso(start), end_date: iso(end) }
}

const pad2 = (n) => String(n).padStart(2, '0')

function toLocalISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function defaultPayrollPaymentDate(periodMonth, periodYear) {
  const y = Number(periodYear)
  const m = Number(periodMonth)
  if (!y || !m) return ''
  return toLocalISODate(new Date(y, m, 5))
}

module.exports = {
  getPayrollPeriod21stTo20th,
  defaultPayrollPaymentDate,
}
