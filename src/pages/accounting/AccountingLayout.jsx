import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils.js'

const tabs = [
  { to: '/accounting/accounts', label: 'Chart of Accounts' },
  { to: '/accounting/vouchers', label: 'Vouchers' },
  { to: '/accounting/ledger', label: 'Ledger' },
  { to: '/accounting/trial-balance', label: 'Trial Balance' },
  { to: '/accounting/balance-sheet', label: 'Balance Sheet' },
]

export default function AccountingLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Accounting</h1>
        <p className="mt-1 text-sm text-muted">
          Double-entry bookkeeping — chart of accounts, vouchers, ledgers & financial statements
        </p>
      </div>

      <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-white'
                  : 'text-muted hover:bg-white/5 hover:text-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
