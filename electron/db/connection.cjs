require('dotenv').config()

const fs = require('fs')
const {
  getSupabaseConfig,
  isSupabaseConfigured,
  buildPostgresConnection,
  getSchemaSqlPaths,
} = require('./supabaseConfig.cjs')

/**
 * @param {import('electron-store')} store
 */
function getDataProvider(store) {
  const supabase = getSupabaseConfig(store)
  if (isSupabaseConfigured(supabase)) return 'supabase'
  return 'legacy'
}

/**
 * @param {import('electron-store')} store
 */
function getMergedDbConfig(store) {
  const supabase = getSupabaseConfig(store)
  if (isSupabaseConfigured(supabase)) {
    const conn = buildPostgresConnection(supabase)
    return {
      provider: 'supabase',
      host: conn.host,
      port: conn.port,
      user: conn.user,
      password: conn.password,
      database: conn.database,
      supabaseUrl: supabase.url,
      supabaseAnonKey: supabase.anonKey,
      supabaseServiceRoleKey: supabase.serviceRoleKey,
    }
  }

  return { provider: 'legacy' }
}

function isDbConfigComplete(cfg) {
  return cfg?.provider === 'supabase' && Boolean(cfg.host && cfg.password && cfg.database)
}

/**
 * @param {import('electron-store')} store
 */
function getKnex(store) {
  const knex = require('knex')
  const supabase = getSupabaseConfig(store)
  if (!isSupabaseConfigured(supabase)) {
    throw new Error('Supabase is not configured. Complete setup first.')
  }

  return knex({
    client: 'pg',
    connection: buildPostgresConnection(supabase),
    pool: { min: 0, max: 10 },
    searchPath: ['public'],
  })
}

let knexSingleton = null
let knexSignature = ''
/** @type {Promise<void> | null} */
let schemaFlight = null
let schemaReady = false

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
  schemaFlight = null
  schemaReady = false
}

async function applySupabaseSchema(knex) {
  const paths = getSchemaSqlPaths()
  for (const filePath of paths) {
    const sql = fs.readFileSync(filePath, 'utf8')
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--'))
    for (const statement of statements) {
      if (!statement) continue
      try {
        // eslint-disable-next-line no-await-in-loop
        await knex.raw(`${statement};`)
      } catch (err) {
        const msg = String(err?.message || err)
        if (/already exists|duplicate key|IF NOT EXISTS/i.test(msg)) continue
        console.warn('[Hooman] schema statement skipped:', msg.slice(0, 120))
      }
    }
  }
}

/**
 * @param {import('electron-store')} store
 * @param {{ force?: boolean }} [opts]
 */
async function ensureMigrations(store, opts = {}) {
  if (schemaReady && !opts.force) return
  if (schemaFlight) return schemaFlight

  schemaFlight = (async () => {
    const k = getOrCreateKnex(store)
    const hasDepartments = await k.schema.hasTable('departments')
    if (!hasDepartments || opts.force) {
      await applySupabaseSchema(k)
    }
    schemaReady = true
    schemaFlight = null
  })()

  return schemaFlight
}

/** @deprecated Use ensureMigrations */
async function runMigrations(store) {
  return ensureMigrations(store, { force: true })
}

/**
 * @param {import('electron-store')} store
 */
async function pingDatabase(store) {
  const cfg = getMergedDbConfig(store)
  if (!isDbConfigComplete(cfg)) {
    throw new Error('Database is not configured')
  }
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
  getDataProvider,
  getMergedDbConfig,
  isDbConfigComplete,
  getKnex,
  getOrCreateKnex,
  resetKnex,
  ensureMigrations,
  runMigrations,
  pingDatabase,
  getSupabaseConfig,
  isSupabaseConfigured,
}
