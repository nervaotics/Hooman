export function formatCNIC(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 12)
  if (digits.length <= 5) return digits
  if (digits.length <= 11) return `${digits.slice(0, 5)}-${digits.slice(5)}`
  return `${digits.slice(0, 5)}-${digits.slice(5, 11)}-${digits.slice(11, 12)}`
}

export function isValidCNIC(value) {
  return /^\d{5}-\d{6}-\d{1}$/.test(String(value || '').trim())
}

export function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4, 11)}`
}

export function isValidPhone(value) {
  return /^\d{4}-\d{7}$/.test(String(value || '').trim())
}

export function calculateLaborReleaseDate(joiningDate) {
  if (!joiningDate) return ''
  const date = new Date(joiningDate)
  date.setMonth(date.getMonth() + 3)
  return date.toISOString().split('T')[0]
}

export function calculateContractReleaseDate(joiningDate) {
  if (!joiningDate) return ''
  const date = new Date(joiningDate)
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().split('T')[0]
}

export function parseMoney(v) {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}
