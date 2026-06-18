import { useCallback, useEffect, useState } from 'react'
import { toastError } from '@/lib/notify.js'
import { formatAmount, todayLocal } from '@/lib/accounting.js'

function SectionTable({ title, rows, totalLabel, total }) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <div className="border-b border-border bg-sidebar px-4 py-2 font-semibold">{title}</div>
      <table className="min-w-full text-left text-sm">
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-muted">No balances</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.account_id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-xs text-muted">{row.code}</td>
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2 text-right font-mono text-xs">{formatAmount(row.balance)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot className="border-t-2 border-border bg-sidebar/50">
          <tr>
            <td colSpan={2} className="px-4 py-2 text-right font-semibold">
              {totalLabel}
            </td>
            <td className="px-4 py-2 text-right font-mono font-semibold">{formatAmount(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(todayLocal())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.electron.getBalanceSheet(asOfDate)
      setReport(data)
    } catch (e) {
      toastError(e, 'Could not load balance sheet.')
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
        <p className="py-12 text-center text-sm text-muted">Loading balance sheet…</p>
      ) : !report ? (
        <p className="py-12 text-center text-sm text-muted">No data.</p>
      ) : (
        <div className="space-y-6">
          <SectionTable
            title="Assets"
            rows={report.assets}
            totalLabel="Total assets"
            total={report.totalAssets}
          />

          <SectionTable
            title="Liabilities"
            rows={report.liabilities}
            totalLabel="Total liabilities"
            total={report.totalLiabilities}
          />

          <SectionTable
            title="Equity"
            rows={report.equity}
            totalLabel="Equity accounts"
            total={report.equity.reduce((s, r) => s + r.balance, 0)}
          />

          <div className="rounded-lg border border-border bg-card p-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted">Net income (income − expense)</span>
              <span className="font-mono">{formatAmount(report.netIncome)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total equity (incl. net income)</span>
              <span className="font-mono">{formatAmount(report.totalEquity)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total liabilities & equity</span>
              <span className="font-mono">{formatAmount(report.totalLiabilitiesAndEquity)}</span>
            </div>
          </div>

          <p className="text-xs text-muted">
            {report.balanced
              ? 'Balance sheet equation holds: Assets = Liabilities + Equity.'
              : 'Balance sheet is out of balance — review opening balances and vouchers.'}
            {' '}
            (Income {formatAmount(report.totalIncome)}, Expense {formatAmount(report.totalExpense)})
          </p>
        </div>
      )}
    </div>
  )
}
