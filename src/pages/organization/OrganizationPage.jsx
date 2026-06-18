import { useCallback, useEffect, useState } from 'react'
import { Building2, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@/lib/notify.js'
import { useAuthStore } from '@/store/authStore.js'
import { isSuperAdmin } from '@/lib/permissions.js'

const emptyForm = () => ({ name: '', code: '' })

function EntityPanel({
  title,
  description,
  rows,
  loading,
  canEdit,
  onCreate,
  onUpdate,
  onDelete,
  nameLabel,
  codeLabel,
}) {
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setForm(emptyForm())
    setEditing(null)
  }

  const startEdit = (row) => {
    setEditing(row)
    setForm({ name: row.name || '', code: row.code || '' })
  }

  const submit = async (e) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      toast.error('Name is required')
      return
    }
    setBusy(true)
    try {
      const payload = { name, code: form.code.trim() || null }
      if (editing) {
        await onUpdate(editing.id, payload)
        toast.success(`${title} updated`)
      } else {
        await onCreate(payload)
        toast.success(`${title} added`)
      }
      reset()
    } catch (err) {
      toastError(err, 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (row) => {
    if (!window.confirm(`Remove "${row.name}"?`)) return
    try {
      await onDelete(row.id)
      toast.success(`${title} removed`)
      if (editing?.id === row.id) reset()
    } catch (err) {
      toastError(err, 'Could not delete.')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{description}</p>

      {canEdit ? (
        <form
          onSubmit={submit}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
        >
          <label className="grid min-w-[180px] flex-1 gap-1 text-sm">
            <span className="text-muted">{nameLabel}</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-md border border-border bg-sidebar px-3 py-2 text-foreground outline-none focus:border-accent"
              placeholder="e.g. Production"
              required
            />
          </label>
          <label className="grid min-w-[120px] gap-1 text-sm">
            <span className="text-muted">{codeLabel} (optional)</span>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              className="rounded-md border border-border bg-sidebar px-3 py-2 text-foreground outline-none focus:border-accent"
              placeholder="e.g. PROD"
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary inline-flex items-center gap-2 px-4 py-2">
              <Plus className="h-4 w-4" />
              {busy ? 'Saving…' : editing ? 'Save' : 'Add'}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-white/5"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="text-xs text-muted">Read-only — you cannot add or edit {title.toLowerCase()}.</p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted">
          No {title.toLowerCase()} yet.
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sidebar text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Code</th>
                {canEdit ? <th className="px-4 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{row.code || '—'}</td>
                  {canEdit ? (
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="rounded p-1.5 text-muted hover:bg-white/10 hover:text-foreground"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(row)}
                          className="rounded p-1.5 text-muted hover:bg-danger/20 hover:text-danger"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function OrganizationPage() {
  const user = useAuthStore((s) => s.user)
  const canEdit = isSuperAdmin(user)
  const [tab, setTab] = useState('departments')
  const [departments, setDepartments] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [depts, sites] = await Promise.all([
        window.electron.getDepartments(),
        window.electron.getAreas(),
      ])
      setDepartments(depts)
      setAreas(sites)
    } catch (e) {
      toastError(e, 'Could not load departments and sites.')
      setDepartments([])
      setAreas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      try {
        const [depts, sites] = await Promise.all([
          window.electron.getDepartments(),
          window.electron.getAreas(),
        ])
        if (cancelled) return
        setDepartments(depts)
        setAreas(sites)
      } catch (e) {
        if (cancelled) return
        toastError(e, 'Could not load departments and sites.')
        setDepartments([])
        setAreas([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  const tabs = [
    { id: 'departments', label: 'Departments', icon: Building2, count: departments.length },
    { id: 'sites', label: 'Sites', icon: MapPin, count: areas.length },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Departments & Sites</h1>
        <p className="mt-1 text-sm text-muted">
          Manage organizational departments and work sites used in employee postings and bulk import.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted hover:bg-white/5 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className="rounded-full bg-sidebar px-1.5 py-0.5 text-xs">{t.count}</span>
            </button>
          )
        })}
      </div>

      {tab === 'departments' ? (
        <EntityPanel
          title="Department"
          description="Departments group employees (e.g. HR, Production, Finance)."
          rows={departments}
          loading={loading}
          canEdit={canEdit}
          nameLabel="Department name"
          codeLabel="Code"
          onCreate={(data) => window.electron.createDepartment(data).then(load)}
          onUpdate={(id, data) => window.electron.updateDepartment(id, data).then(load)}
          onDelete={(id) => window.electron.deleteDepartment(id).then(load)}
        />
      ) : (
        <EntityPanel
          title="Site"
          description="Sites are physical locations or projects (e.g. Block-22, Factory Gate)."
          rows={areas}
          loading={loading}
          canEdit={canEdit}
          nameLabel="Site name"
          codeLabel="Code"
          onCreate={(data) => window.electron.createArea(data).then(load)}
          onUpdate={(id, data) => window.electron.updateArea(id, data).then(load)}
          onDelete={(id) => window.electron.deleteArea(id).then(load)}
        />
      )}
    </div>
  )
}
