const TYPE_LETTER = {
  Labor: 'L',
  Contract: 'C',
  Permanent: 'P',
}

function employeeTypeToLetter(employeeType) {
  return TYPE_LETTER[employeeType] || 'P'
}

function formatEmployeeCode(letter, sequence) {
  const n = Math.max(1, Number(sequence) || 1)
  return `${letter}-${String(n).padStart(5, '0')}`
}

function maxSequencesFromEmployeeCodes(rows) {
  const max = { L: 0, C: 0, P: 0 }
  const re = /^([LCP])-(\d+)$/i
  for (const row of rows || []) {
    const id = String(row?.employee_code ?? '').trim()
    const m = re.exec(id)
    if (!m) continue
    const letter = m[1].toUpperCase()
    const num = parseInt(m[2], 10)
    if (!Number.isFinite(num)) continue
    if (max[letter] !== undefined) {
      max[letter] = Math.max(max[letter], num)
    }
  }
  return max
}

/**
 * @param {import('knex').Knex} knex
 */
async function getNextEmployeeCode(knex, employeeType) {
  const letter = employeeTypeToLetter(employeeType)
  const rows = await knex('employees')
    .select('employee_code')
    .where('employee_code', 'like', `${letter}-%`)
  const max = maxSequencesFromEmployeeCodes(rows)
  return formatEmployeeCode(letter, (max[letter] || 0) + 1)
}

module.exports = {
  employeeTypeToLetter,
  formatEmployeeCode,
  maxSequencesFromEmployeeCodes,
  getNextEmployeeCode,
}
