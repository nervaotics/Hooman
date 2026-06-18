import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@/lib/notify.js'
import { useAuthStore } from '@/store/authStore.js'
import { canWrite } from '@/lib/permissions.js'
import { formatPkr, getMonthName } from '@/lib/payrollWorkCycle.js'

function statusClass(status) {
  switch (status) {
    case 'Draft':
      return 'bg-slate-500/20 text-slate-300'
    case 'Processing':
      return 'bg-amber-500/20 text-amber-300'
    case 'Approved':
      return 'bg-emerald-500/20 text-emerald-300'
    case 'Paid':
      return 'bg-blue-500/20 text-blue-300'
    case 'Locked':
      return 'bg-violet-500/20 text-violet-300'
    default:
      return 'bg-slate-500/20 text-muted'
  }
}

function periodTotal(period) {
  return (period.payroll_records || []).reduce(
    (sum, r) => sum + (parseFloat(r.net_salary) || 0),
    0,
  )
}

export default function PayrollPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canProcess = canWrite(user, 'payroll_processing')
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.electron.getPayrollPeriods()
      setPeriods(data || [])
    } catch (e) {
      toastError(e, 'Could not load payroll periods.')
      setPeriods([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [load])

  const stats = useMemo(
    () => ({
      total: periods.length,
      draft: periods.filter((p) => p.status === 'Draft').length,
      processing: periods.filter((p) => p.status === 'Processing').length,
      approved: periods.filter((p) => p.status === 'Approved').length,
      paid: periods.filter((p) => p.status === 'Paid').length,
    }),
    [periods],
  )

  const handleDelete = async (period) => {
    if (!canProcess) {
      toast.error('You do not have permission to delete payroll periods.')
      return
    }
    const count = period.payroll_records?.length ?? 0
    const sensitive = ['Approved', 'Paid', 'Locked'].includes(period.status)
    if (sensitive) {
      if (
        !window.confirm(
          `Delete "${period.period_name}" (${period.status}) and all ${count} salary record(s)? This cannot be undone.`,
        )
      ) {
        return
      }
      const typed = window.prompt('Type DELETE in capital letters to confirm:')
      if (typed !== 'DELETE') {
        if (typed != null) toast.message('Deletion cancelled.')
        return
      }
    } else if (
      !window.confirm(`Delete payroll period "${period.period_name}" and all ${count} salary record(s)?`)
    ) {
      return
    }
    try {
      setDeletingId(period.id)
      await window.electron.deletePayrollPeriod(period.id)
      toast.success('Payroll period deleted')
      await load()
    } catch (e) {
      toastError(e, 'Could not delete this payroll period.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Payroll Management</h1>
          <p className="mt-1 text-sm text-muted">Manage payroll periods and salary processing</p>
        </div>
        {canProcess && (
          <Link
            to="/payroll/processing"
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Create New Period
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Total Periods', value: stats.total, icon: Calendar, tone: 'text-muted' },
          { label: 'Draft', value: stats.draft, icon: Clock, tone: 'text-muted' },
          { label: 'Processing', value: stats.processing, icon: Clock, tone: 'text-amber-400' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle2, tone: 'text-emerald-400' },
          { label: 'Paid', value: stats.paid, icon: DollarSign, tone: 'text-blue-400' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 ${tone}`} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
                <p className="text-2xl font-semibold text-foreground">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted">Loading payroll periods…</div>
        ) : periods.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-10 text-center">
            <p className="text-sm text-muted">No payroll periods found. Create a new period to get started.</p>
            {canProcess && (
              <Link
                to="/payroll/processing"
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create First Period
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-sidebar text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Month/Year</th>
                  <th className="px-4 py-3">Payroll Date</th>
                  <th className="px-4 py-3">Employees</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.id} className="border-t border-border hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-foreground">{period.period_name}</td>
                    <td className="px-4 py-3 text-muted">
                      {getMonthName(period.period_month)} {period.period_year}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {period.payroll_date
                        ? new Date(`${period.payroll_date}T12:00:00`).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-muted" />
                        {period.payroll_records?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatPkr(periodTotal(period))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(period.status)}`}
                      >
                        {period.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/payroll/processing?period=${period.id}`)}
                          className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-accent"
                          title="Open period"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {canProcess && (
                          <button
                            type="button"
                            onClick={() => handleDelete(period)}
                            disabled={deletingId === period.id}
                            className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-danger disabled:opacity-50"
                            title="Delete period"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
