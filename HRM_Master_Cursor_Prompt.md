# 🧠 MASTER CURSOR PROMPT — HRM Desktop App (Electron + React + MySQL)
> Paste this entire prompt into Cursor AI's composer to scaffold the full project.

---

## 📌 PROJECT OVERVIEW

You are building a **full-featured HRM (Human Resource Management) desktop application** for Windows. It must:

- Be installable as a native Windows `.exe`
- Auto-update silently via **GitHub Releases** (like WhatsApp Desktop / Cursor)
- Run locally on **3–10 office machines** connected to the same LAN
- Pull attendance logs from **ZKTeco UFace 800** biometric machines across multiple subnets
- Connect to a **MySQL database** (hosted flexibly — either on a central LAN server via XAMPP, or locally per machine — configurable via `.env`)
- Cover the **full employee lifecycle: Hiring → Onboarding → Attendance → Payroll → Performance → Offboarding**

---

## 🧱 TECH STACK

| Layer | Technology |
|---|---|
| Desktop Shell | Electron 28+ |
| Auto Updater | electron-updater + electron-builder |
| Frontend | React 18 + Vite |
| UI Components | shadcn/ui + Tailwind CSS v3 |
| Icons | Lucide React |
| State Management | Zustand |
| Backend (IPC) | Node.js inside Electron main process |
| Database | MySQL via XAMPP (mysql2 + Knex.js) |
| Attendance Pull | zklib (ZKTeco SDK for Node.js) |
| Scheduler | node-cron |
| Auth | JWT (jsonwebtoken) stored in electron-store |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Notifications | electron's native Notification API |

---

## 🗂️ PROJECT STRUCTURE TO SCAFFOLD

```
hrm-desktop/
├── electron/
│   ├── main.js                  # Electron main process entry
│   ├── preload.js               # Context bridge (IPC exposure)
│   ├── updater.js               # electron-updater auto-update logic
│   ├── zkteco/
│   │   ├── poller.js            # ZKTeco device poller (node-cron)
│   │   └── devices.js           # Device registry (IPs, ports, subnets)
│   ├── ipc/
│   │   ├── auth.ipc.js          # Login / JWT / session handlers
│   │   ├── employees.ipc.js     # Employee CRUD
│   │   ├── attendance.ipc.js    # Attendance fetch & override
│   │   ├── leaves.ipc.js        # Leave requests & approvals
│   │   ├── payroll.ipc.js       # Payroll computation
│   │   ├── recruitment.ipc.js   # Job postings & applicants
│   │   └── settings.ipc.js      # DB config, device config
│   └── db/
│       ├── connection.js        # mysql2 pool (reads from .env)
│       ├── knex.js              # Knex instance
│       └── migrations/
│           ├── 001_employees.js
│           ├── 002_departments.js
│           ├── 003_attendance.js
│           ├── 004_leaves.js
│           ├── 005_payroll.js
│           ├── 006_recruitment.js
│           └── 007_users.js
├── src/
│   ├── main.jsx                 # React entry point
│   ├── App.jsx                  # Router + layout shell
│   ├── store/
│   │   ├── authStore.js         # Zustand: session, role, user
│   │   ├── employeeStore.js
│   │   └── uiStore.js           # Sidebar collapse, active module
│   ├── layouts/
│   │   ├── AppLayout.jsx        # Sidebar + topbar shell
│   │   └── AuthLayout.jsx       # Login page wrapper
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── recruitment/
│   │   │   ├── JobListings.jsx
│   │   │   ├── ApplicantPipeline.jsx
│   │   │   └── InterviewScheduler.jsx
│   │   ├── employees/
│   │   │   ├── EmployeeList.jsx
│   │   │   ├── EmployeeProfile.jsx
│   │   │   ├── AddEmployee.jsx
│   │   │   └── Onboarding.jsx
│   │   ├── attendance/
│   │   │   ├── AttendanceLogs.jsx
│   │   │   ├── ShiftManagement.jsx
│   │   │   └── DeviceStatus.jsx
│   │   ├── leaves/
│   │   │   ├── LeaveRequests.jsx
│   │   │   ├── LeaveBalances.jsx
│   │   │   └── LeaveApproval.jsx
│   │   ├── payroll/
│   │   │   ├── PayrollRun.jsx
│   │   │   ├── SalarySlips.jsx
│   │   │   └── PayrollHistory.jsx
│   │   ├── performance/
│   │   │   ├── KPITracker.jsx
│   │   │   ├── Appraisals.jsx
│   │   │   └── Feedback360.jsx
│   │   ├── disciplinary/
│   │   │   ├── Warnings.jsx
│   │   │   └── IncidentLog.jsx
│   │   ├── offboarding/
│   │   │   ├── ExitChecklist.jsx
│   │   │   └── FinalSettlement.jsx
│   │   └── settings/
│   │       ├── DatabaseConfig.jsx
│   │       ├── DeviceConfig.jsx
│   │       └── UserManagement.jsx
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (auto-generated)
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   ├── StatCard.jsx
│   │   ├── DataTable.jsx
│   │   ├── UpdateNotifier.jsx   # Toasts when update is ready
│   │   └── DevicePulse.jsx      # Live ZKTeco device status indicator
│   └── lib/
│       ├── ipc.js               # window.electron IPC wrapper helpers
│       ├── utils.js             # cn(), formatDate(), formatCurrency()
│       └── validators/
│           ├── employee.schema.js
│           └── payroll.schema.js
├── .env.example
├── electron-builder.yml
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## ⚙️ STEP-BY-STEP INSTRUCTIONS FOR CURSOR

### STEP 1 — Initialize the project

```bash
mkdir hrm-desktop && cd hrm-desktop
npm init -y
npm install electron electron-builder electron-updater electron-store
npm install react react-dom react-router-dom
npm install vite @vitejs/plugin-react
npm install tailwindcss postcss autoprefixer
npm install zustand
npm install mysql2 knex
npm install zklib node-cron
npm install jsonwebtoken bcryptjs
npm install react-hook-form @hookform/resolvers zod
npm install recharts lucide-react
npm install class-variance-authority clsx tailwind-merge
npx shadcn-ui@latest init
```

---

### STEP 2 — electron/main.js

Scaffold the Electron main process with:

- `BrowserWindow` creation (1280x800, no frame: false, titleBarStyle: 'default')
- Load Vite dev server in development (`http://localhost:5173`) and `dist/index.html` in production
- Register all IPC handlers by importing from `./ipc/` folder
- Start ZKTeco poller from `./zkteco/poller.js` after app is ready
- Initialize auto-updater from `./updater.js`
- Use `electron-store` to persist DB config and device config

```js
// electron/main.js - scaffold this file completely
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')
const Store = require('electron-store')

const store = new Store()

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    show: false,
  })

  // Show only when ready (prevents white flash)
  win.once('ready-to-show', () => win.show())

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  const win = createWindow()

  // Register all IPC handlers
  require('./ipc/auth.ipc')(ipcMain, store)
  require('./ipc/employees.ipc')(ipcMain)
  require('./ipc/attendance.ipc')(ipcMain)
  require('./ipc/leaves.ipc')(ipcMain)
  require('./ipc/payroll.ipc')(ipcMain)
  require('./ipc/recruitment.ipc')(ipcMain)
  require('./ipc/settings.ipc')(ipcMain, store)

  // Start attendance poller
  require('./zkteco/poller').start()

  // Auto updater
  autoUpdater.checkForUpdatesAndNotify()
  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update-ready')
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

---

### STEP 3 — electron/preload.js

Expose IPC channels to the renderer via contextBridge:

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  // Auth
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  logout: () => ipcRenderer.invoke('auth:logout'),

  // Employees
  getEmployees: (filters) => ipcRenderer.invoke('employees:getAll', filters),
  getEmployee: (id) => ipcRenderer.invoke('employees:getOne', id),
  createEmployee: (data) => ipcRenderer.invoke('employees:create', data),
  updateEmployee: (id, data) => ipcRenderer.invoke('employees:update', id, data),
  deleteEmployee: (id) => ipcRenderer.invoke('employees:delete', id),

  // Attendance
  getAttendanceLogs: (filters) => ipcRenderer.invoke('attendance:getLogs', filters),
  syncAttendance: () => ipcRenderer.invoke('attendance:sync'),
  overrideAttendance: (data) => ipcRenderer.invoke('attendance:override', data),
  getDeviceStatus: () => ipcRenderer.invoke('attendance:deviceStatus'),

  // Leaves
  getLeaveRequests: (filters) => ipcRenderer.invoke('leaves:getAll', filters),
  applyLeave: (data) => ipcRenderer.invoke('leaves:apply', data),
  approveLeave: (id) => ipcRenderer.invoke('leaves:approve', id),
  rejectLeave: (id, reason) => ipcRenderer.invoke('leaves:reject', id, reason),
  getLeaveBalances: (employeeId) => ipcRenderer.invoke('leaves:balances', employeeId),

  // Payroll
  runPayroll: (period) => ipcRenderer.invoke('payroll:run', period),
  getPayrollHistory: (filters) => ipcRenderer.invoke('payroll:history', filters),
  getSalarySlip: (id) => ipcRenderer.invoke('payroll:slip', id),

  // Recruitment
  getJobs: () => ipcRenderer.invoke('recruitment:getJobs'),
  createJob: (data) => ipcRenderer.invoke('recruitment:createJob', data),
  getApplicants: (jobId) => ipcRenderer.invoke('recruitment:getApplicants', jobId),
  updateApplicantStatus: (id, status) => ipcRenderer.invoke('recruitment:updateApplicant', id, status),

  // Settings
  getDbConfig: () => ipcRenderer.invoke('settings:getDb'),
  saveDbConfig: (config) => ipcRenderer.invoke('settings:saveDb', config),
  getDevices: () => ipcRenderer.invoke('settings:getDevices'),
  saveDevices: (devices) => ipcRenderer.invoke('settings:saveDevices', devices),
  testDbConnection: (config) => ipcRenderer.invoke('settings:testDb', config),

  // Updates
  onUpdateReady: (cb) => ipcRenderer.on('update-ready', cb),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
})
```

---

### STEP 4 — electron/db/connection.js

```js
// Flexible DB connection — reads from electron-store config or .env fallback
const mysql = require('mysql2/promise')

let pool = null

function getPool(config = {}) {
  if (pool) return pool

  pool = mysql.createPool({
    host: config.host || process.env.DB_HOST || 'localhost',
    port: config.port || process.env.DB_PORT || 3306,
    user: config.user || process.env.DB_USER || 'root',
    password: config.password || process.env.DB_PASS || '',
    database: config.database || process.env.DB_NAME || 'hrm_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })

  return pool
}

function resetPool() {
  pool = null
}

module.exports = { getPool, resetPool }
```

---

### STEP 5 — electron/zkteco/devices.js

```js
// ZKTeco device registry — loaded from electron-store, fallback to defaults
// These are your three subnet machines

const DEFAULT_DEVICES = [
  { id: 'dev-1', name: 'Main Gate', ip: '192.168.8.201', port: 4370, subnet: '192.168.8.0', enabled: true },
  { id: 'dev-2', name: 'Factory Floor', ip: '192.168.16.201', port: 4370, subnet: '192.168.16.0', enabled: true },
  { id: 'dev-3', name: 'Admin Block', ip: '192.168.20.201', port: 4370, subnet: '192.168.20.0', enabled: true },
]

module.exports = { DEFAULT_DEVICES }
```

---

### STEP 6 — electron/zkteco/poller.js

```js
const cron = require('node-cron')
const ZKLib = require('zklib')
const { getPool } = require('../db/connection')
const Store = require('electron-store')
const { DEFAULT_DEVICES } = require('./devices')

const store = new Store()

async function pullFromDevice(device) {
  const zk = new ZKLib(device.ip, device.port, 10000, 4000)
  try {
    await zk.createSocket()
    const { data: logs } = await zk.getAttendances()
    const pool = getPool()

    for (const log of logs) {
      await pool.execute(
        `INSERT IGNORE INTO attendance_logs 
         (device_id, employee_device_id, punch_time, punch_type, raw_data) 
         VALUES (?, ?, ?, ?, ?)`,
        [device.id, log.deviceUserId, new Date(log.attendTime), log.type, JSON.stringify(log)]
      )
    }

    console.log(`[ZKTeco] Pulled ${logs.length} logs from ${device.name} (${device.ip})`)
    return { success: true, count: logs.length, device: device.name }
  } catch (err) {
    console.error(`[ZKTeco] Failed to pull from ${device.name}: ${err.message}`)
    return { success: false, error: err.message, device: device.name }
  } finally {
    await zk.disconnect().catch(() => {})
  }
}

function start() {
  // Poll every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    const devices = store.get('zkteco_devices', DEFAULT_DEVICES)
    const activeDevices = devices.filter(d => d.enabled)

    console.log(`[ZKTeco Poller] Running sync for ${activeDevices.length} devices...`)
    const results = await Promise.allSettled(activeDevices.map(pullFromDevice))
    console.log('[ZKTeco Poller] Sync complete:', results.map(r => r.value || r.reason))
  })

  console.log('[ZKTeco Poller] Started — polling every 5 minutes')
}

module.exports = { start, pullFromDevice }
```

---

### STEP 7 — electron-builder.yml

```yaml
appId: com.nervaotics.hrm
productName: Nervaotics HRM
copyright: Copyright © 2025 Nervaotics

directories:
  output: release

files:
  - dist/**/*
  - electron/**/*
  - package.json
  - .env

win:
  target:
    - target: nsis
      arch:
        - x64
  icon: assets/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: Nervaotics HRM

publish:
  provider: github
  owner: YOUR_GITHUB_USERNAME
  repo: hrm-desktop
  private: false

autoUpdate:
  enabled: true
```

---

### STEP 8 — Database Migrations (Knex)

Scaffold ALL of these migration files:

**001_employees.js**
```js
exports.up = (knex) => knex.schema.createTable('employees', (t) => {
  t.increments('id').primary()
  t.string('employee_code').unique().notNullable()
  t.string('first_name').notNullable()
  t.string('last_name').notNullable()
  t.string('cnic').unique()
  t.string('email').unique()
  t.string('phone')
  t.string('photo_url')
  t.integer('department_id').unsigned().references('id').inTable('departments')
  t.integer('designation_id').unsigned()
  t.string('employment_type').defaultTo('full-time') // full-time, part-time, contract
  t.string('status').defaultTo('active') // active, probation, terminated, resigned
  t.date('date_of_joining')
  t.date('date_of_birth')
  t.string('gender')
  t.string('blood_group')
  t.text('address')
  t.string('emergency_contact_name')
  t.string('emergency_contact_phone')
  t.decimal('basic_salary', 12, 2)
  t.integer('reporting_manager_id').unsigned()
  t.timestamps(true, true)
})

exports.down = (knex) => knex.schema.dropTable('employees')
```

**002_departments.js**
```js
exports.up = (knex) => knex.schema.createTable('departments', (t) => {
  t.increments('id').primary()
  t.string('name').notNullable()
  t.string('code').unique()
  t.integer('head_id').unsigned()
  t.timestamps(true, true)
})

exports.down = (knex) => knex.schema.dropTable('departments')
```

**003_attendance.js**
```js
exports.up = (knex) => knex.schema.createTable('attendance_logs', (t) => {
  t.increments('id').primary()
  t.string('device_id')
  t.string('employee_device_id')
  t.integer('employee_id').unsigned().references('id').inTable('employees')
  t.datetime('punch_time').notNullable()
  t.integer('punch_type') // 0=check-in, 1=check-out
  t.boolean('is_manual_override').defaultTo(false)
  t.text('override_reason')
  t.json('raw_data')
  t.unique(['device_id', 'employee_device_id', 'punch_time'])
  t.timestamps(true, true)
})

exports.down = (knex) => knex.schema.dropTable('attendance_logs')
```

**004_leaves.js**
```js
exports.up = (knex) => knex.schema.createTable('leave_requests', (t) => {
  t.increments('id').primary()
  t.integer('employee_id').unsigned().references('id').inTable('employees')
  t.string('leave_type') // annual, sick, casual, unpaid
  t.date('start_date')
  t.date('end_date')
  t.integer('days_count')
  t.text('reason')
  t.string('status').defaultTo('pending') // pending, approved, rejected
  t.integer('approved_by').unsigned()
  t.text('rejection_reason')
  t.timestamps(true, true)
})

exports.down = (knex) => knex.schema.dropTable('leave_requests')
```

**005_payroll.js**
```js
exports.up = (knex) => knex.schema.createTable('payroll_runs', (t) => {
  t.increments('id').primary()
  t.string('period_month') // e.g. "2025-01"
  t.string('status').defaultTo('draft') // draft, processed, paid
  t.integer('processed_by').unsigned()
  t.timestamps(true, true)
}).createTable('payroll_slips', (t) => {
  t.increments('id').primary()
  t.integer('payroll_run_id').unsigned().references('id').inTable('payroll_runs')
  t.integer('employee_id').unsigned().references('id').inTable('employees')
  t.decimal('basic_salary', 12, 2)
  t.decimal('allowances', 12, 2).defaultTo(0)
  t.decimal('overtime_amount', 12, 2).defaultTo(0)
  t.decimal('deductions', 12, 2).defaultTo(0)
  t.decimal('tax', 12, 2).defaultTo(0)
  t.decimal('net_salary', 12, 2)
  t.integer('days_present')
  t.integer('days_absent')
  t.integer('leaves_taken')
  t.json('breakdown') // itemized details
  t.timestamps(true, true)
})

exports.down = (knex) => knex.schema.dropTableIfExists('payroll_slips').dropTableIfExists('payroll_runs')
```

**006_recruitment.js**
```js
exports.up = (knex) => knex.schema.createTable('job_postings', (t) => {
  t.increments('id').primary()
  t.string('title').notNullable()
  t.integer('department_id').unsigned()
  t.text('description')
  t.string('status').defaultTo('open') // open, closed, on-hold
  t.date('closing_date')
  t.timestamps(true, true)
}).createTable('applicants', (t) => {
  t.increments('id').primary()
  t.integer('job_id').unsigned().references('id').inTable('job_postings')
  t.string('full_name')
  t.string('email')
  t.string('phone')
  t.string('resume_url')
  t.string('stage').defaultTo('applied') // applied, screening, interview, offer, hired, rejected
  t.text('notes')
  t.timestamps(true, true)
})

exports.down = (knex) => knex.schema.dropTableIfExists('applicants').dropTableIfExists('job_postings')
```

**007_users.js**
```js
exports.up = (knex) => knex.schema.createTable('users', (t) => {
  t.increments('id').primary()
  t.integer('employee_id').unsigned().references('id').inTable('employees')
  t.string('username').unique().notNullable()
  t.string('password_hash').notNullable()
  t.string('role').defaultTo('hr_staff') // super_admin, hr_manager, hr_staff, employee
  t.boolean('is_active').defaultTo(true)
  t.timestamp('last_login')
  t.timestamps(true, true)
})

exports.down = (knex) => knex.schema.dropTable('users')
```

---

### STEP 9 — src/App.jsx

Scaffold React Router with protected routes:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
// ... import all page components

export default function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>
        <Route element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recruitment/*" element={<RecruitmentRoutes />} />
          <Route path="/employees/*" element={<EmployeeRoutes />} />
          <Route path="/attendance/*" element={<AttendanceRoutes />} />
          <Route path="/leaves/*" element={<LeaveRoutes />} />
          <Route path="/payroll/*" element={<PayrollRoutes />} />
          <Route path="/performance/*" element={<PerformanceRoutes />} />
          <Route path="/disciplinary/*" element={<DisciplinaryRoutes />} />
          <Route path="/offboarding/*" element={<OffboardingRoutes />} />
          <Route path="/settings/*" element={<SettingsRoutes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

---

### STEP 10 — src/layouts/AppLayout.jsx (Sidebar Design)

Design the sidebar with this aesthetic:
- **Dark sidebar** (#0F1117) with subtle border-right
- **Brand accent**: Electric Blue (#3B82F6)
- **Active state**: accent-colored left border + soft bg highlight
- **Typography**: Inter for UI, semibold for nav labels
- Sidebar sections:
  - 🏠 Dashboard
  - 📋 Recruitment
  - 👥 Employees
  - 🕐 Attendance
  - 🌴 Leaves
  - 💰 Payroll
  - 📈 Performance
  - ⚠️ Disciplinary
  - 🚪 Offboarding
  - ⚙️ Settings
- Bottom: User avatar + role + logout button
- Top: App logo "Nervaotics HRM" with version badge

---

### STEP 11 — src/components/UpdateNotifier.jsx

```jsx
import { useEffect, useState } from 'react'
import { toast } from 'sonner' // or use shadcn toast

export default function UpdateNotifier() {
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    window.electron.onUpdateReady(() => {
      setUpdateReady(true)
      toast('Update Ready', {
        description: 'A new version of Nervaotics HRM is ready to install.',
        action: {
          label: 'Restart & Update',
          onClick: () => window.electron.installUpdate(),
        },
        duration: Infinity,
      })
    })
  }, [])

  return null
}
```

---

### STEP 12 — src/components/DevicePulse.jsx

Show live ZKTeco device status in the sidebar footer or topbar:

```jsx
// Small colored dots showing each device:
// 🟢 Connected | 🔴 Offline | 🟡 Syncing
// Refresh every 30 seconds via window.electron.getDeviceStatus()
```

---

### STEP 13 — .env.example

```env
NODE_ENV=development

# MySQL (used if no config saved in electron-store)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=hrm_db

# JWT
JWT_SECRET=change_this_to_something_long_and_random_please

# ZKTeco default poll interval (minutes)
ZKTECO_POLL_INTERVAL=5
```

---

### STEP 14 — package.json scripts

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"cross-env NODE_ENV=development electron electron/main.js\"",
    "build": "vite build && electron-builder",
    "build:win": "vite build && electron-builder --win",
    "migrate": "node electron/db/run-migrations.js",
    "release": "vite build && electron-builder --publish always"
  }
}
```

---

### STEP 15 — vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './', // Critical for Electron file:// protocol
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
```

---

## 🎨 UI DESIGN TOKENS

Apply these consistently across all pages:

```css
/* Colors */
--bg-primary: #0F1117;       /* Sidebar, cards */
--bg-secondary: #1A1D27;     /* Main content area */
--bg-card: #1E2130;          /* Data cards */
--accent: #3B82F6;           /* Blue — primary actions */
--accent-hover: #2563EB;
--success: #10B981;          /* Green — active, approved */
--warning: #F59E0B;          /* Amber — pending, probation */
--danger: #EF4444;           /* Red — terminated, rejected */
--text-primary: #F1F5F9;
--text-secondary: #94A3B8;
--border: #2D3148;

/* Typography */
font-family: 'Inter', sans-serif;
--text-xs: 11px;
--text-sm: 13px;
--text-base: 14px;
--text-lg: 16px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 30px;
```

---

## 🔐 ROLES & PERMISSIONS

| Role | Access |
|---|---|
| `super_admin` | Everything + User Management + Settings |
| `hr_manager` | All HRM modules, approve leaves/payroll |
| `hr_staff` | Employees, Attendance, Leaves (view + basic edits) |
| `employee` | Own profile, own attendance, own leave requests |

---

## ✅ AFTER SCAFFOLDING — WHAT TO BUILD FIRST

In this order:

1. `electron/main.js` + `preload.js` — get window opening
2. DB connection + run migrations
3. Login page + auth IPC
4. AppLayout sidebar + routing
5. Employee List + Add Employee
6. Attendance logs page (show DB data)
7. ZKTeco poller test with one device
8. Dashboard with stat cards
9. Leave module
10. Payroll module
11. Recruitment pipeline
12. Settings page (DB config + device config UI)
13. Auto-updater wiring + test release
14. Build Windows installer

---

## 📦 GITHUB ACTIONS — Auto Release Pipeline

Create `.github/workflows/release.yml`:

```yaml
name: Build & Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Push a tag `v1.0.0` → GitHub Actions builds the `.exe` → uploads to GitHub Releases → all installed clients auto-update. 🎯

---

## 🧠 NOTES FOR CURSOR

- Use `window.electron.*` on the renderer side — never import Node.js modules directly in React
- All DB queries go through IPC handlers in `electron/ipc/` — renderer never touches MySQL directly
- ZKTeco device IPs should be editable from the Settings UI and persisted via `electron-store`
- The app should work even if ZKTeco devices are offline — just show "Device Offline" status
- Use `INSERT IGNORE` for attendance logs to prevent duplicates on repeated polls
- Payroll computation should read attendance_logs, calculate present days, absent days, leaves taken, then apply salary formula
- All money values stored as `DECIMAL(12,2)` in MySQL
- Dates always stored as UTC, displayed in local time

---

*Built with ❤️ by Nervaotics — Karachi*
