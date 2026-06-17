/**
 * Ensures the Electron binary is extracted (npm postinstall can time out on slow networks).
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const electronDir = path.join(__dirname, '..', 'node_modules', 'electron')
const exe = path.join(electronDir, 'dist', 'electron.exe')
const pathTxt = path.join(electronDir, 'path.txt')

if (fs.existsSync(exe) && fs.existsSync(pathTxt)) {
  process.exit(0)
}

console.log('[Hooman] Extracting Electron binary (one-time, ~120MB)...')
const r = spawnSync(process.execPath, [path.join(electronDir, 'install.js')], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: process.env,
})

if (r.status !== 0) {
  console.warn(
    '[Hooman] Electron install.js did not finish. Run: node node_modules/electron/install.js',
  )
  process.exit(0)
}
