import { useCallback, useEffect, useState } from 'react'
import { toastError } from '@/lib/notify.js'
import { formatAmount, formatAmountOrDash, todayLocal } from '@/lib/accounting.js'

export default function LedgerPage() {
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState(todayLocal())
  const [ledger, setLedger] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const rows = await window.electron.getAccountingAccounts({ activeOnly: true })
        if (!cancelled) setAccounts(rows || [])
      } catch {
        if (!cancelled) setAccounts([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async () => {
    if (!accountId) {
      setLedger(null)
      return
    }
    setLoading(true)
    try {
      const data = await window.electron.getAccountingLedger({
        accountId: Number(accountId),
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      })
      setLedger(data)
    } catch (e) {
      toastError(e, 'Could not load ledger.')
      setLedger(null)
    } finally {
      setLoading(false)
    }
  }, [accountId, fromDate, toDate])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-[240px] flex-1 gap-1 text-xs text-muted">
          Account
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">Select account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
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
      </div>

      {!accountId ? (
        <p className="py-12 text-center text-sm text-muted">Select an account to view its ledger.</p>
      ) : loading ? (
        <p className="py-12 text-center text-sm text-muted">Loading ledger…</p>
      ) : ledger ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted">Opening balance</p>
              <p className="mt-1 font-mono text-lg">{formatAmount(ledger.opening_balance)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted">Closing balance</p>
              <p className="mt-1 font-mono text-lg">{formatAmount(ledger.closing_balance)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted">Account</p>
              <p className="mt-1 font-medium">
                {ledger.account.code} — {ledger.account.name}
              </p>
            </div>
          </div>

          {ledger.entries.length === 0 ? (
            <p className="text-center text-sm text-muted">No transactions in this period.</p>
          ) : (
            <div className="overflow-auto rounded-lg border border-border">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-sidebar text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Voucher</th>
                    <th className="px-4 py-3">Narration</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.entries.map((row) => (
                    <tr key={row.id} className="border-t border-border hover:bg-white/5">
                      <td className="px-4 py-3 font-mono text-xs">{row.voucher_date}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.voucher_no}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-muted">{row.narration || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {formatAmountOrDash(row.debit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {formatAmountOrDash(row.credit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-medium">
                        {formatAmount(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
