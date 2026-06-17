# 🔧 CURSOR PROMPT — Client-Server Setup (Real Network Values)
> This replaces/extends the earlier "Convert to Client-Server Architecture" prompt.
> Paste this AFTER that one is applied — it bakes in actual office network values and automates two steps that were manual before.

---

## 📌 WHAT'S DIFFERENT FROM THE PREVIOUS PROMPT

The previous client-server prompt used placeholders (`192.168.15.3`, `changeme123`). This prompt:

1. Bakes in the **real Server PC IP** (`192.168.0.107`) as the default suggestion in the setup wizard
2. Registers the **4 known ZKTeco devices** with real IPs
3. Automates **remote MySQL user creation** (no manual SQL needed — already in `setup.ipc.js`, just confirm it runs)
4. Adds a **proxy-bypass check** on first server setup, since this office uses a proxy (`192.168.0.224:8080`) for internet access that must NOT intercept LAN traffic
5. Adds a **device pool registry** so newly discovered ZKTeco devices on other subnets can be added later from the Settings UI, not hardcoded

---

## 1. Update `electron/zkteco/devices.js` with real devices

```js
// electron/zkteco/devices.js
const DEFAULT_DEVICES = [
  { id: 'dev-1', name: 'Device 1', ip: '192.168.0.21',  port: 4370, subnet: '192.168.0.0',  enabled: true },
  { id: 'dev-2', name: 'Device 2', ip: '192.168.0.23',  port: 4370, subnet: '192.168.0.0',  enabled: true },
  { id: 'dev-3', name: 'Device 3', ip: '192.168.0.25',  port: 4370, subnet: '192.168.0.0',  enabled: true },
  { id: 'dev-4', name: 'Device 4', ip: '192.168.0.168', port: 4370, subnet: '192.168.0.0',  enabled: true },
]

// Known office subnets — used by the Settings UI "Scan for devices" feature later
const KNOWN_POOLS = [
  '192.168.0.0',
  '192.168.8.0',
  '192.168.15.0',
  '192.168.20.0',
]

module.exports = { DEFAULT_DEVICES, KNOWN_POOLS }
```

Devices are still editable from Settings → Device Config UI (already scaffolded) — this just seeds real starting data instead of placeholder IPs.

---

## 2. Pre-fill Server IP suggestion in `ClientServerIP.jsx`

Small UX improvement — since you already know your server's IP, don't make every client PC's installer type it manually. Suggest it, but still let them override/test it:

```jsx
// src/pages/setup/ClientServerIP.jsx — update initial state
const [ip, setIp] = useState('192.168.0.107') // pre-filled, editable
```

Keep the rest of the component (test connection button, save flow) exactly as before.

---

## 3. Add Proxy-Bypass Verification to Server Setup

This office has a proxy (`192.168.0.224:8080`) for internet access. It must NOT intercept LAN traffic to MySQL or ZKTeco devices. Add a check (not auto-fix, just a warning) during server setup.

**File: `electron/network-check.js`** (new file)

```js
const { exec } = require('child_process')

// Reads Windows registry for current proxy bypass list
function checkProxyBypass() {
  return new Promise((resolve) => {
    exec(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyOverride',
      (err, stdout) => {
        if (err) {
          resolve({ configured: false, raw: null })
          return
        }

        const hasLocalBypass = stdout.includes('<local>') || stdout.includes('192.168.*')
        resolve({ configured: hasLocalBypass, raw: stdout })
      }
    )
  })
}

module.exports = { checkProxyBypass }
```

Wire it into `setup.ipc.js`'s `setup:asServer` handler — run it and return a warning (not a blocker) to the UI:

```js
// In electron/ipc/setup.ipc.js, inside setup:asServer handler
const { checkProxyBypass } = require('../network-check')

ipcMain.handle('setup:asServer', async () => {
  store.set('app_role', 'server')
  store.set('db_host', '127.0.0.1')
  store.set('db_port', 3307)

  await startMySQL()
  await runMigrations()
  await enableRemoteAccess()
  openMySQLPort()

  const proxyCheck = await checkProxyBypass()

  store.set('server_setup_complete', true)

  return {
    success: true,
    warning: proxyCheck.configured
      ? null
      : 'Your system proxy may not bypass local network addresses. If client PCs cannot connect, add 192.168.*;127.0.0.1;localhost to your proxy exceptions in Windows Settings → Network → Proxy.'
  }
})
```

Then in `RoleSelection.jsx`, show this warning as a non-blocking toast/banner if it comes back, rather than failing setup — most offices already have this configured correctly, this is just a safety net.

---

## 4. Generate Remote User Password Properly (Not Hardcoded)

Replace the `'changeme123'` placeholder from the earlier prompt with a generated password, shown once.

**Update `electron/ipc/setup.ipc.js`:**

```js
const crypto = require('crypto')

function generatePassword() {
  return crypto.randomBytes(12).toString('base64').replace(/[/+=]/g, '').slice(0, 16)
}

async function enableRemoteAccess() {
  const password = generatePassword()

  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '',
  })

  await conn.query(`CREATE USER IF NOT EXISTS 'hrm_remote'@'%' IDENTIFIED BY ?`, [password])
  await conn.query(`GRANT ALL PRIVILEGES ON hrm_db.* TO 'hrm_remote'@'%'`)
  await conn.query(`FLUSH PRIVILEGES`)
  await conn.end()

  // Store it so the Server PC itself can reconnect later (e.g. after restart)
  store.set('hrm_remote_password', password)

  console.log('[Setup] Remote access enabled for hrm_remote user')
  return password
}
```

Update the `setup:asServer` handler to return this password so the UI can show a **"Save this — you'll need it if a Client PC ever needs manual setup"** dialog, and store it in `electron-store` so the Server PC's own connection pool can use it too (update `connection.js` to read `hrm_remote_password` instead of a hardcoded string).

> Client PCs don't need to type this password manually — it's only relevant if you ever troubleshoot via the raw MySQL CLI. The app's automated client setup flow handles it internally once we wire client-side credential exchange (see note below).

**Note for Cursor:** since the client doesn't know the server's generated password automatically, the cleanest approach for this office size (3-10 PCs) is to have `setup:testServerConnection` accept the password as an optional second argument, defaulting to a fixed value stored in a shared `.env` that you control at build time — OR simpler: keep one consistent password across all installs since this is a closed trusted LAN, and skip per-install random generation. Use your judgement here based on how tightly you want to manage this; for an internal office tool a single strong static password set once at build time is reasonable and far simpler than building a credential-exchange flow.

---

## 5. Settings UI — Add "Known Pools" Reference Display

Small addition to `src/pages/settings/DeviceConfig.jsx` — show the known subnet pools as a reference so whoever adds new devices later knows which ranges to expect:

```jsx
import { KNOWN_POOLS } from '@/lib/constants' // mirror of electron/zkteco/devices.js KNOWN_POOLS

// Inside the DeviceConfig component, add a small info panel:
<div className="text-xs text-slate-500 mb-4">
  Known office subnets: {KNOWN_POOLS.join(', ')}.
  Devices on subnets 8.0, 15.0, and 20.0 are not yet added — enter their IPs here once known.
</div>
```

---

## ✅ SUMMARY — FILES TO CREATE/MODIFY IN THIS PASS

```
electron/
├── network-check.js              ← NEW
├── zkteco/devices.js              ← MODIFIED (real device IPs)
├── ipc/setup.ipc.js               ← MODIFIED (password generation, proxy check)
└── db/connection.js               ← MODIFIED (read password from store)
src/
├── pages/setup/ClientServerIP.jsx ← MODIFIED (pre-filled IP)
├── pages/setup/RoleSelection.jsx  ← MODIFIED (show proxy warning if present)
└── pages/settings/DeviceConfig.jsx ← MODIFIED (known pools display)
```

---

## 🧠 IMPORTANT NOTES FOR CURSOR

- The proxy (`192.168.0.224:8080`) is for **internet access only**. It should never sit between the HRM app and MySQL/ZKTeco traffic — both of those are pure LAN communication. The proxy-bypass check is a safety net, not something the app routes around at the code level; if it's misconfigured, that's a Windows network setting fix, not an app fix.
- Only 4 ZKTeco devices are confirmed right now, all on pool `192.168.0.0`. Devices on pools `8.0`, `15.0`, `20.0` are not yet known — don't hardcode placeholder IPs for them, leave the Settings UI as the way to add them once discovered.
- Decide on the remote MySQL password strategy (random-per-install vs. fixed-at-build-time) based on the note in section 4 before finalizing — this is a judgment call appropriate for the deployment size, not something to over-engineer for 3-10 office PCs.
- Do not change the core client-server logic from the previous prompt (role selection, conditional MySQL/ZKTeco start, etc.) — this prompt only refines it with real network values and small automation/safety additions.

---

*Nervaotics HRM — Network Configuration Patch*
