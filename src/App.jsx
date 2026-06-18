import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from '@/components/RequireAuth.jsx'
import { RequireSuperAdmin, RequireModuleAccess } from '@/components/RequireSuperAdmin.jsx'
import AppChrome from '@/layouts/AppChrome.jsx'
import AppLayout from '@/layouts/AppLayout.jsx'
import AuthLayout from '@/layouts/AuthLayout.jsx'
import DatabaseSetup from '@/pages/DatabaseSetup.jsx'
import FirstAdminSetup from '@/pages/FirstAdminSetup.jsx'
import Login from '@/pages/Login.jsx'
import Dashboard from '@/pages/Dashboard.jsx'
import EmployeeList from '@/pages/employees/EmployeeList.jsx'
import EmployeeForm from '@/pages/employees/EmployeeForm.jsx'
import EmployeeView from '@/pages/employees/EmployeeView.jsx'
import AttendancePage from '@/pages/attendance/AttendancePage.jsx'
import OrganizationPage from '@/pages/organization/OrganizationPage.jsx'
import ModulePlaceholder from '@/pages/ModulePlaceholder.jsx'
import PayrollPage from '@/pages/payroll/PayrollPage.jsx'
import PayrollProcessingPage from '@/pages/payroll/PayrollProcessingPage.jsx'
import AccountingLayout from '@/pages/accounting/AccountingLayout.jsx'
import ChartOfAccountsPage from '@/pages/accounting/ChartOfAccountsPage.jsx'
import VouchersPage from '@/pages/accounting/VouchersPage.jsx'
import VoucherFormPage from '@/pages/accounting/VoucherFormPage.jsx'
import LedgerPage from '@/pages/accounting/LedgerPage.jsx'
import TrialBalancePage from '@/pages/accounting/TrialBalancePage.jsx'
import BalanceSheetPage from '@/pages/accounting/BalanceSheetPage.jsx'
import SettingsPage from '@/pages/settings/SettingsPage.jsx'
import SettingsOverview from '@/pages/settings/SettingsOverview.jsx'
import DatabaseSettings from '@/pages/settings/DatabaseSettings.jsx'
import DeviceSettings from '@/pages/settings/DeviceSettings.jsx'
import UserManagement from '@/pages/settings/UserManagement.jsx'
import EmployeeBulkImport from '@/pages/settings/EmployeeBulkImport.jsx'
import RoleSelection from '@/pages/setup/RoleSelection.jsx'
import ClientServerIP from '@/pages/setup/ClientServerIP.jsx'

export default function App() {
  return (
    <HashRouter>
      <AppChrome>
      <Routes>
        <Route path="/setup/database" element={<DatabaseSetup />} />
        <Route element={<AuthLayout />}>
          <Route path="/setup/role" element={<RoleSelection />} />
          <Route path="/setup/client-ip" element={<ClientServerIP />} />
          <Route path="/setup/admin" element={<FirstAdminSetup />} />
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />

            <Route element={<RequireModuleAccess module="employee_data" />}>
              <Route path="recruitment" element={
                <ModulePlaceholder
                  title="Recruitment"
                  description="Job postings and applicant pipeline will connect to recruitment IPC handlers."
                />
              } />
              <Route path="employees" element={<EmployeeList />} />
              <Route path="employees/:id" element={<EmployeeView />} />
              <Route path="attendance" element={<AttendancePage />} />
            </Route>

            <Route element={<RequireModuleAccess module="employee_data" level="write" />}>
              <Route path="employees/new" element={<EmployeeForm />} />
              <Route path="employees/:id/edit" element={<EmployeeForm />} />
            </Route>

            <Route element={<RequireModuleAccess module="payroll_processing" />}>
              <Route path="payroll" element={<PayrollPage />} />
              <Route path="payroll/processing" element={<PayrollProcessingPage />} />
            </Route>

            <Route element={<RequireModuleAccess module="accounting" />}>
              <Route path="accounting" element={<AccountingLayout />}>
                <Route index element={<Navigate to="accounts" replace />} />
                <Route path="accounts" element={<ChartOfAccountsPage />} />
                <Route path="vouchers" element={<VouchersPage />} />
                <Route path="vouchers/new" element={<VoucherFormPage />} />
                <Route path="vouchers/:id" element={<VoucherFormPage />} />
                <Route path="ledger" element={<LedgerPage />} />
                <Route path="trial-balance" element={<TrialBalancePage />} />
                <Route path="balance-sheet" element={<BalanceSheetPage />} />
              </Route>
            </Route>

            <Route
              path="performance"
              element={
                <ModulePlaceholder title="Performance" description="KPIs and appraisals — planned." />
              }
            />
            <Route
              path="disciplinary"
              element={
                <ModulePlaceholder title="Disciplinary" description="Warnings and incidents — planned." />
              }
            />
            <Route
              path="offboarding"
              element={
                <ModulePlaceholder title="Offboarding" description="Exit checklist and settlement — planned." />
              }
            />

            <Route element={<RequireSuperAdmin />}>
              <Route path="organization" element={<OrganizationPage />} />
              <Route path="settings" element={<SettingsPage />}>
                <Route index element={<SettingsOverview />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="bulk-import" element={<EmployeeBulkImport />} />
                <Route path="database" element={<DatabaseSettings />} />
                <Route path="devices" element={<DeviceSettings />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AppChrome>
    </HashRouter>
  )
}
