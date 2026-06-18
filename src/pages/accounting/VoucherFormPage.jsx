import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@/lib/notify.js'
import { useAuthStore } from '@/store/authStore.js'
import { canWrite } from '@/lib/permissions.js'
import { VOUCHER_TYPE_LABELS, formatAmount, todayLocal } from '@/lib/accounting.js'

const emptyLine = () => ({ account_id: '', debit: '', credit: '', line_narration: '' })

export default function VoucherFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const canEdit = canWrite(user, 'accounting')
  const isView = Boolean(id)
  const defaultType = (searchParams.get('type') || 'JV').toUpperCase()

  useEffect(() => {
    if (!id && !canEdit) navigate('/accounting/vouchers', { replace: true })
  }, [id, canEdit, navigate])

  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(isView)
  const [busy, setBusy] = useState(false)
  const [voucher, setVoucher] = useState(null)
  const [form, setForm] = useState({
    voucher_type: defaultType,
    voucher_date: todayLocal(),
    narration: '',
    lines: [emptyLine(), emptyLine()],
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const accs = await window.electron.getAccountingAccounts({ activeOnly: true })
        if (!cancelled) setAccounts(accs || [])
      } catch {
        if (!cancelled) setAccounts([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!id) return undefined
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const v = await window.electron.getAccountingVoucher(Number(id))
        if (!cancelled) {
          setVoucher(v)
          setForm({
            voucher_type: v.voucher_type,
            voucher_date: v.voucher_date,
            narration: v.narration || '',
            lines: v.lines.map((l) => ({
              account_id: String(l.account_id),
              debit: l.debit ? String(l.debit) : '',
              credit: l.credit ? String(l.credit) : '',
              line_narration: l.line_narration || '',
            })),
          })
        }
      } catch (e) {
        if (!cancelled) toastError(e, 'Could not load voucher.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const totals = useMemo(() => {
    let debit = 0
    let credit = 0
    for (const line of form.lines) {
      debit += Number(line.debit) || 0
      credit += Number(line.credit) || 0
    }
    return {
      debit: Math.round(debit * 100) / 100,
      credit: Math.round(credit * 100) / 100,
      balanced: Math.round(debit * 100) === Math.round(credit * 100),
    }
  }, [form.lines])

  const updateLine = (index, patch) => {
    setForm((prev) => {
      const lines = [...prev.lines]
      lines[index] = { ...lines[index], ...patch }
      return { ...prev, lines }
    })
  }

  const addLine = () => setForm((prev) => ({ ...prev, lines: [...prev.lines, emptyLine()] }))

  const removeLine = (index) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canEdit || isView) return
    setBusy(true)
    try {
      const lines = form.lines.map((l) => ({
        account_id: Number(l.account_id),
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        line_narration: l.line_narration || undefined,
      }))
      const result = await window.electron.createAccountingVoucher({
        voucher_type: form.voucher_type,
        voucher_date: form.voucher_date,
        narration: form.narration,
        lines,
      })
      toast.success(`Voucher ${result.voucher_no} saved`)
      navigate(`/accounting/vouchers/${result.id}`)
    } catch (err) {
      toastError(err, 'Could not save voucher.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-muted">Loading voucher…</p>
  }

  const title = isView
    ? voucher?.voucher_no || 'Voucher'
    : `New ${VOUCHER_TYPE_LABELS[form.voucher_type] || form.voucher_type}`

  return (
    <div className="space-y-4">
      <Link
        to="/accounting/vouchers"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to vouchers
      </Link>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {isView && voucher ? (
          <p className="mt-1 text-sm text-muted">
            {voucher.voucher_type_label} · {voucher.voucher_date} ·{' '}
            <span className="capitalize">{voucher.status}</span>
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Type</span>
              <select
                disabled={isView}
                value={form.voucher_type}
                onChange={(e) => setForm({ ...form, voucher_type: e.target.value })}
                className="rounded-md border border-border bg-sidebar px-3 py-2 disabled:opacity-60"
              >
                {Object.entries(VOUCHER_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted">Date</span>
              <input
                type="date"
                required
                disabled={isView}
                value={form.voucher_date}
                onChange={(e) => setForm({ ...form, voucher_date: e.target.value })}
                className="rounded-md border border-border bg-sidebar px-3 py-2 disabled:opacity-60"
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-muted">Narration</span>
            <textarea
              rows={2}
              disabled={isView}
              value={form.narration}
              onChange={(e) => setForm({ ...form, narration: e.target.value })}
              className="rounded-md border border-border bg-sidebar px-3 py-2 disabled:opacity-60"
            />
          </label>

          <div className="overflow-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-sidebar text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2 text-right">Debit (Dr.)</th>
                  <th className="px-3 py-2 text-right">Credit (Cr.)</th>
                  <th className="px-3 py-2">Memo</th>
                  {!isView ? <th className="px-3 py-2 w-10" /> : null}
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, index) => (
                  <tr key={index} className="border-t border-border">
                    <td className="px-3 py-2">
                      {isView ? (
                        <span className="font-mono text-xs">
                          {voucher?.lines?.[index]?.account_code} —{' '}
                          {voucher?.lines?.[index]?.account_name}
                        </span>
                      ) : (
                        <select
                          required
                          value={line.account_id}
                          onChange={(e) => updateLine(index, { account_id: e.target.value })}
                          className="w-full min-w-[200px] rounded border border-border bg-sidebar px-2 py-1.5 text-sm"
                        >
                          <option value="">Select account…</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isView ? (
                        formatAmount(line.debit)
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit}
                          onChange={(e) =>
                            updateLine(index, { debit: e.target.value, credit: '' })
                          }
                          className="w-28 rounded border border-border bg-sidebar px-2 py-1.5 text-right text-sm"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isView ? (
                        formatAmount(line.credit)
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit}
                          onChange={(e) =>
                            updateLine(index, { credit: e.target.value, debit: '' })
                          }
                          className="w-28 rounded border border-border bg-sidebar px-2 py-1.5 text-right text-sm"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isView ? (
                        line.line_narration || '—'
                      ) : (
                        <input
                          value={line.line_narration}
                          onChange={(e) =>
                            updateLine(index, { line_narration: e.target.value })
                          }
                          className="w-full min-w-[120px] rounded border border-border bg-sidebar px-2 py-1.5 text-sm"
                        />
                      )}
                    </td>
                    {!isView ? (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled={form.lines.length <= 2}
                          onClick={() => removeLine(index)}
                          className="text-muted hover:text-danger disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-sidebar/50 font-mono text-xs">
                <tr>
                  <td className="px-3 py-2 text-right font-semibold">Totals</td>
                  <td className="px-3 py-2 text-right">{formatAmount(totals.debit)}</td>
                  <td className="px-3 py-2 text-right">{formatAmount(totals.credit)}</td>
                  <td colSpan={isView ? 1 : 2} className="px-3 py-2">
                    {!isView && !totals.balanced ? (
                      <span className="text-danger">Debits must equal credits</span>
                    ) : null}
                    {isView || totals.balanced ? (
                      <span className="text-success">Balanced</span>
                    ) : null}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {!isView ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add line
              </button>
              <button
                type="submit"
                disabled={busy || !totals.balanced}
                className="btn-primary px-6 py-2 disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Post voucher'}
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  )
}
