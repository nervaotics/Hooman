const { contextBridge, ipcRenderer } = require('electron')

let authToken = null

function withAuth(payload = {}) {
  if (authToken) return { ...payload, __token: authToken }
  return { ...payload }
}

contextBridge.exposeInMainWorld('electron', {
  /** Bump when preload API surface changes (helps detect stale Electron sessions). */
  apiVersion: 3,

  customTitleBar: process.platform === 'win32',
  titleBarHeight: 36,

  setAuthToken: (token) => {
    authToken = token || null
  },

  bootstrapStatus: () => ipcRenderer.invoke('bootstrap:status'),
  getSetupState: () => ipcRenderer.invoke('setup:getState'),
  setupAsServer: () => ipcRenderer.invoke('setup:asServer'),
  setupAsClient: (payload) => ipcRenderer.invoke('setup:asClient', payload || {}),
  testServerConnection: (payload) =>
    ipcRenderer.invoke('setup:testServerConnection', payload || {}),

  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  logout: () => ipcRenderer.invoke('auth:logout'),
  createFirstAdmin: (data) => ipcRenderer.invoke('auth:createFirstAdmin', data),
  session: () => ipcRenderer.invoke('auth:session', withAuth({})),

  getEmployees: (filters) =>
    ipcRenderer.invoke('employees:getAll', withAuth(filters || {})),
  getEmployee: (id) => ipcRenderer.invoke('employees:getOne', withAuth({ id })),
  createEmployee: (data) =>
    ipcRenderer.invoke('employees:create', withAuth(data || {})),
  updateEmployee: (id, data) =>
    ipcRenderer.invoke('employees:update', withAuth({ id, ...(data || {}) })),
  deleteEmployee: (id) =>
    ipcRenderer.invoke('employees:delete', withAuth({ id })),
  checkEmployeeCnic: (cnic_number, excludeId) =>
    ipcRenderer.invoke('employees:checkCnic', withAuth({ cnic_number, excludeId })),
  uploadEmployeePhoto: (base64, filename) =>
    ipcRenderer.invoke('employees:uploadPhoto', withAuth({ base64, filename })),

  bulkImportEmployees: (csv) =>
    ipcRenderer.invoke('employees:bulkImport', withAuth({ csv })),
  getBulkImportTemplate: () =>
    ipcRenderer.invoke('employees:bulkImportTemplate', withAuth({})),

  getDepartments: () => ipcRenderer.invoke('departments:getAll', withAuth({})),
  createDepartment: (data) =>
    ipcRenderer.invoke('departments:create', withAuth(data || {})),
  updateDepartment: (id, data) =>
    ipcRenderer.invoke('departments:update', withAuth({ id, ...(data || {}) })),
  deleteDepartment: (id) =>
    ipcRenderer.invoke('departments:delete', withAuth({ id })),
  getAreas: () => ipcRenderer.invoke('areas:getAll', withAuth({})),
  createArea: (data) =>
    ipcRenderer.invoke('areas:create', withAuth(data || {})),
  updateArea: (id, data) =>
    ipcRenderer.invoke('areas:update', withAuth({ id, ...(data || {}) })),
  deleteArea: (id) =>
    ipcRenderer.invoke('areas:delete', withAuth({ id })),

  getAttendanceLogs: (filters) =>
    ipcRenderer.invoke('attendance:getLogs', withAuth(filters || {})),
  getDailyAttendance: (filters) =>
    ipcRenderer.invoke('attendance:getDaily', withAuth(filters || {})),
  syncAttendance: () => ipcRenderer.invoke('attendance:sync', withAuth({})),
  overrideAttendance: (data) =>
    ipcRenderer.invoke('attendance:override', withAuth(data || {})),
  getDeviceStatus: () =>
    ipcRenderer.invoke('attendance:deviceStatus', withAuth({})),

  getDashboardStats: () => ipcRenderer.invoke('dashboard:stats', withAuth({})),

  getLeaveRequests: (filters) =>
    ipcRenderer.invoke('leaves:getAll', withAuth(filters || {})),
  applyLeave: (data) => ipcRenderer.invoke('leaves:apply', withAuth(data || {})),
  approveLeave: (id) => ipcRenderer.invoke('leaves:approve', withAuth({ id })),
  rejectLeave: (id, reason) =>
    ipcRenderer.invoke('leaves:reject', withAuth({ id, reason })),
  getLeaveBalances: (employeeId) =>
    ipcRenderer.invoke('leaves:balances', withAuth({ employeeId })),

  runPayroll: (period) =>
    ipcRenderer.invoke('payroll:run', withAuth({ period })),
  getPayrollHistory: (filters) =>
    ipcRenderer.invoke('payroll:history', withAuth(filters || {})),
  getSalarySlip: (id) => ipcRenderer.invoke('payroll:slip', withAuth({ id })),

  getJobs: () => ipcRenderer.invoke('recruitment:getJobs', withAuth({})),
  createJob: (data) =>
    ipcRenderer.invoke('recruitment:createJob', withAuth(data || {})),
  getApplicants: (jobId) =>
    ipcRenderer.invoke('recruitment:getApplicants', withAuth({ jobId })),
  updateApplicantStatus: (id, status) =>
    ipcRenderer.invoke('recruitment:updateApplicant', withAuth({ id, status })),

  getDbConfig: () => ipcRenderer.invoke('settings:getDb', withAuth({})),
  saveDbConfig: (config) => ipcRenderer.invoke('settings:saveDb', withAuth(config || {})),
  getDevices: () => ipcRenderer.invoke('settings:getDevices', withAuth({})),
  saveDevices: (devices) =>
    ipcRenderer.invoke('settings:saveDevices', withAuth({ devices: devices || [] })),
  testDbConnection: (config) =>
    ipcRenderer.invoke('settings:testDb', config ? withAuth(config) : {}),

  listUsers: () => ipcRenderer.invoke('users:list', withAuth({})),
  createUser: (data) => ipcRenderer.invoke('users:create', withAuth(data || {})),
  updateUser: (id, data) =>
    ipcRenderer.invoke('users:update', withAuth({ id, ...(data || {}) })),
  deactivateUser: (id) => ipcRenderer.invoke('users:deactivate', withAuth({ id })),

  onUpdateReady: (cb) => {
    const listener = () => cb()
    ipcRenderer.on('update-ready', listener)
    return () => ipcRenderer.removeListener('update-ready', listener)
  },
  installUpdate: () => ipcRenderer.invoke('updater:install'),
})
