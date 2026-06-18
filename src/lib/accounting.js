export const ACCOUNT_TYPE_LABELS = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expense',
}

export const VOUCHER_TYPE_LABELS = {
  RV: 'Receipt Voucher (RV)',
  PV: 'Payment Voucher (PV)',
  JV: 'Journal Voucher (JV)',
  PC: 'Petty Cash (PC)',
}

export function todayLocal() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date())
}

export function formatAmount(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '—'
  return x.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatAmountOrDash(n) {
  const x = Number(n)
  if (!Number.isFinite(x) || x === 0) return '—'
  return formatAmount(x)
}
