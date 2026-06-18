import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  LayoutGrid,
  Pencil,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@/lib/notify.js'
import { useAuthStore } from '@/store/authStore.js'
import { canWrite } from '@/lib/permissions.js'

export default function EmployeeList() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canEditEmployees = canWrite(user, 'employee_data')
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    employee_type: '',
    department: '',
    area: '',
    status: '',
  })
  const [departments, setDepartments] = useState([])
  const [areas, setAreas] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const [list, depts, siteList] = await Promise.all([
        window.electron.getEmployees({
          search,
          ...filters,
        }),
        window.electron.getDepartments(),
        window.electron.getAreas(),
      ])
      setEmployees(list)
      setDepartments(depts)
      setAreas(siteList)
    } catch (e) {
      toastError(e, 'Could not load employees.')
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters])

  const departmentNames = useMemo(
    () => [...new Set(departments.map((d) => d.name))],
    [departments],
  )
  const areaNames = useMemo(() => [...new Set(areas.map((a) => a.name))], [areas])

  const handleDelete = async (emp) => {
    if (
      !window.confirm(
        `Remove ${emp.name || emp.employee_code}? This marks the employee as deleted.`,
      )
    ) {
      return
    }
    try {
      await window.electron.deleteEmployee(emp.id)
      toast.success('Employee removed')
      load()
    } catch (e) {
      toastError(e, 'Could not delete this employee.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Employees</h1>
          <p className="mt-1 text-sm text-muted">
            {employees.length} employee{employees.length === 1 ? '' : 's'} in directory
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEditEmployees ? (
            <Link
              to="/employees/new"
              className="btn-primary inline-flex items-center gap-2 px-4 py-2"
            >
              <Plus className="h-4 w-4" />
              Add employee
            </Link>
          ) : (
            <span className="text-xs text-muted">Read-only access</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or name…"
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-white/5"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
        <div className="inline-flex rounded-md border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`rounded px-2 py-1 ${viewMode === 'table' ? 'bg-white text-black' : 'text-muted'}`}
            aria-label="Table view"
          >
            <Table2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`rounded px-2 py-1 ${viewMode === 'card' ? 'bg-white text-black' : 'text-muted'}`}
            aria-label="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showFilters ? (
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-4">
          <select
            value={filters.employee_type}
            onChange={(e) => setFilters((f) => ({ ...f, employee_type: e.target.value }))}
            className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            <option value="Labor">Labor</option>
            <option value="Contract">Contract</option>
            <option value="Permanent">Permanent</option>
          </select>
          <select
            value={filters.department}
            onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
            className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm"
          >
            <option value="">All departments</option>
            {departmentNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={filters.area}
            onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}
            className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm"
          >
            <option value="">All sites</option>
            {areaNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="terminated">Terminated</option>
            <option value="resigned">Resigned</option>
          </select>
        </div>
      ) : null}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted">Loading employees…</div>
      ) : employees.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <User className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-3 text-sm text-muted">No employees match your filters.</p>
          {canEditEmployees ? (
            <Link to="/employees/new" className="mt-4 inline-block text-sm text-accent hover:underline">
              Add the first employee
            </Link>
          ) : null}
        </div>
      ) : viewMode === 'table' ? (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sidebar text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="cursor-pointer border-t border-border hover:bg-white/5"
                  onClick={() => navigate(`/employees/${emp.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs">{emp.employee_code}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{emp.name}</td>
                  <td className="px-4 py-3 text-muted">{emp.employee_type || '—'}</td>
                  <td className="px-4 py-3 text-muted">{emp.current_department || '—'}</td>
                  <td className="px-4 py-3 text-muted">{emp.current_area || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs capitalize">
                      {emp.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {canEditEmployees ? (
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          className="rounded p-1.5 text-muted hover:bg-white/10 hover:text-foreground"
                          onClick={() => navigate(`/employees/${emp.id}/edit`)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1.5 text-muted hover:bg-danger/20 hover:text-danger"
                          onClick={() => handleDelete(emp)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {employees.map((emp) => (
            <article
              key={emp.id}
              className="cursor-pointer rounded-lg border border-border bg-card p-4 hover:border-accent/50"
              onClick={() => navigate(`/employees/${emp.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-xs text-muted">{emp.employee_code}</div>
                  <h2 className="mt-1 font-semibold text-foreground">{emp.name}</h2>
                </div>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs capitalize">
                  {emp.status || 'active'}
                </span>
              </div>
              <dl className="mt-4 space-y-1 text-xs text-muted">
                <div className="flex justify-between">
                  <dt>Type</dt>
                  <dd className="text-foreground">{emp.employee_type || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Department</dt>
                  <dd className="text-foreground">{emp.current_department || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Site</dt>
                  <dd className="text-foreground">{emp.current_area || '—'}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
