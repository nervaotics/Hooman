const { computeSalaryProcessingMetrics, SALARY_STANDARD_DAYS } = require('./salaryProcessing.cjs')

const roundMoney2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const toIntDays = (v) => Math.max(0, Math.round(Number(v) || 0))
const pkrInt = (n) => Math.round(Number(n) || 0)

function buildPayrollUpsertPayload({
  payrollPeriodId,
  employeeId,
  salaryStructure,
  attendanceRows,
  eobiWageCeiling,
  arrears,
  deductionAmount,
  status,
}) {
  const monthlyGross = Math.max(0, parseFloat(salaryStructure?.gross_salary) || 0)
  if (!monthlyGross) return null
  if (salaryStructure?.id == null || salaryStructure.id === '') return null

  const ar = Number(arrears) || 0
  const dd = Number(deductionAmount) || 0
  const metrics = computeSalaryProcessingMetrics(attendanceRows, monthlyGross, {
    arrears: ar,
    deduction: dd,
  })

  const grossSalary = metrics.totalSalary
  const ratio = monthlyGross > 0 ? grossSalary / monthlyGross : 0

  const scaledBasic = roundMoney2(parseFloat(salaryStructure.basic_salary || 0) * ratio)
  const scaledHra = roundMoney2(parseFloat(salaryStructure.house_rent_allowance || 0) * ratio)
  const scaledTransport = roundMoney2(parseFloat(salaryStructure.transport_allowance || 0) * ratio)
  const scaledMedical = roundMoney2(parseFloat(salaryStructure.medical_allowance || 0) * ratio)
  const scaledSpecial = roundMoney2(parseFloat(salaryStructure.special_allowance || 0) * ratio)
  const scaledAllowances = scaledHra + scaledTransport + scaledMedical + scaledSpecial

  const leaveDeduction = 0
  const eobiWageBase = Math.min(grossSalary, eobiWageCeiling)
  const eobiEmployee = roundMoney2(eobiWageBase * 0.01)
  const eobiEmployer = roundMoney2(eobiWageBase * 0.05)
  const netAfterEmployeeDeductions = Math.max(0, grossSalary - leaveDeduction - eobiEmployee)
  const sessiEmployer = roundMoney2(netAfterEmployeeDeductions * 0.06)
  const netSalary = roundMoney2(Math.max(0, grossSalary - eobiEmployee))
  const totalDeductions = roundMoney2(eobiEmployee + metrics.deductedAmount + metrics.deduction)

  return {
    payroll_period_id: payrollPeriodId,
    employee_id: employeeId,
    salary_structure_id: salaryStructure.id,
    basic_salary: pkrInt(scaledBasic),
    allowances: pkrInt(scaledAllowances),
    gross_salary: pkrInt(grossSalary),
    provident_fund: 0,
    income_tax: 0,
    leave_deduction: pkrInt(leaveDeduction),
    working_days: toIntDays(SALARY_STANDARD_DAYS),
    present_days: toIntDays(metrics.payDays),
    leave_days: 0,
    net_salary: pkrInt(netSalary),
    total_deductions: pkrInt(totalDeductions),
    arrears: pkrInt(roundMoney2(ar)),
    deduction_amount: pkrInt(roundMoney2(dd)),
    other_deductions: 0,
    eobi_employee: pkrInt(eobiEmployee),
    eobi_employer: pkrInt(eobiEmployer),
    sessi_employer: pkrInt(sessiEmployer),
    status: status || 'Draft',
  }
}

module.exports = { buildPayrollUpsertPayload }
