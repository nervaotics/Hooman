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
              <Route path="organization" element={<OrganizationPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route
                path="leaves"
                element={
                  <ModulePlaceholder
                    title="Leaves"
                    description="Leave requests and approvals map to leave_requests in MySQL."
                  />
                }
              />
            </Route>

            <Route element={<RequireModuleAccess module="employee_data" level="write" />}>
              <Route path="employees/new" element={<EmployeeForm />} />
              <Route path="employees/:id/edit" element={<EmployeeForm />} />
            </Route>

            <Route element={<RequireModuleAccess module="payroll_processing" />}>
              <Route
                path="payroll"
                element={
                  <ModulePlaceholder
                    title="Payroll"
                    description="Payroll runs and slips tables are ready; computation rules come next."
                  />
                }
              />
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
