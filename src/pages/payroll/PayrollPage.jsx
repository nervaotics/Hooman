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
      return 'bg-slate-100 text-slate-700'
    case 'Processing':
      return 'bg-amber-100 text-amber-800'
    case 'Approved':
      return 'bg-emerald-100 text-emerald-800'
    case 'Paid':
      return 'bg-blue-100 text-blue-800'
    case 'Locked':
      return 'bg-violet-100 text-violet-800'
    default:
      return 'bg-slate-100 text-slate-600'
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
          <h1 className="text-2xl font-semibold text-slate-900">Payroll Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage payroll periods and salary processing</p>
        </div>
        {canProcess && (
          <Link
            to="/payroll/processing"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create New Period
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Total Periods', value: stats.total, icon: Calendar, tone: 'text-slate-600' },
          { label: 'Draft', value: stats.draft, icon: Clock, tone: 'text-slate-500' },
          { label: 'Processing', value: stats.processing, icon: Clock, tone: 'text-amber-600' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle2, tone: 'text-emerald-600' },
          { label: 'Paid', value: stats.paid, icon: DollarSign, tone: 'text-blue-600' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 ${tone}`} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                <p className="text-2xl font-semibold text-slate-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading payroll periods…</div>
        ) : periods.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-10 text-center">
            <p className="text-sm text-slate-500">No payroll periods found. Create a new period to get started.</p>
            {canProcess && (
              <Link
                to="/payroll/processing"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Create First Period
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Period</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Month/Year</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Payroll Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Employees</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Total Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map((period) => (
                  <tr key={period.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{period.period_name}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {getMonthName(period.period_month)} {period.period_year}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {period.payroll_date
                        ? new Date(`${period.payroll_date}T12:00:00`).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-slate-400" />
                        {period.payroll_records?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatPkr(periodTotal(period))}</td>
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
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          title="Open period"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {canProcess && (
                          <button
                            type="button"
                            onClick={() => handleDelete(period)}
                            disabled={deletingId === period.id}
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
