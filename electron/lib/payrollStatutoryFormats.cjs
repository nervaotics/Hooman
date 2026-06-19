const EOBI_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function normalizeDateKey(value) {
  if (value == null || value === '') return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    return value.toISOString().slice(0, 10)
  }
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return ''
}

function cnicDigitsOnly(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 13)
}

function formatCnicEobi(value) {
  const digits = cnicDigitsOnly(value)
  if (digits.length < 13) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5, 11)}-${digits.slice(11, 12)}`
}

/** EOBI / portal style: 8-Jan-98 */
function formatEobiDate(value) {
  const key = normalizeDateKey(value)
  if (!key) return ''
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return ''
  const month = EOBI_MONTHS[m - 1] || ''
  return `${d}-${month}-${String(y).slice(-2)}`
}

function formatGenderLabel(value) {
  const g = String(value || '').trim().toLowerCase()
  if (g === 'm' || g === 'male') return 'Male'
  if (g === 'f' || g === 'female') return 'Female'
  return value ? String(value) : ''
}

function formatMobile(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 11)
}

function sessiContributionWage(grossSalary, eobiEmployee, statutory) {
  const gross = Math.max(0, Number(grossSalary) || 0)
  const eobi = Math.max(0, Number(eobiEmployee) || 0)
  const netAfter = Math.max(0, gross - eobi)
  const minWage = Math.max(0, Number(statutory?.sessi_minimum_wage_pkr) || 0)
  const maxWage = Math.max(minWage, Number(statutory?.sessi_maximum_wage_pkr) || minWage)
  if (minWage > 0 || maxWage > 0) {
    return Math.min(Math.max(netAfter, minWage), maxWage)
  }
  return Math.round(netAfter)
}

module.exports = {
  normalizeDateKey,
  cnicDigitsOnly,
  formatCnicEobi,
  formatEobiDate,
  formatGenderLabel,
  formatMobile,
  sessiContributionWage,
}
