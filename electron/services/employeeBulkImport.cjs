const { insertReturningId } = require('../db/dialect.cjs')
const { formatCNIC, isValidCNIC, formatPhone, isValidPhone } = require('../lib/validators.cjs')
const { getNextEmployeeCode } = require('../lib/employeeCodes.cjs')
const { buildEmployeePayload, checkCnicDuplicate, persistSalary } = require('./employeeService.cjs')
const { toUserMessage } = require('../lib/userErrors.cjs')

function empty(v) {
  return v === undefined || v === null || String(v).trim() === ''
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(field)
      if (row.some((c) => String(c).trim() !== '')) rows.push(row)
      row = []
      field = ''
      if (ch === '\r') i += 1
    } else if (ch !== '\r') {
      field += ch
    }
  }

  row.push(field)
  if (row.some((c) => String(c).trim() !== '')) rows.push(row)
  return rows
}

function mapRow(headers, values) {
  const obj = {}
  headers.forEach((h, idx) => {
    if (h) obj[h] = String(values[idx] ?? '').trim()
  })
  return obj
}

const HEADER_ALIASES = {
  punch_code: 'punch_code',
  punchcode: 'punch_code',
  device_id: 'punch_code',
  employee_id: 'employee_id',
  employeeid: 'employee_id',
  code: 'employee_id',
  name: 'name',
  full_name: 'name',
  cnic: 'cnic',
  cnic_number: 'cnic',
  phone: 'phone',
  phone_number: 'phone',
  mobile: 'phone',
  area: 'area',
  site: 'area',
  area_site: 'area',
  department: 'department',
  dept: 'department',
  employee_type: 'employee_type',
  type: 'employee_type',
  salary: 'salary',
  gross_salary: 'salary',
  monthly_salary: 'salary',
  basic_salary: 'salary',
}

function normalizeRow(raw) {
  const out = {}
  for (const [key, val] of Object.entries(raw)) {
    const norm = normalizeHeader(key)
    const mapped = HEADER_ALIASES[norm] || norm
    if (mapped && val !== '') out[mapped] = val
  }
  return out
}

/**
 * @param {import('knex').Knex} knex
 */
async function findOrCreateDepartment(knex, name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return null
  const existing = await knex('departments').where({ name: trimmed }).first()
  if (existing) return existing.id
  const id = await insertReturningId(knex, 'departments', {
    name: trimmed,
    code: null,
  })
  return id
}

/**
 * @param {import('knex').Knex} knex
 */
async function findOrCreateArea(knex, name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return null
  const existing = await knex('areas').where({ name: trimmed, is_deleted: false }).first()
  if (existing) return existing.id
  const id = await insertReturningId(knex, 'areas', {
    name: trimmed,
    code: null,
    is_deleted: false,
  })
  return id
}

/**
 * @param {import('knex').Knex} knex
 */
async function checkPunchCodeDuplicate(knex, punchCode, excludeId = null) {
  let query = knex('employees').where({ punch_code: punchCode, is_deleted: false })
  if (excludeId) query = query.whereNot({ id: excludeId })
  return query.first()
}

function validateImportRow(row, lineNo) {
  const errors = []
  if (empty(row.punch_code)) errors.push(`Row ${lineNo}: punch_code is required`)
  if (empty(row.name)) errors.push(`Row ${lineNo}: name is required`)

  const cnic = formatCNIC(row.cnic)
  if (empty(cnic)) errors.push(`Row ${lineNo}: cnic is required`)
  else if (!isValidCNIC(cnic)) {
    errors.push(`Row ${lineNo}: invalid CNIC (use 12345-123456-1)`)
  }

  const phone = formatPhone(row.phone)
  if (empty(phone)) errors.push(`Row ${lineNo}: phone is required`)
  else if (!isValidPhone(phone)) {
    errors.push(`Row ${lineNo}: invalid phone (use 0300-1234567)`)
  }

  if (empty(row.area)) errors.push(`Row ${lineNo}: area/site is required`)
  if (empty(row.department)) errors.push(`Row ${lineNo}: department is required`)

  return { cnic, phone, errors }
}

function parseSalary(value) {
  if (empty(value)) return null
  const n = Number(String(value).replace(/,/g, '').trim())
  if (!Number.isFinite(n) || n <= 0) return Number.NaN
  return Math.round(n * 100) / 100
}

function validateSalary(row, lineNo) {
  if (empty(row.salary)) return { salary: null, errors: [] }
  const salary = parseSalary(row.salary)
  if (Number.isNaN(salary)) {
    return { salary: null, errors: [`Row ${lineNo}: salary must be a positive number`] }
  }
  return { salary, errors: [] }
}

const CSV_TEMPLATE = [
  'punch_code,name,cnic,phone,area,department,salary',
  '101,Ali Ahmed,61101-089160-3,0300-1234567,Block-22,Production,45000',
  '102,Sara Khan,12345-123456-1,0334-7359797,Block-22,HR,55000',
].join('\n')

/**
 * @param {import('knex').Knex} knex
 * @param {string} csvText
 */
async function bulkImportFromCsv(knex, csvText) {
  const parsed = parseCsv(String(csvText || '').replace(/^\uFEFF/, ''))
  if (parsed.length < 2) {
    return { ok: false, imported: 0, failed: 0, errors: ['CSV must include a header row and at least one data row'] }
  }

  const rawHeaders = parsed[0].map(normalizeHeader)
  const headers = rawHeaders.map((h) => HEADER_ALIASES[h] || h)

  const results = {
    ok: true,
    imported: 0,
    failed: 0,
    errors: [],
    rows: [],
  }

  for (let i = 1; i < parsed.length; i += 1) {
    const lineNo = i + 1
    const raw = mapRow(headers, parsed[i])
    const row = normalizeRow(raw)

    if (row.employee_id) {
      delete row.employee_id
    }

    const { cnic, phone, errors: validationErrors } = validateImportRow(row, lineNo)
    const { salary, errors: salaryErrors } = validateSalary(row, lineNo)
    const allValidationErrors = [...validationErrors, ...salaryErrors]
    if (allValidationErrors.length) {
      results.failed += 1
      results.errors.push(...allValidationErrors)
      continue
    }

    const punchCode = String(row.punch_code).trim()
    const employeeType = row.employee_type || 'Permanent'

    try {
      // eslint-disable-next-line no-await-in-loop
      const dupCnic = await checkCnicDuplicate(knex, cnic)
      if (dupCnic) {
        results.failed += 1
        results.errors.push(
          `Row ${lineNo}: CNIC already exists for ${dupCnic.employee_code || dupCnic.name}`,
        )
        continue
      }

      // eslint-disable-next-line no-await-in-loop
      const dupPunch = await checkPunchCodeDuplicate(knex, punchCode)
      if (dupPunch) {
        results.failed += 1
        results.errors.push(
          `Row ${lineNo}: punch_code already used by ${dupPunch.employee_code || dupPunch.name}`,
        )
        continue
      }

      // eslint-disable-next-line no-await-in-loop
      const departmentId = await findOrCreateDepartment(knex, row.department)
      // eslint-disable-next-line no-await-in-loop
      const areaId = await findOrCreateArea(knex, row.area)
      // eslint-disable-next-line no-await-in-loop
      const employeeCode = await getNextEmployeeCode(knex, employeeType)

      const form = {
        employee_type: employeeType,
        name: row.name,
        cnic_number: cnic,
        phone_number: phone,
        punch_code: punchCode,
        department_id: departmentId,
        area_id: areaId,
        joining_date: new Date().toISOString().slice(0, 10),
        status: 'active',
      }

      const employeeRow = {
        ...buildEmployeePayload(form),
        employee_code: employeeCode,
        punch_code: punchCode,
        created_at: new Date(),
      }

      // eslint-disable-next-line no-await-in-loop
      const id = await insertReturningId(knex, 'employees', employeeRow)

      if (areaId || departmentId) {
        // eslint-disable-next-line no-await-in-loop
        await knex('employee_postings').insert({
          employee_id: id,
          area_id: areaId,
          department_id: departmentId,
          joining_date: form.joining_date,
          is_current: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }

      if (salary != null) {
        // eslint-disable-next-line no-await-in-loop
        await persistSalary(knex, id, {
          effective_from: form.joining_date,
          basic_salary: salary,
          house_rent_allowance: 0,
          transport_allowance: 0,
          medical_allowance: 0,
          special_allowance: 0,
        })
      }

      results.imported += 1
      results.rows.push({
        line: lineNo,
        employee_id: employeeCode,
        punch_code: punchCode,
        name: row.name,
        salary: salary ?? null,
      })
    } catch (e) {
      results.failed += 1
      results.errors.push(`Row ${lineNo}: ${toUserMessage(e, 'This row could not be imported.')}`)
    }
  }

  if (results.failed > 0 && results.imported === 0) results.ok = false
  return results
}

module.exports = {
  CSV_TEMPLATE,
  bulkImportFromCsv,
  parseCsv,
  checkPunchCodeDuplicate,
}
