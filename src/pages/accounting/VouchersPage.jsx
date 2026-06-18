import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { toastError } from '@/lib/notify.js'
import { useAuthStore } from '@/store/authStore.js'
import { canWrite } from '@/lib/permissions.js'
import { VOUCHER_TYPE_LABELS, todayLocal } from '@/lib/accounting.js'

export default function VouchersPage() {
  const user = useAuthStore((s) => s.user)
  const canEdit = canWrite(user, 'accounting')
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState(todayLocal())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await window.electron.getAccountingVouchers({
        voucher_type: filterType || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      })
      setVouchers(rows || [])
    } catch (e) {
      toastError(e, 'Could not load vouchers.')
      setVouchers([])
    } finally {
      setLoading(false)
    }
  }, [filterType, fromDate, toDate])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const handleVoid = async (v) => {
    if (!canEdit) return
    if (!window.confirm(`Void voucher ${v.voucher_no}? This cannot be undone.`)) return
    try {
      await window.electron.voidAccountingVoucher(v.id)
      toast.success('Voucher voided')
      load()
    } catch (e) {
      toastError(e, 'Could not void voucher.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-muted">
          Type
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {Object.entries(VOUCHER_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted">
          From
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted">
          To
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        {canEdit ? (
          <div className="flex flex-wrap gap-2 pb-0.5">
            {['RV', 'PV', 'JV', 'PC'].map((type) => (
              <Link
                key={type}
                to={`/accounting/vouchers/new?type=${type}`}
                className="btn-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                {type}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted">Loading vouchers…</p>
      ) : vouchers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted">
          No vouchers found for this filter.
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sidebar text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">No.</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Narration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id} className="border-t border-border hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{v.voucher_no}</td>
                  <td className="px-4 py-3">{v.voucher_type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{v.voucher_date}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted">{v.narration || '—'}</td>
                  <td className="px-4 py-3 text-xs capitalize">{v.status}</td>
                  <td className="px-4 py-3 text-right text-xs">
                    <Link to={`/accounting/vouchers/${v.id}`} className="text-accent hover:underline">
                      View
                    </Link>
                    {canEdit && v.status === 'posted' ? (
                      <>
                        {' · '}
                        <button
                          type="button"
                          onClick={() => handleVoid(v)}
                          className="text-danger hover:underline"
                        >
                          Void
                        </button>
                      </>
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
