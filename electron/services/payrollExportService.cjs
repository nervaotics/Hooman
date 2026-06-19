const { computeSalaryProcessingMetrics } = require('../lib/salaryProcessing.cjs')
const { rowsToCsv } = require('../lib/csvUtils.cjs')
const {
  cnicDigitsOnly,
  formatCnicEobi,
  formatEobiDate,
  formatGenderLabel,
  formatMobile,
  normalizeDateKey,
  sessiContributionWage,
} = require('../lib/payrollStatutoryFormats.cjs')
const payrollService = require('./payrollService.cjs')

const SESSI_HEADERS = [
  'Sr_No',
  'Employee_Full_Name',
  'Father_Name',
  'CNIC_No',
  'Employee_Salary (Daily/Monthly)',
  'Working_Days',
  'Salary_to_Pay_Contribution',
  'Mobile_No',
  'Employee_Gender',
]

const EOBI_HEADERS = [
  'Name',
  'EOBI_NO',
  'CNIC',
  'DOB',
  'DOJ',
  'DOE',
  'NO_OF_DAYS_WORKED',
]

const roundMoney2 = (n) => Math.round((Number(n) || 0) * 100) / 100

function resolveWorkingDays(record, metrics) {
  const fromRecord = Number(record?.present_days)
  if (Number.isFinite(fromRecord) && fromRecord > 0) return Math.round(fromRecord * 100) / 100
  return Math.round((Number(metrics?.payDays) || 0) * 100) / 100
}

function resolveGrossSalary(record, metrics, monthlyGross) {
  const processed = Number(record?.gross_salary)
  if (Number.isFinite(processed) && processed > 0) return processed
  return Math.round(Number(metrics?.totalSalary) || monthlyGross || 0)
}

function resolveEobiEmployee(grossSalary, eobiWageCeiling, record) {
  const stored = Number(record?.eobi_employee)
  if (Number.isFinite(stored) && stored >= 0 && Number(record?.gross_salary) > 0) {
    return stored
  }
  const ceiling = Math.max(0, Number(eobiWageCeiling) || 0)
  const base = ceiling > 0 ? Math.min(grossSalary, ceiling) : grossSalary
  return Math.round(roundMoney2(base * 0.01))
}

async function loadExportContext(knex, periodId) {
  const period = await payrollService.getPeriod(knex, periodId)
  if (!period) throw new Error('Payroll period not found')

  const records = await knex('payroll_records as pr')
    .leftJoin('employees as e', 'pr.employee_id', 'e.id')
    .leftJoin('salary_structure as ss', 'pr.salary_structure_id', 'ss.id')
    .select(
      'pr.*',
      'e.name as employee_name',
      'e.employee_code',
      'e.gender',
      'e.cnic_number',
      'e.cnic',
      'e.father_husband_name',
      'e.phone_number',
      'e.phone',
      'e.date_of_birth',
      'e.date_of_joining',
      'e.release_date',
      'e.eobi_number',
      'ss.gross_salary as struct_gross',
    )
    .where('pr.payroll_period_id', periodId)
    .where('e.is_deleted', false)
    .orderBy('e.name', 'asc')

  if (!records.length) {
    throw new Error('No payroll records in this period. Process payroll first.')
  }

  const statutory = await payrollService.getStatutorySettings(knex)
  const eobiWageCeiling = Number(statutory.eobi_wage_ceiling_pkr) || 37000
  const empIds = records.map((r) => r.employee_id)
  const attendance = await payrollService.fetchAttendanceForPeriod(
    knex,
    period.start_date,
    period.end_date,
    empIds,
  )
  const attByEmp = new Map()
  for (const row of attendance) {
    if (!attByEmp.has(row.employee_id)) attByEmp.set(row.employee_id, [])
    attByEmp.get(row.employee_id).push(row)
  }

  return { period, records, statutory, eobiWageCeiling, attByEmp }
}

function enrichRecordRow(record, attByEmp, eobiWageCeiling) {
  const monthlyGross = parseFloat(record.struct_gross) || 0
  const attendance = attByEmp.get(record.employee_id) || []
  const metrics = computeSalaryProcessingMetrics(attendance, monthlyGross, {
    arrears: Number(record.arrears) || 0,
    deduction: Number(record.deduction_amount) || 0,
  })
  const grossSalary = resolveGrossSalary(record, metrics, monthlyGross)
  const eobiEmployee = resolveEobiEmployee(grossSalary, eobiWageCeiling, record)
  const workingDays = resolveWorkingDays(record, metrics)

  return {
    record,
    metrics,
    monthlyGross,
    grossSalary,
    eobiEmployee,
    workingDays,
  }
}

async function exportSessiCsv(knex, periodId) {
  const { period, records, statutory, eobiWageCeiling, attByEmp } = await loadExportContext(
    knex,
    periodId,
  )

  const rows = records.map((record, index) => {
    const ctx = enrichRecordRow(record, attByEmp, eobiWageCeiling)
    const contributionWage = sessiContributionWage(ctx.grossSalary, ctx.eobiEmployee, statutory)
    return {
      Sr_No: index + 1,
      Employee_Full_Name: record.employee_name || '',
      Father_Name: record.father_husband_name || '',
      CNIC_No: cnicDigitsOnly(record.cnic_number || record.cnic),
      'Employee_Salary (Daily/Monthly)': Math.round(ctx.monthlyGross || ctx.grossSalary),
      Working_Days: ctx.workingDays,
      Salary_to_Pay_Contribution: Math.round(contributionWage),
      Mobile_No: formatMobile(record.phone_number || record.phone),
      Employee_Gender: formatGenderLabel(record.gender),
    }
  })

  const periodLabel = String(period.period_name || periodId).replace(/[^\w\-]+/g, '_')
  return {
    csv: rowsToCsv(SESSI_HEADERS, rows),
    filename: `SESSI_${periodLabel}.csv`,
    rowCount: rows.length,
  }
}

function resolveDoe(employee, period) {
  const release = normalizeDateKey(employee.release_date)
  const periodStart = normalizeDateKey(period.start_date)
  const periodEnd = normalizeDateKey(period.end_date)
  if (release && release >= periodStart && release <= periodEnd) {
    return formatEobiDate(release)
  }
  return ''
}

async function exportEobiCsv(knex, periodId) {
  const { period, records, eobiWageCeiling, attByEmp } = await loadExportContext(knex, periodId)

  const rows = records.map((record) => {
    const ctx = enrichRecordRow(record, attByEmp, eobiWageCeiling)
    return {
      Name: record.employee_name || '',
      EOBI_NO: String(record.eobi_number || '').trim(),
      CNIC: formatCnicEobi(record.cnic_number || record.cnic),
      DOB: formatEobiDate(record.date_of_birth),
      DOJ: formatEobiDate(record.date_of_joining),
      DOE: resolveDoe(record, period),
      NO_OF_DAYS_WORKED: ctx.workingDays,
    }
  })

  const periodLabel = String(period.period_name || periodId).replace(/[^\w\-]+/g, '_')
  return {
    csv: rowsToCsv(EOBI_HEADERS, rows),
    filename: `EOBI_${periodLabel}.csv`,
    rowCount: rows.length,
  }
}

/**
 * @param {import('knex').Knex} knex
 * @param {number} periodId
 * @param {'sessi' | 'eobi'} format
 */
async function exportStatutoryCsv(knex, periodId, format) {
  const kind = String(format || '').toLowerCase()
  if (kind === 'sessi') return exportSessiCsv(knex, periodId)
  if (kind === 'eobi') return exportEobiCsv(knex, periodId)
  throw new Error('Export format must be sessi or eobi')
}

module.exports = { exportStatutoryCsv, SESSI_HEADERS, EOBI_HEADERS }
