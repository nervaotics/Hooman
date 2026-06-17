const CNIC_RE = /^\d{5}-\d{6}-\d$/
const PHONE_RE = /^\d{4}-\d{7}$/

function formatCNIC(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 12)
  if (digits.length <= 5) return digits
  if (digits.length <= 11) return `${digits.slice(0, 5)}-${digits.slice(5)}`
  return `${digits.slice(0, 5)}-${digits.slice(5, 11)}-${digits.slice(11, 12)}`
}

function isValidCNIC(value) {
  return CNIC_RE.test(String(value || '').trim())
}

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4, 11)}`
}

function isValidPhone(value) {
  return PHONE_RE.test(String(value || '').trim())
}

module.exports = {
  CNIC_RE,
  PHONE_RE,
  formatCNIC,
  isValidCNIC,
  formatPhone,
  isValidPhone,
}
