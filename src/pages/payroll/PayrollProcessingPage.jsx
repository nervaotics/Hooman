import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  Play,
  Printer,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@/lib/notify.js'
import { useAuthStore } from '@/store/authStore.js'
import { canWrite } from '@/lib/permissions.js'
import {
  defaultPayrollPaymentDate,
  getMonthName,
  getPayrollPeriod21stTo20th,
} from '@/lib/payrollWorkCycle.js'
import { computeSalaryProcessingMetrics, formatGenderShort } from '@/lib/salaryProcessing.js'

const roundMoney2 = (n) => Math.round((Number(n) || 0) * 100) / 100

const fieldClass =
  'w-full rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground outline-none focus:border-accent'
const labelClass = 'mb-1 block text-xs font-medium text-muted'
const btnSecondary = 'btn-secondary'

function statusClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'draft') return 'bg-slate-500/20 text-slate-300'
  if (s === 'processing') return 'bg-amber-500/20 text-amber-300'
  if (s === 'approved') return 'bg-emerald-500/20 text-emerald-300'
  if (s === 'paid') return 'bg-blue-500/20 text-blue-300'
  return 'bg-slate-500/20 text-muted'
}

function formatAmount(n) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0)
}

function formatNum(n, frac = 2) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '—'
  return x.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: frac })
}

function formatShortDate(d) {
  if (d == null || d === '') return '—'
  const s = String(d).split('T')[0]
  const dt = new Date(`${s}T12:00:00`)
  return Number.isFinite(dt.getTime()) ? dt.toLocaleDateString() : '—'
}

function newPeriodDefaults() {
  const now = new Date()
  const period_month = now.getMonth() + 1
  const period_year = now.getFullYear()
  const { start_date, end_date } = getPayrollPeriod21stTo20th(period_month, period_year)
  return {
    period_name: `${getMonthName(period_month)} ${period_year}`,
    period_month,
    period_year,
    start_date,
    end_date,
    payroll_date: defaultPayrollPaymentDate(period_month, period_year),
  }
}

export default function PayrollProcessingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const periodId = searchParams.get('period')
  const user = useAuthStore((s) => s.user)
  const canProcess = canWrite(user, 'payroll_processing')

  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [payrollRecords, setPayrollRecords] = useState([])
  const [periodAttendance, setPeriodAttendance] = useState([])
  const [rowDraftEdits, setRowDraftEdits] = useState({})
  const [statutoryPreview, setStatutoryPreview] = useState({ eobi_wage_ceiling_pkr: 37000 })
  const [formData, setFormData] = useState(newPeriodDefaults)

  const loadPeriod = useCallback(async (id) => {
    setLoading(true)
    try {
      const { period, records } = await window.electron.getPayrollPeriod(id)
      if (!period) throw new Error('Payroll period not found')
      setCurrentPeriod(period)
      setPayrollRecords(records || [])
      setRowDraftEdits({})
      setFormData({
        period_name: period.period_name,
        period_month: period.period_month,
        period_year: period.period_year,
        start_date: period.start_date,
        end_date: period.end_date,
        payroll_date: period.payroll_date,
      })
    } catch (e) {
      toastError(e, 'Could not load this payroll period.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (periodId) {
      const t = setTimeout(() => loadPeriod(periodId), 0)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setCurrentPeriod(null)
      setPayrollRecords([])
      setRowDraftEdits({})
      setPeriodAttendance([])
      setFormData(newPeriodDefaults())
    }, 0)
    return () => clearTimeout(t)
  }, [periodId, loadPeriod])

  const baseRowDrafts = useMemo(() => {
    const m = {}
    for (const r of payrollRecords) {
      m[r.id] = {
        arrears: Number(parseFloat(r.arrears) || 0),
        deduction: Number(parseFloat(r.deduction_amount) || 0),
      }
    }
    return m
  }, [payrollRecords])

  const rowDrafts = useMemo(() => {
    const merged = { ...baseRowDrafts }
    for (const [id, edits] of Object.entries(rowDraftEdits)) {
      if (merged[id]) merged[id] = { ...merged[id], ...edits }
    }
    return merged
  }, [baseRowDrafts, rowDraftEdits])

  const attendanceEmployeeIds = useMemo(
    () => [...new Set(payrollRecords.map((r) => r.employee_id).filter(Boolean))],
    [payrollRecords],
  )

  const shouldLoadAttendance = Boolean(currentPeriod?.id && attendanceEmployeeIds.length)

  useEffect(() => {
    if (!shouldLoadAttendance) return undefined

    let cancelled = false
    ;(async () => {
      try {
        const { rows } = await window.electron.getPayrollPeriodAttendance(
          currentPeriod.id,
          attendanceEmployeeIds,
        )
        if (!cancelled) setPeriodAttendance(rows || [])
      } catch (e) {
        console.warn('[Payroll] attendance load failed:', e?.message)
        if (!cancelled) setPeriodAttendance([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentPeriod?.id, attendanceEmployeeIds, shouldLoadAttendance])

  const displayAttendance = useMemo(
    () => (shouldLoadAttendance ? periodAttendance : []),
    [shouldLoadAttendance, periodAttendance],
  )

  useEffect(() => {
    if (!currentPeriod?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const statutory = await window.electron.getPayrollStatutorySettings()
        if (!cancelled) setStatutoryPreview(statutory || { eobi_wage_ceiling_pkr: 37000 })
      } catch (e) {
        console.warn('[Payroll] statutory settings failed:', e?.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentPeriod?.id])

  const salaryGridRows = useMemo(() => {
    if (!payrollRecords.length) return []
    const ceiling = Math.max(0, Number(statutoryPreview?.eobi_wage_ceiling_pkr) || 0)
    return payrollRecords.map((record) => {
      const empId = record.employee_id
      const rows = displayAttendance.filter((a) => a.employee_id === empId)
      const monthlyAllotted = parseFloat(record.salary_structure?.gross_salary ?? 0) || 0
      const draft = rowDrafts[record.id]
      const arrears = draft ? draft.arrears : Number(parseFloat(record.arrears) || 0)
      const deduction = draft ? draft.deduction : Number(parseFloat(record.deduction_amount) || 0)
      const metrics = computeSalaryProcessingMetrics(rows, monthlyAllotted, { arrears, deduction })
      const grossLine = metrics.totalSalary
      const eobiWageBase = ceiling > 0 ? Math.min(grossLine, ceiling) : grossLine
      const previewEobiEmployee = roundMoney2(eobiWageBase * 0.01)
      const previewNet = roundMoney2(Math.max(0, grossLine - previewEobiEmployee))
      return { record, metrics, monthlyAllotted, previewNet }
    })
  }, [payrollRecords, displayAttendance, rowDrafts, statutoryPreview])

  const canEditPeriodMeta =
    currentPeriod && canProcess && ['Draft', 'Processing'].includes(currentPeriod.status)

  const applyMonthYear = (month, year) => {
    const { start_date, end_date } = getPayrollPeriod21stTo20th(month, year)
    setFormData((prev) => ({
      ...prev,
      period_month: month,
      period_year: year,
      start_date,
      end_date,
      payroll_date: defaultPayrollPaymentDate(month, year),
      period_name: `${getMonthName(month)} ${year}`,
    }))
  }

  const handleCreatePeriod = async () => {
    if (!canProcess) {
      toast.error('You do not have permission to create payroll periods.')
      return
    }
    if (!formData.period_name?.trim() || !formData.start_date || !formData.end_date || !formData.payroll_date) {
      toast.error('Please fill in period name and all dates.')
      return
    }
    setLoading(true)
    try {
      const { period } = await window.electron.createPayrollPeriod(formData)
      toast.success('Payroll period created')
      navigate(`/payroll/processing?period=${period.id}`)
    } catch (e) {
      toastError(e, 'Could not create this payroll period.')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePeriodDetails = async () => {
    if (!currentPeriod || !canEditPeriodMeta) {
      toast.error('You can only edit period details while status is Draft or Processing.')
      return
    }
    if (!formData.period_name?.trim() || !formData.start_date || !formData.end_date || !formData.payroll_date) {
      toast.error('Please fill in period name and all dates.')
      return
    }
    setLoading(true)
    try {
      await window.electron.updatePayrollPeriod(currentPeriod.id, formData)
      toast.success('Period details saved')
      await loadPeriod(currentPeriod.id)
    } catch (e) {
      toastError(e, 'Could not save period details.')
    } finally {
      setLoading(false)
    }
  }

  const handleProcessPayroll = async () => {
    if (!currentPeriod) {
      toast.error('Please create or select a payroll period first.')
      return
    }
    if (!canProcess) {
      toast.error('You do not have permission to process payroll.')
      return
    }
    if (!window.confirm('This will calculate payroll for all active employees. Continue?')) return

    setProcessing(true)
    try {
      const result = await window.electron.processPayrollPeriod(currentPeriod.id)
      toast.success(
        `Payroll processed: ${result.processed} employee${result.processed === 1 ? '' : 's'}${
          result.skipped ? ` (${result.skipped} skipped — no salary structure)` : ''
        }`,
      )
      await loadPeriod(currentPeriod.id)
    } catch (e) {
      toastError(e, 'Could not process payroll.')
    } finally {
      setProcessing(false)
    }
  }

  const handlePersistRowAdjustments = async (recordId) => {
    if (!currentPeriod || currentPeriod.status !== 'Draft' || !canProcess) return
    const draft = rowDrafts[recordId]
    if (!draft) return
    try {
      await window.electron.updatePayrollRecord(recordId, {
        arrears: draft.arrears,
        deduction_amount: draft.deduction,
      })
      setRowDraftEdits((prev) => {
        const next = { ...prev }
        delete next[recordId]
        return next
      })
      await loadPeriod(currentPeriod.id)
    } catch (e) {
      toastError(e, 'Could not save adjustments.')
    }
  }

  const handleApprovePeriod = async () => {
    if (!currentPeriod || !canProcess) return
    if (!window.confirm('Approve this payroll period? This will lock the records.')) return
    setLoading(true)
    try {
      await window.electron.approvePayrollPeriod(currentPeriod.id)
      toast.success('Payroll period approved')
      await loadPeriod(currentPeriod.id)
    } catch (e) {
      toastError(e, 'Could not approve this payroll period.')
    } finally {
      setLoading(false)
    }
  }

  const handleRevertToDraft = async () => {
    if (!currentPeriod || !canProcess) return
    if (!['Approved', 'Locked'].includes(currentPeriod.status)) return
    if (
      !window.confirm(
        'Revert this payroll to Draft? All rows will be set to Draft so you can edit and process again.',
      )
    ) {
      return
    }
    setLoading(true)
    try {
      await window.electron.revertPayrollPeriod(currentPeriod.id)
      toast.success('Payroll reverted to Draft')
      await loadPeriod(currentPeriod.id)
    } catch (e) {
      toastError(e, 'Could not revert this payroll period.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePeriod = async () => {
    if (!currentPeriod || !canProcess) {
      toast.error('You do not have permission to delete payroll periods.')
      return
    }
    const sensitive = ['Approved', 'Paid', 'Locked'].includes(currentPeriod.status)
    if (sensitive) {
      if (
        !window.confirm(
          'This period is approved, paid, or locked. Permanently delete it and ALL salary records? This cannot be undone.',
        )
      ) {
        return
      }
      const typed = window.prompt(`Type DELETE in capital letters to remove "${currentPeriod.period_name}":`)
      if (typed !== 'DELETE') {
        if (typed != null) toast.message('Deletion cancelled.')
        return
      }
    } else if (
      !window.confirm(
        `Delete payroll period "${currentPeriod.period_name}" and all ${payrollRecords.length} salary record(s)?`,
      )
    ) {
      return
    }
    setLoading(true)
    try {
      await window.electron.deletePayrollPeriod(currentPeriod.id)
      toast.success('Payroll period deleted')
      navigate('/payroll')
    } catch (e) {
      toastError(e, 'Could not delete this payroll period.')
    } finally {
      setLoading(false)
    }
  }

  const calculateTotal = () => {
    if (salaryGridRows.length > 0) {
      return salaryGridRows.reduce((sum, row) => {
        if (currentPeriod?.status === 'Draft' && row.previewNet != null) {
          return sum + (Number(row.previewNet) || 0)
        }
        const n = parseFloat(row.record.net_salary)
        return sum + (Number.isFinite(n) ? n : Number(row.metrics.totalSalary) || 0)
      }, 0)
    }
    return payrollRecords.reduce((sum, record) => sum + (parseFloat(record.net_salary) || 0), 0)
  }

  const handlePrintPayroll = () => {
    if (!currentPeriod || payrollRecords.length === 0) {
      toast.error('Process payroll first so there are rows to print.')
      return
    }
    window.print()
  }

  const periodFormFields = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="block text-sm">
        <span className={labelClass}>Period Name *</span>
        <input
          type="text"
          value={formData.period_name}
          onChange={(e) => setFormData({ ...formData, period_name: e.target.value })}
          className={fieldClass}
          placeholder="e.g., January 2026"
        />
      </label>
      <label className="block text-sm">
        <span className={labelClass}>Month *</span>
        <select
          value={formData.period_month}
          onChange={(e) => applyMonthYear(parseInt(e.target.value, 10), formData.period_year)}
          className={fieldClass}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
            <option key={m} value={m}>
              {getMonthName(m)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className={labelClass}>Year *</span>
        <input
          type="number"
          value={formData.period_year}
          onChange={(e) =>
            applyMonthYear(formData.period_month, parseInt(e.target.value, 10) || formData.period_year)
          }
          min="2020"
          max="2100"
          className={fieldClass}
        />
      </label>
      <label className="block text-sm">
        <span className={labelClass}>Start Date *</span>
        <input
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm">
        <span className={labelClass}>End Date *</span>
        <input
          type="date"
          value={formData.end_date}
          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm">
        <span className={labelClass}>Payroll Date *</span>
        <input
          type="date"
          value={formData.payroll_date}
          onChange={(e) => setFormData({ ...formData, payroll_date: e.target.value })}
          className={fieldClass}
        />
      </label>
    </div>
  )

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-start gap-4 print:hidden">
        <Link
          to="/payroll"
          className={btnSecondary}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Payroll
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {currentPeriod ? 'Edit Payroll Period' : 'Create Payroll Period'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {currentPeriod ? 'View and process payroll records' : 'Set up a new payroll period'}
          </p>
        </div>
      </div>

      {!currentPeriod ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Period Details</h2>
          <p className="mt-2 text-sm text-muted">
            Default pay cycle: <strong>21st</strong> of the previous calendar month through{' '}
            <strong>20th</strong> of the selected month (e.g. June = 21 May–20 Jun). Salary divisor
            excludes Saturdays and Sundays.
          </p>
          <div className="mt-6">{periodFormFields}</div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCreatePeriod}
              disabled={loading || !canProcess}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create Period'}
            </button>
            <Link
              to="/payroll"
              className="btn-secondary"
            >
              Cancel
            </Link>
          </div>
        </div>
      ) : (
        <>
          {payrollRecords.length > 0 && (
            <div className="hidden rounded-lg border border-border bg-card p-4 print:block">
              <h2 className="text-lg font-semibold text-foreground">Payroll register</h2>
              <div className="mt-2 grid gap-1 text-sm text-muted sm:grid-cols-2">
                <p>
                  <strong>Period</strong>{' '}
                  {canEditPeriodMeta ? formData.period_name?.trim() || currentPeriod.period_name : currentPeriod.period_name}
                </p>
                <p>
                  <strong>Pay cycle</strong>{' '}
                  {formatShortDate(canEditPeriodMeta ? formData.start_date : currentPeriod.start_date)} —{' '}
                  {formatShortDate(canEditPeriodMeta ? formData.end_date : currentPeriod.end_date)}
                </p>
                <p>
                  <strong>Payroll date</strong>{' '}
                  {formatShortDate(canEditPeriodMeta ? formData.payroll_date : currentPeriod.payroll_date)}
                </p>
                <p>
                  <strong>Status</strong> {currentPeriod.status}
                </p>
                <p>
                  <strong>Employees</strong> {payrollRecords.length}
                </p>
                <p>
                  <strong>{currentPeriod.status === 'Draft' ? 'Total net (preview)' : 'Total net'}</strong>{' '}
                  {formatAmount(calculateTotal())}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-6 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClass(currentPeriod.status)}`}
              >
                {currentPeriod.status}
              </span>
              <div className="flex flex-wrap gap-2">
                {payrollRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={handlePrintPayroll}
                    className={btnSecondary}
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                )}
                {['Draft', 'Processing'].includes(currentPeriod.status) && canProcess && (
                  <button
                    type="button"
                    onClick={handleProcessPayroll}
                    disabled={processing || loading}
                    className="btn-primary disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    {processing ? 'Processing…' : 'Process Payroll'}
                  </button>
                )}
                {currentPeriod.status === 'Draft' && canProcess && (
                  <button
                    type="button"
                    onClick={handleApprovePeriod}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve Period
                  </button>
                )}
                {['Approved', 'Locked'].includes(currentPeriod.status) && canProcess && (
                  <button
                    type="button"
                    onClick={handleRevertToDraft}
                    disabled={loading}
                    className={`${btnSecondary} disabled:opacity-50`}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Revert to Draft
                  </button>
                )}
                {canProcess && (
                  <button
                    type="button"
                    onClick={handleDeletePeriod}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 px-2.5 py-1.5 text-xs text-danger hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete period
                  </button>
                )}
              </div>
            </div>

            {canEditPeriodMeta ? (
              <div className="mt-6">
                <p className="mb-4 text-sm text-muted">
                  Update period name and dates while status is Draft or Processing. Save before processing
                  if you changed the cycle window.
                </p>
                {periodFormFields}
                <button
                  type="button"
                  onClick={handleSavePeriodDetails}
                  disabled={loading}
                  className="btn-primary mt-4 disabled:opacity-50"
                >
                  Save period details
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-foreground">{currentPeriod.period_name}</h3>
                <p className="text-sm text-muted">
                  {getMonthName(currentPeriod.period_month)} {currentPeriod.period_year}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatShortDate(currentPeriod.start_date)} — {formatShortDate(currentPeriod.end_date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Payroll date: {formatShortDate(currentPeriod.payroll_date)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 print:hidden">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <Users className="h-5 w-5 text-muted" />
              <div>
                <p className="text-xs font-medium uppercase text-muted">Employees</p>
                <p className="text-xl font-semibold text-foreground">{payrollRecords.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <DollarSign className="h-5 w-5 text-muted" />
              <div>
                <p className="text-xs font-medium uppercase text-muted">Total Amount</p>
                <p className="text-xl font-semibold text-foreground">{formatAmount(calculateTotal())}</p>
              </div>
            </div>
          </div>

          {payrollRecords.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted print:hidden">
              No payroll records yet. Click &quot;Process Payroll&quot; to calculate salaries for active
              employees with salary structures.
            </div>
          ) : (
            <>
              <p className="text-sm text-muted print:hidden">
                <strong>Rules:</strong> Monthly ÷ 26 = rate per day; hourly base = Monthly ÷ 26 ÷ 8. Overtime
                rate = hourly base × 2. Holiday rate = hourly base × 3 (Sundays when attended). Late
                deduction = hourly base × late hours (after 08:10). EOBI (1%) applies to net where
                configured. Arrears and deductions are editable in Draft; saved on blur.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="min-w-[2400px] text-xs">
                  <thead className="bg-sidebar text-muted">
                    <tr>
                      {[
                        'Emp. Code',
                        'Name',
                        'M/F',
                        'CNIC',
                        'Monthly Salary',
                        'Rate / Day',
                        'Pay Days',
                        'Wages',
                        'Sat Days',
                        'Sat Hrs',
                        'Normal Hrs',
                        'Tot. OT Hrs',
                        'Rate / OT Hr',
                        'OT Amt',
                        'Holidays',
                        'Hol. Hrs',
                        'Hol. Rate/Hr',
                        'Hol. Amt',
                        'Tot. Days',
                        'Arrears',
                        'Deduct.',
                        'Late Hrs',
                        'Ded. Amt',
                        'Total',
                        'Net',
                        'Status',
                      ].map((h) => (
                        <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-medium uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salaryGridRows.map(({ record, metrics, monthlyAllotted, previewNet }) => {
                      const emp = record.employees
                      const canEditAdjustments =
                        currentPeriod.status === 'Draft' && canProcess
                      const adj = rowDrafts[record.id] ?? {
                        arrears: Number(parseFloat(record.arrears) || 0),
                        deduction: Number(parseFloat(record.deduction_amount) || 0),
                      }
                      const net =
                        currentPeriod.status === 'Draft'
                          ? previewNet
                          : parseFloat(record.net_salary ?? previewNet) || previewNet
                      return (
                        <tr key={record.id} className="border-t border-border hover:bg-white/5">
                          <td className="whitespace-nowrap px-2 py-2 font-mono text-muted">
                            {emp?.employee_id || '—'}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-foreground">{emp?.name || '—'}</td>
                          <td className="px-2 py-2">{formatGenderShort(emp?.gender)}</td>
                          <td className="whitespace-nowrap px-2 py-2 font-mono text-muted">
                            {emp?.cnic_number || '—'}
                          </td>
                          <td className="px-2 py-2">{formatAmount(monthlyAllotted)}</td>
                          <td className="px-2 py-2">{formatAmount(metrics.ratePerDay)}</td>
                          <td className="px-2 py-2">{formatNum(metrics.payDays, 2)}</td>
                          <td className="px-2 py-2">{formatAmount(metrics.wagesAmount)}</td>
                          <td className="px-2 py-2">{formatNum(metrics.satDays, 2)}</td>
                          <td className="px-2 py-2">{formatNum(metrics.satHrs, 2)}</td>
                          <td className="px-2 py-2">{formatNum(metrics.normalOtHrs, 2)}</td>
                          <td className="px-2 py-2">{formatNum(metrics.totalOvertimeHrs, 2)}</td>
                          <td className="px-2 py-2">{formatAmount(metrics.ratePerOvertimeHour)}</td>
                          <td className="px-2 py-2">{formatAmount(metrics.amountOvertime)}</td>
                          <td className="px-2 py-2">{formatNum(metrics.holidayDays, 2)}</td>
                          <td className="px-2 py-2">{formatNum(metrics.holidayHrs, 2)}</td>
                          <td className="px-2 py-2">{formatAmount(metrics.holidayRatePerHour)}</td>
                          <td className="px-2 py-2">{formatAmount(metrics.holidayAmount)}</td>
                          <td className="px-2 py-2">{formatNum(metrics.totalDays, 2)}</td>
                          <td className="px-2 py-2">
                            {canEditAdjustments ? (
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={adj.arrears}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  const v = raw === '' ? 0 : Number(raw)
                                  if (raw !== '' && !Number.isFinite(v)) return
                              setRowDraftEdits((prev) => ({
                                ...prev,
                                [record.id]: { ...(prev[record.id] || {}), arrears: v },
                              }))
                                }}
                                onBlur={() => handlePersistRowAdjustments(record.id)}
                                className="w-20 rounded border border-border bg-sidebar px-1 py-0.5 text-foreground"
                              />
                            ) : (
                              formatAmount(metrics.arrears)
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {canEditAdjustments ? (
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={adj.deduction}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  const v = raw === '' ? 0 : Number(raw)
                                  if (raw !== '' && !Number.isFinite(v)) return
                              setRowDraftEdits((prev) => ({
                                ...prev,
                                [record.id]: { ...(prev[record.id] || {}), deduction: v },
                              }))
                                }}
                                onBlur={() => handlePersistRowAdjustments(record.id)}
                                className="w-20 rounded border border-border bg-sidebar px-1 py-0.5 text-foreground"
                              />
                            ) : (
                              formatAmount(metrics.deduction)
                            )}
                          </td>
                          <td className="px-2 py-2">{formatNum(metrics.lateHrs, 2)}</td>
                          <td className="px-2 py-2">{formatAmount(metrics.deductedAmount)}</td>
                          <td className="px-2 py-2 font-semibold">{formatAmount(metrics.totalSalary)}</td>
                          <td className="px-2 py-2 font-medium">{formatAmount(net)}</td>
                          <td className="px-2 py-2 print:hidden">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass(record.status)}`}
                            >
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
