/// <reference types="vite/client" />

interface ElectronUser {
  id: number
  username: string
  role: string
  employeeId: number | null
  isSuperAdmin?: boolean
  permissions?: Record<string, string>
}

interface ElectronApi {
  apiVersion: number
  customTitleBar: boolean
  titleBarHeight: number

  setAuthToken: (token: string | null) => void

  bootstrapStatus: () => Promise<{
    appRole?: string
    needsRoleSetup?: boolean
    hasDbConfig: boolean
    dbReachable: boolean
    hasUsers: boolean
    needsAdminSetup: boolean
    needsDatabaseSetup?: boolean
    error?: string
    migrationError?: string
  }>
  getSetupState: () => Promise<Record<string, unknown>>
  setupAsServer: () => Promise<Record<string, unknown>>
  setupAsClient: (payload?: Record<string, unknown>) => Promise<Record<string, unknown>>
  testServerConnection: (payload?: Record<string, unknown>) => Promise<Record<string, unknown>>

  login: (credentials: { username: string; password: string }) => Promise<{
    token: string
    user: ElectronUser
  }>
  logout: () => Promise<{ ok: boolean }>
  createFirstAdmin: (data: { username: string; password: string }) => Promise<{ ok: boolean }>
  session: () => Promise<{ user: ElectronUser | null }>

  getEmployees: (filters?: Record<string, unknown>) => Promise<unknown[]>
  getEmployee: (id: number) => Promise<Record<string, unknown>>
  createEmployee: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateEmployee: (id: number, data: Record<string, unknown>) => Promise<Record<string, unknown>>
  deleteEmployee: (id: number) => Promise<{ ok: boolean }>
  checkEmployeeCnic: (cnic_number: string, excludeId?: number) => Promise<Record<string, unknown>>
  uploadEmployeePhoto: (base64: string, filename: string) => Promise<Record<string, unknown>>
  bulkImportEmployees: (csv: string) => Promise<Record<string, unknown>>
  getBulkImportTemplate: () => Promise<{ csv: string }>

  getDepartments: () => Promise<unknown[]>
  createDepartment: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateDepartment: (id: number, data: Record<string, unknown>) => Promise<Record<string, unknown>>
  deleteDepartment: (id: number) => Promise<{ ok: boolean }>
  getAreas: () => Promise<unknown[]>
  createArea: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateArea: (id: number, data: Record<string, unknown>) => Promise<Record<string, unknown>>
  deleteArea: (id: number) => Promise<{ ok: boolean }>

  getAttendanceLogs: (filters?: Record<string, unknown>) => Promise<unknown[]>
  getDailyAttendance: (filters?: Record<string, unknown>) => Promise<Record<string, unknown>>
  syncAttendance: (filters?: { fromDate?: string; toDate?: string }) => Promise<Record<string, unknown>>
  overrideAttendance: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  getDeviceStatus: () => Promise<
    Array<{
      id: string
      name: string
      ip: string
      port: number
      enabled: boolean
      status: string
      lastMessage: string | null
      lastCount: number | null
    }>
  >

  getDashboardStats: () => Promise<Record<string, unknown>>

  getLeaveRequests: (filters?: Record<string, unknown>) => Promise<unknown[]>
  applyLeave: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  approveLeave: (id: number) => Promise<Record<string, unknown>>
  rejectLeave: (id: number, reason?: string) => Promise<Record<string, unknown>>
  getLeaveBalances: (employeeId: number) => Promise<Record<string, unknown>>

  getPayrollPeriods: () => Promise<unknown[]>
  getPayrollPeriod: (id: number) => Promise<{ period: Record<string, unknown>; records: unknown[] }>
  createPayrollPeriod: (data: Record<string, unknown>) => Promise<{ period: Record<string, unknown> }>
  updatePayrollPeriod: (id: number, data: Record<string, unknown>) => Promise<{ period: Record<string, unknown> }>
  deletePayrollPeriod: (id: number) => Promise<{ ok: boolean }>
  processPayrollPeriod: (id: number) => Promise<{
    processed: number
    skipped: number
    totalEmployees: number
    records?: unknown[]
  }>
  updatePayrollRecord: (
    id: number,
    data: { arrears?: number; deduction_amount?: number },
  ) => Promise<{ ok: boolean }>
  approvePayrollPeriod: (id: number) => Promise<{ ok: boolean }>
  revertPayrollPeriod: (id: number) => Promise<{ ok: boolean }>
  getPayrollStatutorySettings: () => Promise<Record<string, unknown>>
  savePayrollStatutorySettings: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  getPayrollPeriodAttendance: (
    periodId: number,
    employeeIds: number[],
  ) => Promise<{ rows: unknown[] }>
  getPayrollHistory: () => Promise<unknown[]>

  getJobs: () => Promise<unknown[]>
  createJob: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  getApplicants: (jobId: number) => Promise<Record<string, unknown>>
  updateApplicantStatus: (id: number, status: string) => Promise<Record<string, unknown>>

  getDbConfig: () => Promise<{ merged: Record<string, unknown>; saved: unknown }>
  saveDbConfig: (config: Record<string, unknown>) => Promise<{ ok: boolean }>
  getDevices: () => Promise<unknown[]>
  saveDevices: (devices: unknown[]) => Promise<{ ok: boolean }>
  testDbConnection: (config: Record<string, unknown>) => Promise<{ ok: boolean }>

  listUsers: () => Promise<unknown[]>
  createUser: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateUser: (id: number, data: Record<string, unknown>) => Promise<Record<string, unknown>>
  deactivateUser: (id: number) => Promise<{ ok: boolean }>

  onUpdateReady: (cb: () => void) => () => void
  onUpdateStatus: (cb: (payload: Record<string, unknown>) => void) => () => void
  getUpdaterSettings: () => Promise<Record<string, unknown>>
  saveUpdaterSettings: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>
  checkUpdatesNow: () => Promise<Record<string, unknown>>
  installUpdate: () => Promise<{ ok: boolean }>
}

interface Window {
  electron?: ElectronApi
}
