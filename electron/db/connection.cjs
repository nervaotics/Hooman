require('dotenv').config()

const {
  getMigrationsDirectory,
  formatMigrationBundleError,
} = require('./migrationsDir.cjs')

/**
 * @param {import('electron-store')} store
 */
function getMergedDbConfig(store) {
  const saved = store.get('db_config', null)
  return {
    host: saved?.host ?? process.env.DB_HOST ?? '127.0.0.1',
    port: Number(saved?.port ?? process.env.DB_PORT ?? 3306),
    user: saved?.user ?? process.env.DB_USER ?? 'root',
    password: saved?.password ?? process.env.DB_PASS ?? '',
    database: saved?.database ?? process.env.DB_NAME ?? 'hooman_hrm',
  }
}

function isDbConfigComplete(cfg) {
  return Boolean(
    cfg &&
      cfg.host &&
      cfg.database &&
      cfg.user !== undefined &&
      cfg.user !== null,
  )
}

/**
 * @param {import('electron-store')} store
 */
function getKnex(store) {
  const knex = require('knex')
  const cfg = getMergedDbConfig(store)
  if (!isDbConfigComplete(cfg)) {
    throw new Error('Database is not configured')
  }
  const migrationsDirectory = getMigrationsDirectory()
  return knex({
    client: 'mysql2',
    connection: {
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      timezone: 'Z',
    },
    pool: { min: 0, max: 10 },
    migrations: {
      directory: migrationsDirectory,
      loadExtensions: ['.cjs', '.js'],
    },
  })
}

let knexSingleton = null
let knexSignature = ''
/** @type {Promise<void> | null} */
let migrationFlight = null
let migrationsReady = false

/**
 * @param {import('electron-store')} store
 */
function getOrCreateKnex(store) {
  const cfg = getMergedDbConfig(store)
  const sig = JSON.stringify(cfg)
  if (knexSingleton && sig === knexSignature) return knexSingleton
  if (knexSingleton) {
    knexSingleton.destroy().catch(() => {})
    knexSingleton = null
  }
  knexSingleton = getKnex(store)
  knexSignature = sig
  return knexSingleton
}

async function resetKnex() {
  if (knexSingleton) {
    await knexSingleton.destroy().catch(() => {})
    knexSingleton = null
    knexSignature = ''
  }
  migrationFlight = null
  migrationsReady = false
}

/**
 * Run pending migrations once per process (serialized — avoids knex lock races).
 * @param {import('electron-store')} store
 * @param {{ force?: boolean }} [opts]
 */
async function ensureMigrations(store, opts = {}) {
  if (migrationsReady && !opts.force) return
  if (migrationFlight) return migrationFlight

  migrationFlight = (async () => {
    const migrationsDirectory = getMigrationsDirectory()
    const k = getOrCreateKnex(store)
    try {
      try {
        await k.migrate.latest()
      } catch (err) {
        const msg = String(err?.message || err || '')
        if (/already locked/i.test(msg)) {
          await k.migrate.forceFreeMigrationsLock()
          await k.migrate.latest()
        } else {
          throw err
        }
      }
      migrationsReady = true
    } catch (err) {
      throw new Error(formatMigrationBundleError(err, migrationsDirectory))
    } finally {
      migrationFlight = null
    }
  })()

  return migrationFlight
}

/** @deprecated Use ensureMigrations */
async function runMigrations(store) {
  return ensureMigrations(store, { force: true })
}

/**
 * @param {import('electron-store')} store
 */
async function pingDatabase(store) {
  const k = getKnex(store)
  try {
    await k.raw('select 1 as ok')
    await k.destroy()
    return true
  } catch (e) {
    await k.destroy().catch(() => {})
    throw e
  }
}

module.exports = {
  getMergedDbConfig,
  isDbConfigComplete,
  getKnex,
  getOrCreateKnex,
  resetKnex,
  ensureMigrations,
  runMigrations,
  pingDatabase,
}
