import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@/lib/notify.js'
import { useAuthStore } from '@/store/authStore.js'
import { canWrite } from '@/lib/permissions.js'
import { ACCOUNT_TYPE_LABELS, formatAmount } from '@/lib/accounting.js'

const TYPE_ORDER = ['asset', 'liability', 'equity', 'income', 'expense']

const emptyForm = {
  code: '',
  name: '',
  account_type: 'asset',
  opening_balance: '0',
  description: '',
}

export default function ChartOfAccountsPage() {
  const user = useAuthStore((s) => s.user)
  const canEdit = canWrite(user, 'accounting')
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [filterType, setFilterType] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await window.electron.getAccountingAccounts({ activeOnly: false })
      setAccounts(rows || [])
    } catch (e) {
      toastError(e, 'Could not load accounts.')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [load])

  const grouped = useMemo(() => {
    const filtered = filterType
      ? accounts.filter((a) => a.account_type === filterType)
      : accounts
    const map = new Map(TYPE_ORDER.map((t) => [t, []]))
    for (const acc of filtered) {
      if (!map.has(acc.account_type)) map.set(acc.account_type, [])
      map.get(acc.account_type).push(acc)
    }
    return TYPE_ORDER.map((type) => ({ type, rows: map.get(type) || [] })).filter(
      (g) => g.rows.length > 0,
    )
  }, [accounts, filterType])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (acc) => {
    setEditing(acc)
    setForm({
      code: acc.code,
      name: acc.name,
      account_type: acc.account_type,
      opening_balance: String(acc.opening_balance ?? 0),
      description: acc.description || '',
      is_active: acc.is_active,
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setBusy(true)
    try {
      const payload = {
        ...form,
        opening_balance: Number(form.opening_balance) || 0,
      }
      if (editing) {
        await window.electron.updateAccountingAccount(editing.id, payload)
        toast.success('Account updated')
      } else {
        await window.electron.createAccountingAccount(payload)
        toast.success('Account created')
      }
      setShowForm(false)
      await load()
    } catch (err) {
      toastError(err, 'Could not save account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="">All types</option>
          {TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {canEdit ? (
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            New account
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted">Loading accounts…</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ type, rows }) => (
            <div key={type} className="overflow-auto rounded-lg border border-border">
              <div className="border-b border-border bg-sidebar px-4 py-2 text-sm font-semibold text-foreground">
                {ACCOUNT_TYPE_LABELS[type]}
              </div>
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3 text-right">Opening balance</th>
                    <th className="px-4 py-3">Status</th>
                    {canEdit ? <th className="px-4 py-3" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((acc) => (
                    <tr key={acc.id} className="border-t border-border hover:bg-white/5">
                      <td className="px-4 py-3 font-mono text-xs">{acc.code}</td>
                      <td className="px-4 py-3 font-medium">{acc.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {formatAmount(acc.opening_balance)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {acc.is_active ? 'Active' : 'Inactive'}
                      </td>
                      {canEdit ? (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(acc)}
                            className="text-xs text-accent hover:underline"
                          >
                            Edit
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">{editing ? 'Edit account' : 'New account'}</h2>
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Code</span>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="rounded-md border border-border bg-sidebar px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-md border border-border bg-sidebar px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Type</span>
              <select
                value={form.account_type}
                onChange={(e) => setForm({ ...form, account_type: e.target.value })}
                className="rounded-md border border-border bg-sidebar px-3 py-2"
              >
                {TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Opening balance</span>
              <input
                type="number"
                step="0.01"
                value={form.opening_balance}
                onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                className="rounded-md border border-border bg-sidebar px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Description</span>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-md border border-border bg-sidebar px-3 py-2"
              />
            </label>
            {editing ? (
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={form.is_active !== false}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Active
              </label>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
