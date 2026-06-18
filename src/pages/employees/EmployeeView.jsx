import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@/lib/notify.js'
import { parseMoney } from '@/lib/employeeForm.js'
import { useAuthStore } from '@/store/authStore.js'
import { canWrite } from '@/lib/permissions.js'

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-foreground">{value || '—'}</dd>
    </div>
  )
}

export default function EmployeeView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canEditEmployees = canWrite(user, 'employee_data')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await window.electron.getEmployee(Number(id))
        if (!cancelled) setDetail(data)
      } catch (e) {
        if (!cancelled) {
          toastError(e, 'That employee could not be found.')
          navigate('/employees')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  const handleDelete = async () => {
    if (!window.confirm('Remove this employee from the directory?')) return
    try {
      await window.electron.deleteEmployee(Number(id))
      toast.success('Employee removed')
      navigate('/employees')
    } catch (e) {
      toastError(e, 'Could not delete this employee.')
    }
  }

  if (loading || !detail) {
    return <div className="py-12 text-center text-muted">Loading profile…</div>
  }

  const emp = detail.employee
  const posting = detail.posting
  const salary = detail.salary_structure
  const history = detail.employment_history || []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link to="/employees" className="rounded-md border border-border p-2 text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="font-mono text-xs text-muted">{emp.employee_code}</div>
            <h1 className="text-2xl font-semibold text-foreground">{emp.name}</h1>
            <p className="text-sm text-muted">
              {emp.employee_type || '—'} · {emp.status || 'active'}
            </p>
          </div>
        </div>
        {canEditEmployees ? (
          <div className="flex gap-2">
            <Link
              to={`/employees/${id}/edit`}
              className="btn-secondary"
            >
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </div>
        ) : null}
      </div>

      {emp.photo_url ? (
        <img src={emp.photo_url} alt="" className="h-32 w-32 rounded-lg border border-border object-cover" />
      ) : null}

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold text-foreground">Personal</h2>
        <dl>
          <Row label="Father / husband" value={emp.father_husband_name} />
          <Row label="Gender" value={emp.gender} />
          <Row label="Marital status" value={emp.marital_status} />
          <Row label="Religion" value={emp.religion} />
          <Row label="Blood group" value={emp.blood_group} />
          <Row label="Date of birth" value={fmtDate(emp.date_of_birth)} />
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold text-foreground">CNIC & contact</h2>
        <dl>
          <Row label="CNIC" value={emp.cnic_number || emp.cnic} />
          <Row label="CNIC issue" value={fmtDate(emp.cnic_issue_date)} />
          <Row label="CNIC expiry" value={fmtDate(emp.cnic_expiry_date)} />
          <Row label="Phone" value={emp.phone_number || emp.phone} />
          <Row label="Emergency" value={emp.emergency_contact} />
          <Row label="Address" value={[emp.address_street, emp.address_city].filter(Boolean).join(', ')} />
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold text-foreground">Current posting</h2>
        <dl>
          <Row label="Department" value={posting?.department_name} />
          <Row label="Site" value={posting?.area_name} />
          <Row label="Joining" value={fmtDate(posting?.joining_date || emp.date_of_joining)} />
          <Row label="Release" value={fmtDate(posting?.release_date || emp.release_date)} />
        </dl>
      </section>

      {salary ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold text-foreground">Salary</h2>
          <dl>
            <Row label="Basic" value={`PKR ${parseMoney(salary.basic_salary).toLocaleString()}`} />
            <Row label="Gross" value={`PKR ${parseMoney(salary.gross_salary).toLocaleString()}`} />
            <Row label="Effective from" value={fmtDate(salary.effective_from)} />
          </dl>
        </section>
      ) : null}

      {history.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold text-foreground">Employment history</h2>
          <ul className="space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="rounded border border-border px-3 py-2">
                <div className="font-medium text-foreground">{h.company}</div>
                <div className="text-muted">
                  {fmtDate(h.period_from)} — {h.period_to ? fmtDate(h.period_to) : 'Present'}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function fmtDate(v) {
  if (!v) return ''
  return String(v).slice(0, 10)
}
