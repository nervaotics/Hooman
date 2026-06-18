const { buildPayrollUpsertPayload } = require('../lib/payrollPayloadBuilder.cjs')
const { fetchAttendanceForPeriod } = require('./dailyAttendanceRollup.cjs')
const { getPayrollPeriod21stTo20th } = require('../lib/payrollWorkCycle.cjs')

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

function dateOnly(value) {
  return normalizeDateKey(value)
}

function resolvePeriodDates(period) {
  let start = normalizeDateKey(period.start_date)
  let end = normalizeDateKey(period.end_date)
  if ((!start || !end) && period.period_month && period.period_year) {
    const derived = getPayrollPeriod21stTo20th(period.period_month, period.period_year)
    start = start || derived.start_date
    end = end || derived.end_date
  }
  return { start, end }
}

async function getStatutorySettings(knex) {
  let row = await knex('payroll_statutory_settings').where({ id: 1 }).first()
  if (!row) {
    await knex('payroll_statutory_settings').insert({
      id: 1,
      eobi_wage_ceiling_pkr: 37000,
      sessi_minimum_wage_pkr: 40000,
      sessi_maximum_wage_pkr: 45000,
      created_at: new Date(),
      updated_at: new Date(),
    })
    row = await knex('payroll_statutory_settings').where({ id: 1 }).first()
  }
  return row
}

async function saveStatutorySettings(knex, data) {
  const payload = {
    eobi_wage_ceiling_pkr: Number(data.eobi_wage_ceiling_pkr ?? 37000),
    sessi_minimum_wage_pkr: Number(data.sessi_minimum_wage_pkr ?? 40000),
    sessi_maximum_wage_pkr: Number(data.sessi_maximum_wage_pkr ?? 45000),
    updated_at: new Date(),
  }
  await knex('payroll_statutory_settings').where({ id: 1 }).update(payload)
  return getStatutorySettings(knex)
}

async function listPeriods(knex) {
  const periods = await knex('payroll_periods')
    .select('*')
    .orderBy('period_year', 'desc')
    .orderBy('period_month', 'desc')

  const records = await knex('payroll_records').select(
    'id',
    'payroll_period_id',
    'employee_id',
    'net_salary',
    'status',
  )

  const byPeriod = new Map()
  for (const r of records) {
    if (!byPeriod.has(r.payroll_period_id)) byPeriod.set(r.payroll_period_id, [])
    byPeriod.get(r.payroll_period_id).push(r)
  }

  return periods.map((p) => {
    const { start, end } = resolvePeriodDates(p)
    return {
      ...p,
      start_date: start,
      end_date: end,
      payroll_date: dateOnly(p.payroll_date),
      payroll_records: byPeriod.get(p.id) || [],
    }
  })
}

async function getPeriod(knex, id) {
  const period = await knex('payroll_periods').where({ id }).first()
  if (!period) return null
  const { start, end } = resolvePeriodDates(period)
  return {
    ...period,
    start_date: start,
    end_date: end,
    payroll_date: dateOnly(period.payroll_date),
  }
}

async function listRecords(knex, periodId) {
  const rows = await knex('payroll_records as pr')
    .leftJoin('employees as e', 'pr.employee_id', 'e.id')
    .leftJoin('salary_structure as ss', 'pr.salary_structure_id', 'ss.id')
    .select(
      'pr.*',
      'e.name as employee_name',
      'e.employee_code',
      'e.gender',
      'e.cnic_number',
      'ss.basic_salary as struct_basic',
      'ss.house_rent_allowance',
      'ss.transport_allowance',
      'ss.medical_allowance',
      'ss.special_allowance',
      'ss.gross_salary as struct_gross',
    )
    .where('pr.payroll_period_id', periodId)
    .orderBy('e.name', 'asc')

  return rows.map((r) => ({
    ...r,
    employees: {
      id: r.employee_id,
      name: r.employee_name,
      employee_id: r.employee_code,
      gender: r.gender,
      cnic_number: r.cnic_number,
    },
    salary_structure: r.salary_structure_id
      ? {
          id: r.salary_structure_id,
          basic_salary: r.struct_basic,
          house_rent_allowance: r.house_rent_allowance,
          transport_allowance: r.transport_allowance,
          medical_allowance: r.medical_allowance,
          special_allowance: r.special_allowance,
          gross_salary: r.struct_gross,
        }
      : null,
  }))
}

async function createPeriod(knex, data, userId) {
  const start_date = normalizeDateKey(data.start_date)
  const end_date = normalizeDateKey(data.end_date)
  const payroll_date = normalizeDateKey(data.payroll_date)
  if (!start_date || !end_date || !payroll_date) {
    throw new Error('Please fill in period name and all dates.')
  }

  const [id] = await knex('payroll_periods').insert({
    period_name: String(data.period_name || '').trim(),
    period_month: Number(data.period_month),
    period_year: Number(data.period_year),
    start_date,
    end_date,
    payroll_date,
    status: 'Draft',
    created_by: userId || null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  return getPeriod(knex, id)
}

async function updatePeriod(knex, id, data) {
  const start_date = normalizeDateKey(data.start_date)
  const end_date = normalizeDateKey(data.end_date)
  const payroll_date = normalizeDateKey(data.payroll_date)
  if (!start_date || !end_date || !payroll_date) {
    throw new Error('Please fill in period name and all dates.')
  }

  await knex('payroll_periods').where({ id }).update({
    period_name: String(data.period_name || '').trim(),
    period_month: Number(data.period_month),
    period_year: Number(data.period_year),
    start_date,
    end_date,
    payroll_date,
    updated_at: new Date(),
  })
  return getPeriod(knex, id)
}

async function deletePeriod(knex, id) {
  await knex('payroll_records').where({ payroll_period_id: id }).del()
  await knex('payroll_periods').where({ id }).del()
  return { ok: true }
}

async function getCurrentSalaryStructure(knex, employeeId) {
  let row = await knex('salary_structure')
    .where({ employee_id: employeeId, is_current: true })
    .orderBy('effective_from', 'desc')
    .first()
  if (!row) {
    row = await knex('salary_structure')
      .where({ employee_id: employeeId })
      .orderBy('effective_from', 'desc')
      .first()
  }
  return row
}

async function upsertRecord(knex, payload) {
  const existing = await knex('payroll_records')
    .where({
      payroll_period_id: payload.payroll_period_id,
      employee_id: payload.employee_id,
    })
    .first()

  const now = new Date()
  if (existing) {
    await knex('payroll_records').where({ id: existing.id }).update({
      ...payload,
      updated_at: now,
    })
    return existing.id
  }

  const [id] = await knex('payroll_records').insert({
    ...payload,
    created_at: now,
    updated_at: now,
  })
  return id
}

async function processPeriod(knex, periodId) {
  const period = await getPeriod(knex, periodId)
  if (!period) throw new Error('Payroll period not found')

  const { start, end } = resolvePeriodDates(period)
  if (!start || !end) {
    throw new Error('This payroll period is missing start or end dates. Edit the period and save the dates first.')
  }

  if (!period.start_date || !period.end_date) {
    await knex('payroll_periods').where({ id: periodId }).update({
      start_date: start,
      end_date: end,
      updated_at: new Date(),
    })
  }

  await knex('payroll_periods').where({ id: periodId }).update({
    status: 'Processing',
    updated_at: new Date(),
  })

  const statutory = await getStatutorySettings(knex)
  const eobiWageCeiling = Number(statutory.eobi_wage_ceiling_pkr) || 37000

  const employees = await knex('employees')
    .select('id', 'name', 'employee_code')
    .where('is_deleted', false)
    .where('status', 'active')
    .orderBy('name', 'asc')

  const empIds = employees.map((e) => e.id)
  const allAttendance = await fetchAttendanceForPeriod(knex, start, end, empIds)
  const attByEmp = new Map()
  for (const row of allAttendance) {
    if (!attByEmp.has(row.employee_id)) attByEmp.set(row.employee_id, [])
    attByEmp.get(row.employee_id).push(row)
  }

  const existingRecords = await knex('payroll_records')
    .where({ payroll_period_id: periodId })
    .select('id', 'employee_id', 'arrears', 'deduction_amount')

  const existingByEmp = new Map(existingRecords.map((r) => [r.employee_id, r]))
  let processed = 0
  let skipped = 0

  for (const employee of employees) {
    const salaryStructure = await getCurrentSalaryStructure(knex, employee.id)
    if (!salaryStructure || !(parseFloat(salaryStructure.gross_salary) > 0)) {
      skipped += 1
      continue
    }

    const existing = existingByEmp.get(employee.id)
    const arrears = Number(existing?.arrears) || 0
    const deductionAmount = Number(existing?.deduction_amount) || 0
    const attendance = attByEmp.get(employee.id) || []

    const payload = buildPayrollUpsertPayload({
      payrollPeriodId: periodId,
      employeeId: employee.id,
      salaryStructure,
      attendanceRows: attendance,
      eobiWageCeiling,
      arrears,
      deductionAmount,
      status: 'Draft',
    })

    if (!payload) {
      skipped += 1
      continue
    }

    await upsertRecord(knex, payload)
    processed += 1
  }

  await knex('payroll_periods').where({ id: periodId }).update({
    status: 'Draft',
    updated_at: new Date(),
  })

  return { processed, skipped, totalEmployees: employees.length }
}

async function updateRecordAdjustments(knex, recordId, { arrears, deduction_amount: deductionAmount }) {
  const record = await knex('payroll_records').where({ id: recordId }).first()
  if (!record) throw new Error('Payroll record not found')

  const period = await getPeriod(knex, record.payroll_period_id)
  if (!period || period.status !== 'Draft') {
    throw new Error('Can only edit records while period is Draft')
  }

  const salaryStructure = await getCurrentSalaryStructure(knex, record.employee_id)
  if (!salaryStructure) throw new Error('Salary structure not found')

  const statutory = await getStatutorySettings(knex)
  const attendance = await fetchAttendanceForPeriod(
    knex,
    period.start_date,
    period.end_date,
    [record.employee_id],
  )

  const payload = buildPayrollUpsertPayload({
    payrollPeriodId: period.id,
    employeeId: record.employee_id,
    salaryStructure,
    attendanceRows: attendance,
    eobiWageCeiling: Number(statutory.eobi_wage_ceiling_pkr) || 37000,
    arrears: Number(arrears) || 0,
    deductionAmount: Number(deductionAmount) || 0,
    status: record.status || 'Draft',
  })

  if (!payload) throw new Error('Could not calculate payroll row')

  await knex('payroll_records').where({ id: recordId }).update({
    ...payload,
    updated_at: new Date(),
  })

  return { ok: true }
}

async function approvePeriod(knex, periodId) {
  await knex('payroll_periods').where({ id: periodId }).update({
    status: 'Approved',
    updated_at: new Date(),
  })
  await knex('payroll_records').where({ payroll_period_id: periodId }).update({
    status: 'Approved',
    updated_at: new Date(),
  })
  return { ok: true }
}

async function revertPeriod(knex, periodId) {
  await knex('payroll_periods').where({ id: periodId }).update({
    status: 'Draft',
    updated_at: new Date(),
  })
  await knex('payroll_records').where({ payroll_period_id: periodId }).update({
    status: 'Draft',
    updated_at: new Date(),
  })
  return { ok: true }
}

module.exports = {
  listPeriods,
  getPeriod,
  listRecords,
  createPeriod,
  updatePeriod,
  deletePeriod,
  processPeriod,
  updateRecordAdjustments,
  approvePeriod,
  revertPeriod,
  getStatutorySettings,
  saveStatutorySettings,
  fetchAttendanceForPeriod,
}
