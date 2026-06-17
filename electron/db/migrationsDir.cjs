const fs = require('fs')
const path = require('path')

/**
 * Absolute path to Knex migration files (must work in dev, CLI, and packaged Electron).
 */
function getMigrationsDirectory() {
  const candidates = [path.join(__dirname, 'migrations')]

  try {
    const { app } = require('electron')
    const appPath = app?.getAppPath?.()
    if (appPath) {
      candidates.push(path.join(appPath, 'electron', 'db', 'migrations'))
    }
  } catch {
    /* not in Electron main process */
  }

  candidates.push(path.join(process.cwd(), 'electron', 'db', 'migrations'))

  const tried = []
  for (const candidate of candidates) {
    const absolute = path.resolve(candidate)
    if (tried.includes(absolute)) continue
    tried.push(absolute)
    if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) {
      return absolute
    }
  }

  throw new Error(
    `Migrations directory not found. Looked in:\n${tried.map((d) => `  - ${d}`).join('\n')}`,
  )
}

/**
 * Knex fails with a vague "corrupt" error when knex_migrations references files
 * that are not on disk (e.g. older app build against a newer database).
 */
function formatMigrationBundleError(err, migrationsDir) {
  const msg = String(err?.message || err || '')
  if (!/migration directory is corrupt/i.test(msg)) return msg

  let files = []
  try {
    files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.cjs') || f.endsWith('.js'))
  } catch {
    /* ignore */
  }

  return (
    `${msg}\n\n` +
    `Migrations folder: ${migrationsDir}\n` +
    `Files on this PC (${files.length}): ${files.length ? files.join(', ') : '(none)'}\n\n` +
    'Update/reinstall Hooman on this machine so it includes every migration file, ' +
    'especially 011_payroll_periods.cjs, then restart the app.'
  )
}

module.exports = {
  getMigrationsDirectory,
  formatMigrationBundleError,
}
