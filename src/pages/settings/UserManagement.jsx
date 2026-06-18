import { useEffect, useState } from 'react'
import { Plus, Shield, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@/lib/notify.js'
import {
  ACCESS_LABELS,
  MODULE_LABELS,
  defaultPermissions,
} from '@/lib/permissions.js'
import PasswordInput from '@/components/PasswordInput.jsx'

const MODULES = ['employee_data', 'payroll_processing', 'accounting']

function PermissionMatrix({ value, onChange, disabled }) {
  return (
    <div className="space-y-3">
      {MODULES.map((mod) => (
        <div key={mod} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
          <span className="text-sm text-foreground">{MODULE_LABELS[mod]}</span>
          <select
            value={value[mod] ?? 'none'}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, [mod]: e.target.value })}
            className="rounded-md border border-border bg-sidebar px-3 py-2 text-sm"
          >
            <option value="none">{ACCESS_LABELS.none}</option>
            <option value="read">{ACCESS_LABELS.read}</option>
            <option value="write">{ACCESS_LABELS.write}</option>
          </select>
        </div>
      ))}
    </div>
  )
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    username: '',
    password: '',
    permissions: defaultPermissions(),
  })
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const list = await window.electron.listUsers()
      setUsers(list)
    } catch (e) {
      toastError(e, 'Could not load users.')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const list = await window.electron.listUsers()
        if (!cancelled) setUsers(list)
      } catch (e) {
        if (!cancelled) {
          toastError(e, 'Could not load users.')
          setUsers([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const resetForm = () => {
    setForm({ username: '', password: '', permissions: defaultPermissions() })
    setEditing(null)
    setShowForm(false)
  }

  const startEdit = (user) => {
    setEditing(user)
    setForm({
      username: user.username,
      password: '',
      permissions: { ...defaultPermissions(), ...user.permissions },
    })
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (editing) {
        const payload = { permissions: form.permissions }
        if (form.password.trim()) payload.password = form.password
        await window.electron.updateUser(editing.id, payload)
        toast.success('User updated')
      } else {
        await window.electron.createUser({
          username: form.username,
          password: form.password,
          permissions: form.permissions,
        })
        toast.success('User created')
      }
      resetForm()
      load()
    } catch (err) {
      toastError(err, 'Could not save user.')
    } finally {
      setBusy(false)
    }
  }

  const deactivate = async (user) => {
    if (!window.confirm(`Deactivate ${user.username}? They will not be able to sign in.`)) return
    try {
      await window.electron.deactivateUser(user.id)
      toast.success('User deactivated')
      load()
    } catch (err) {
      toastError(err, 'Could not deactivate this user.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">User accounts</h2>
          <p className="mt-1 text-sm text-muted">
            Create staff logins with module-level read/write access. Only super administrators
            can manage users and open Settings.
          </p>
        </div>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2"
          >
            <Plus className="h-4 w-4" />
            Add user
          </button>
        ) : null}
      </div>

      {showForm ? (
        <form
          onSubmit={submit}
          className="space-y-4 rounded-lg border border-border bg-card p-5"
        >
          <h3 className="font-medium text-foreground">
            {editing ? `Edit ${editing.username}` : 'New user'}
          </h3>

          {!editing ? (
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Username</span>
              <input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
                minLength={3}
                maxLength={32}
                pattern="[a-zA-Z0-9._-]+"
                className="rounded-md border border-border bg-sidebar px-3 py-2"
                placeholder="Ahmad"
              />
            </label>
          ) : null}

          <label className="grid gap-1 text-sm">
            <span className="text-muted">
              {editing ? 'New password (leave blank to keep current)' : 'Password'}
            </span>
            <PasswordInput
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required={!editing}
              minLength={8}
              autoComplete="new-password"
            />
            <span className="text-xs text-muted">Minimum 8 characters with letters and numbers</span>
          </label>

          <div>
            <div className="mb-2 text-sm font-medium text-foreground">Module permissions</div>
            <PermissionMatrix
              value={form.permissions}
              onChange={(permissions) => setForm((f) => ({ ...f, permissions }))}
              disabled={editing?.isSuperAdmin}
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary px-4 py-2 disabled:opacity-60">
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create user'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading users…</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sidebar text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Employee data</th>
                <th className="px-4 py-3">Payroll</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{user.username}</td>
                  <td className="px-4 py-3">
                    {user.isSuperAdmin ? (
                      <span className="inline-flex items-center gap-1 text-xs text-accent">
                        <Shield className="h-3.5 w-3.5" />
                        Super admin
                      </span>
                    ) : (
                      'Staff'
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {ACCESS_LABELS[user.permissions?.employee_data ?? 'none']}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {ACCESS_LABELS[user.permissions?.payroll_processing ?? 'none']}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        user.isActive ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.isSuperAdmin ? (
                      <span className="text-xs text-muted">Protected</span>
                    ) : user.isActive ? (
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(user)}
                          className="rounded px-2 py-1 text-xs hover:bg-white/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deactivate(user)}
                          className="rounded p-1 text-danger hover:bg-danger/20"
                          aria-label="Deactivate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
