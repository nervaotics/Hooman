const fs = require('fs')
const path = require('path')
const { insertReturningId } = require('../db/dialect.cjs')
const { getNextEmployeeCode } = require('../lib/employeeCodes.cjs')
const { normalizePhotoUrl, photoUrlFromFileName, getPhotoDir } = require('../photoProtocol.cjs')

function empty(v) {
  return v === undefined || v === null || String(v).trim() === ''
}

function parseMoney(v) {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function mapEmployeeRow(row) {
  if (!row) return null
  return {
    ...row,
    employee_id: row.employee_code,
    cnic_number: row.cnic_number ?? row.cnic,
    phone_number: row.phone_number ?? row.phone,
    punch_code: row.punch_code ?? null,
    photo_url: normalizePhotoUrl(row.photo_url),
  }
}

function buildEmployeePayload(form) {
  const name = String(form.name || '').trim()
  const parts = name.split(/\s+/)
  const firstName = parts[0] || name
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : ''

  return {
    employee_type: form.employee_type || null,
    name,
    first_name: firstName,
    last_name: lastName || firstName,
    father_husband_name: empty(form.father_husband_name) ? null : form.father_husband_name,
    gender: empty(form.gender) ? null : form.gender,
    marital_status: empty(form.marital_status) ? null : form.marital_status,
    religion: empty(form.religion) ? null : form.religion,
    blood_group: empty(form.blood_group) ? null : form.blood_group,
    date_of_birth: empty(form.date_of_birth) ? null : form.date_of_birth,
    cnic: form.cnic_number || null,
    cnic_number: form.cnic_number || null,
    cnic_issue_date: empty(form.cnic_issue_date) ? null : form.cnic_issue_date,
    cnic_expiry_date: empty(form.cnic_expiry_date) ? null : form.cnic_expiry_date,
    eobi_number: empty(form.eobi_number) ? null : String(form.eobi_number).trim(),
    phone: form.phone_number || null,
    phone_number: form.phone_number || null,
    emergency_contact: empty(form.emergency_contact) ? null : form.emergency_contact,
    emergency_contact_phone: empty(form.emergency_contact) ? null : form.emergency_contact,
    address_street: empty(form.address_street) ? null : form.address_street,
    address_city: empty(form.address_city) ? null : form.address_city,
    address: [form.address_street, form.address_city].filter(Boolean).join(', ') || null,
    photo_url: empty(form.photo_url) ? null : form.photo_url,
    employment_type: form.employee_type || 'full-time',
    status: form.status || 'active',
    date_of_joining: empty(form.joining_date) ? null : form.joining_date,
    release_date: empty(form.release_date) ? null : form.release_date,
    department_id: empty(form.department_id) ? null : Number(form.department_id),
    basic_salary: parseMoney(form.basic_salary) || null,
    punch_code: empty(form.punch_code) ? null : String(form.punch_code).trim(),
    updated_at: new Date(),
  }
}

/**
 * @param {import('knex').Knex} knex
 */
async function fetchDirectory(knex, filters = {}) {
  const rows = await knex('employees as e')
    .select('e.*')
    .where('e.is_deleted', false)
    .orderBy('e.id', 'desc')
    .limit(1000)

  const ids = rows.map((r) => r.id)
  let postings = []
  if (ids.length) {
    postings = await knex('employee_postings as p')
      .leftJoin('departments as d', 'p.department_id', 'd.id')
      .leftJoin('areas as a', 'p.area_id', 'a.id')
      .select(
        'p.*',
        'd.name as department_name',
        'a.name as area_name',
      )
      .whereIn('p.employee_id', ids)
      .where('p.is_current', true)
  }

  const postingByEmp = new Map(postings.map((p) => [p.employee_id, p]))

  let mapped = rows.map((row) => {
    const p = postingByEmp.get(row.id)
    const m = mapEmployeeRow(row)
    return {
      ...m,
      current_department: p?.department_name ?? null,
      current_area: p?.area_name ?? null,
      joining_date: p?.joining_date ?? row.date_of_joining ?? null,
      department_id: p?.department_id ?? row.department_id ?? null,
      area_id: p?.area_id ?? null,
    }
  })

  if (filters.search) {
    const q = String(filters.search).toLowerCase()
    mapped = mapped.filter((e) => {
      const code = String(e.employee_code || '').toLowerCase()
      const name = String(e.name || '').toLowerCase()
      return code.includes(q) || name.includes(q)
    })
  }
  if (filters.employee_type) {
    mapped = mapped.filter((e) => e.employee_type === filters.employee_type)
  }
  if (filters.department) {
    mapped = mapped.filter((e) => e.current_department === filters.department)
  }
  if (filters.area) {
    mapped = mapped.filter((e) => e.current_area === filters.area)
  }
  if (filters.status) {
    mapped = mapped.filter((e) => e.status === filters.status)
  }

  return mapped
}

/**
 * @param {import('knex').Knex} knex
 */
async function getEmployeeDetail(knex, id) {
  const row = await knex('employees').where({ id, is_deleted: false }).first()
  if (!row) return null

  const history = await knex('employment_history')
    .where({ employee_id: id })
    .orderBy('period_from', 'desc')

  const posting = await knex('employee_postings as p')
    .leftJoin('departments as d', 'p.department_id', 'd.id')
    .leftJoin('areas as a', 'p.area_id', 'a.id')
    .select('p.*', 'd.name as department_name', 'a.name as area_name')
    .where({ 'p.employee_id': id, 'p.is_current': true })
    .first()

  let salary = await knex('salary_structure')
    .where({ employee_id: id, is_current: true })
    .first()
  if (!salary) {
    salary = await knex('salary_structure')
      .where({ employee_id: id })
      .orderBy('effective_from', 'desc')
      .first()
  }

  return {
    employee: mapEmployeeRow(row),
    employment_history: history,
    posting,
    salary_structure: salary,
  }
}

/**
 * @param {import('knex').Knex} knex
 */
async function checkCnicDuplicate(knex, cnicNumber, excludeId = null) {
  let query = knex('employees').where(function whereCnic() {
    this.where({ cnic_number: cnicNumber }).orWhere({ cnic: cnicNumber })
  })
  if (excludeId) query = query.whereNot({ id: excludeId })
  return query.first()
}

async function checkPunchCodeDuplicate(knex, punchCode, excludeId = null) {
  if (!punchCode) return null
  let query = knex('employees')
    .where({ punch_code: String(punchCode).trim(), is_deleted: false })
  if (excludeId) query = query.whereNot({ id: excludeId })
  return query.first()
}

async function persistHistory(knex, employeeId, historyRows, isEdit) {
  if (isEdit) {
    await knex('employment_history').where({ employee_id: employeeId }).del()
  }
  const valid = (historyRows || []).filter((h) => h.company && h.period_from)
  if (!valid.length) return
  await knex('employment_history').insert(
    valid.map((h) => ({
      employee_id: employeeId,
      company: h.company,
      period_from: h.period_from,
      period_to: empty(h.period_to) ? null : h.period_to,
      is_current: Boolean(h.is_current),
      created_at: new Date(),
      updated_at: new Date(),
    })),
  )
}

async function persistPosting(knex, employeeId, form, isEdit) {
  if (!form.joining_date) return
  if (empty(form.area_id) && empty(form.department_id)) return

  if (isEdit) {
    await knex('employee_postings')
      .where({ employee_id: employeeId, is_current: true })
      .update({ is_current: false, updated_at: new Date() })
  }

  await knex('employee_postings').insert({
    employee_id: employeeId,
    area_id: empty(form.area_id) ? null : Number(form.area_id),
    department_id: empty(form.department_id) ? null : Number(form.department_id),
    joining_date: form.joining_date,
    release_date: empty(form.release_date) ? null : form.release_date,
    is_current: true,
    created_at: new Date(),
    updated_at: new Date(),
  })
}

async function persistSalary(knex, employeeId, salaryForm) {
  if (!salaryForm) return
  const basic = parseMoney(salaryForm.basic_salary)
  if (basic <= 0) return

  const row = {
    effective_from: salaryForm.effective_from || new Date().toISOString().slice(0, 10),
    effective_to: empty(salaryForm.effective_to) ? null : salaryForm.effective_to,
    basic_salary: basic,
    house_rent_allowance: parseMoney(salaryForm.house_rent_allowance),
    transport_allowance: parseMoney(salaryForm.transport_allowance),
    medical_allowance: parseMoney(salaryForm.medical_allowance),
    special_allowance: parseMoney(salaryForm.special_allowance),
    gross_salary:
      basic +
      parseMoney(salaryForm.house_rent_allowance) +
      parseMoney(salaryForm.transport_allowance) +
      parseMoney(salaryForm.medical_allowance) +
      parseMoney(salaryForm.special_allowance),
    is_current: true,
    updated_at: new Date(),
  }

  if (salaryForm.id) {
    await knex('salary_structure').where({ id: salaryForm.id }).update(row)
    return
  }

  await knex('salary_structure')
    .where({ employee_id: employeeId })
    .update({ is_current: false, updated_at: new Date() })

  await knex('salary_structure').insert({
    employee_id: employeeId,
    ...row,
    created_at: new Date(),
  })
}

/**
 * @param {import('knex').Knex} knex
 */
async function createEmployeeFull(knex, payload) {
  const { form, salaryForm, employment_history } = payload
  const dup = await checkCnicDuplicate(knex, form.cnic_number)
  if (dup) {
    const err = new Error(
      `CNIC already exists for ${dup.employee_code || dup.id} (${dup.name || dup.first_name})`,
    )
    err.code = 'DUPLICATE_CNIC'
    throw err
  }

  if (form.punch_code) {
    const dupPunch = await checkPunchCodeDuplicate(knex, form.punch_code)
    if (dupPunch) {
      const err = new Error(
        `Punch code already used by ${dupPunch.employee_code || dupPunch.name}`,
      )
      err.code = 'DUPLICATE_PUNCH_CODE'
      throw err
    }
  }

  const employeeCode = await getNextEmployeeCode(knex, form.employee_type)
  const employeeRow = {
    ...buildEmployeePayload(form),
    employee_code: employeeCode,
    created_at: new Date(),
  }

  const id = await insertReturningId(knex, 'employees', employeeRow)
  await persistHistory(knex, id, employment_history, false)
  await persistPosting(knex, id, form, false)
  await persistSalary(knex, id, salaryForm)
  return { id, employee_code: employeeCode }
}

/**
 * @param {import('knex').Knex} knex
 */
async function updateEmployeeFull(knex, id, payload) {
  const { form, salaryForm, employment_history } = payload
  if (form.punch_code) {
    const dupPunch = await checkPunchCodeDuplicate(knex, form.punch_code, id)
    if (dupPunch) {
      const err = new Error(
        `Punch code already used by ${dupPunch.employee_code || dupPunch.name}`,
      )
      err.code = 'DUPLICATE_PUNCH_CODE'
      throw err
    }
  }
  const employeeRow = buildEmployeePayload(form)
  await knex('employees').where({ id }).update(employeeRow)
  await persistHistory(knex, id, employment_history, true)
  await persistPosting(knex, id, form, true)
  await persistSalary(knex, id, salaryForm)
  return { id }
}

/**
 * @param {import('knex').Knex} knex
 */
async function softDeleteEmployee(knex, id) {
  await knex('employees').where({ id }).update({
    is_deleted: true,
    status: 'terminated',
    updated_at: new Date(),
  })
}

function ensurePhotoDir() {
  const dir = getPhotoDir()
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function saveEmployeePhoto(base64Data, originalName = 'photo.jpg') {
  const dir = ensurePhotoDir()
  const ext = path.extname(originalName) || '.jpg'
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`
  const filePath = path.join(dir, fileName)
  const base64 = String(base64Data).replace(/^data:image\/\w+;base64,/, '')
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
  return photoUrlFromFileName(fileName)
}

module.exports = {
  fetchDirectory,
  getEmployeeDetail,
  checkCnicDuplicate,
  checkPunchCodeDuplicate,
  createEmployeeFull,
  updateEmployeeFull,
  softDeleteEmployee,
  saveEmployeePhoto,
  mapEmployeeRow,
  buildEmployeePayload,
  persistSalary,
}
