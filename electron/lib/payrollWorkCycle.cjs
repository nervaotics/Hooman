function pad2(n) {
  return String(n).padStart(2, '0')
}

function getPayrollPeriod21stTo20th(periodMonth, periodYear) {
  const m = Number(periodMonth)
  const y = Number(periodYear)
  if (!m || m < 1 || m > 12 || !y) return { start_date: '', end_date: '' }

  const end = new Date(y, m - 1, 20, 12, 0, 0, 0)
  const start = new Date(y, m - 2, 21, 12, 0, 0, 0)
  const iso = (dt) =>
    `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`

  return { start_date: iso(start), end_date: iso(end) }
}

function defaultPayrollPaymentDate(periodMonth, periodYear) {
  const y = Number(periodYear)
  const m = Number(periodMonth)
  if (!y || !m) return ''
  const dt = new Date(y, m, 5, 12, 0, 0, 0)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

module.exports = {
  getPayrollPeriod21stTo20th,
  defaultPayrollPaymentDate,
}
