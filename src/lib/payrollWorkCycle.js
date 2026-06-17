const pad2 = (n) => String(n).padStart(2, '0')

export function getPayrollPeriod21stTo20th(periodMonth, periodYear) {
  const m = Number(periodMonth)
  const y = Number(periodYear)
  if (!m || m < 1 || m > 12 || !y) return { start_date: '', end_date: '' }

  const end = new Date(y, m - 1, 20, 12, 0, 0, 0)
  const start = new Date(y, m - 2, 21, 12, 0, 0, 0)

  const iso = (dt) =>
    `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`

  return { start_date: iso(start), end_date: iso(end) }
}

export function defaultPayrollPaymentDate(periodMonth, periodYear) {
  const y = Number(periodYear)
  const m = Number(periodMonth)
  if (!y || !m) return ''
  const dt = new Date(y, m, 5, 12, 0, 0, 0)
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

export function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return months[Number(month) - 1] || month
}

export function formatPkr(amount) {
  return `PKR ${Number(amount || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
}
