import { useCallback, useEffect, useState } from 'react'
import { toastError } from '@/lib/notify.js'
import { ACCOUNT_TYPE_LABELS, formatAmount, formatAmountOrDash, todayLocal } from '@/lib/accounting.js'

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = useState(todayLocal())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.electron.getTrialBalance(asOfDate)
      setReport(data)
    } catch (e) {
      toastError(e, 'Could not load trial balance.')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [asOfDate])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-4">
      <label className="inline-grid gap-1 text-xs text-muted">
        As of date
        <input
          type="date"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
      </label>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted">Loading trial balance…</p>
      ) : !report?.rows?.length ? (
        <p className="py-12 text-center text-sm text-muted">No balances to show.</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sidebar text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Debit (Dr.)</th>
                <th className="px-4 py-3 text-right">Credit (Cr.)</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.account_id} className="border-t border-border hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {ACCOUNT_TYPE_LABELS[row.account_type]}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {formatAmountOrDash(row.debit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {formatAmountOrDash(row.credit)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-sidebar font-semibold">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right">
                  Totals
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm">
                  {formatAmount(report.totalDebit)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm">
                  {formatAmount(report.totalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="border-t border-border px-4 py-3 text-xs text-muted">
            {report.balanced
              ? 'Trial balance is balanced (total debits = total credits).'
              : 'Trial balance is out of balance — review vouchers.'}
          </p>
        </div>
      )}
    </div>
  )
}
