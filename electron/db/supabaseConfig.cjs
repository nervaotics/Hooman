const path = require('path')
const fs = require('fs')
const { encryptSecretsObject, decryptSecretsObject } = require('../lib/secureStorage.cjs')

const SECRETS_VERSION = 1

function extractProjectRef(url) {
  const raw = String(url || '').trim()
  const match = raw.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i)
  return match ? match[1] : null
}

function readRawSupabaseStore(store) {
  return store.get('supabase_config', null)
}

function hasLegacyPlaintext(saved) {
  if (!saved) return false
  return Boolean(saved.dbPassword || saved.anonKey || saved.serviceRoleKey)
}

function readSecretsFromSaved(saved) {
  if (!saved) {
    return { dbPassword: '', anonKey: '', serviceRoleKey: '' }
  }
  if (saved.secrets) {
    return decryptSecretsObject(saved.secrets)
  }
  if (hasLegacyPlaintext(saved)) {
    return {
      dbPassword: saved.dbPassword || '',
      anonKey: saved.anonKey || '',
      serviceRoleKey: saved.serviceRoleKey || '',
    }
  }
  return { dbPassword: '', anonKey: '', serviceRoleKey: '' }
}

function buildEncryptedRecord({ url, projectRef, database, secrets }) {
  return {
    url,
    projectRef,
    database: database || 'postgres',
    secrets_v: SECRETS_VERSION,
    secrets: encryptSecretsObject(secrets),
  }
}

/**
 * Upgrade plaintext configs written before encryption shipped.
 * @param {import('electron-store')} store
 */
function migrateSupabaseSecretsIfNeeded(store) {
  const saved = readRawSupabaseStore(store)
  if (!saved?.url) return false
  if (saved.secrets && saved.secrets_v) return false
  if (!hasLegacyPlaintext(saved)) return false

  store.set(
    'supabase_config',
    buildEncryptedRecord({
      url: String(saved.url).replace(/\/$/, ''),
      projectRef: saved.projectRef || extractProjectRef(saved.url),
      database: saved.database || 'postgres',
      secrets: {
        dbPassword: saved.dbPassword || '',
        anonKey: saved.anonKey || '',
        serviceRoleKey: saved.serviceRoleKey || '',
      },
    }),
  )
  console.log('[Hooman] Migrated Supabase credentials to encrypted storage')
  return true
}

/**
 * Persist Supabase config with encrypted secrets (main process only).
 * @param {import('electron-store')} store
 * @param {{ url?: string, dbPassword?: string, anonKey?: string, serviceRoleKey?: string }} payload
 */
function writeSupabaseStore(store, payload = {}) {
  migrateSupabaseSecretsIfNeeded(store)
  const saved = readRawSupabaseStore(store)
  const prevSecrets = readSecretsFromSaved(saved)

  const url = String(payload.url || saved?.url || '').trim()
  const dbPassword =
    payload.dbPassword === undefined || String(payload.dbPassword).trim() === ''
      ? prevSecrets.dbPassword
      : String(payload.dbPassword).trim()
  const anonKey =
    payload.anonKey === undefined || String(payload.anonKey).trim() === ''
      ? prevSecrets.anonKey
      : String(payload.anonKey).trim()
  const serviceRoleKey =
    payload.serviceRoleKey === undefined || String(payload.serviceRoleKey).trim() === ''
      ? prevSecrets.serviceRoleKey
      : String(payload.serviceRoleKey).trim()
  const projectRef = extractProjectRef(url)
  if (!url || !dbPassword || !projectRef) {
    throw new Error('Supabase URL and database password are required')
  }

  store.set(
    'supabase_config',
    buildEncryptedRecord({
      url,
      projectRef,
      database: 'postgres',
      secrets: { dbPassword, anonKey, serviceRoleKey },
    }),
  )
  store.delete('db_config')
}

/**
 * @param {import('electron-store')} store
 */
function getSupabaseConfig(store) {
  migrateSupabaseSecretsIfNeeded(store)
  const saved = readRawSupabaseStore(store)
  if (!saved?.url) return null

  const secrets = readSecretsFromSaved(saved)
  const ref = saved.projectRef || extractProjectRef(saved.url)

  return {
    url: String(saved.url).replace(/\/$/, ''),
    anonKey: secrets.anonKey,
    serviceRoleKey: secrets.serviceRoleKey,
    dbPassword: secrets.dbPassword,
    projectRef: ref,
    database: saved.database || 'postgres',
  }
}

/** Safe metadata for renderer — never includes secrets. */
function getSupabasePublicMeta(store) {
  const cfg = getSupabaseConfig(store)
  if (!cfg) return null
  return {
    url: cfg.url,
    projectRef: cfg.projectRef,
    anonKeyIsSet: Boolean(cfg.anonKey),
    serviceRoleKeyIsSet: Boolean(cfg.serviceRoleKey),
    dbPasswordIsSet: Boolean(cfg.dbPassword),
  }
}

function isSupabaseConfigured(cfg) {
  return Boolean(cfg?.url && cfg?.dbPassword && cfg?.projectRef)
}

/**
 * Direct Postgres connection (Knex pg) — bypasses REST, works for all existing services.
 */
function buildPostgresConnection(cfg) {
  if (!cfg?.projectRef || !cfg?.dbPassword) {
    throw new Error('Supabase database password and project URL are required')
  }
  return {
    host: `db.${cfg.projectRef}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password: cfg.dbPassword,
    database: cfg.database || 'postgres',
    ssl: { rejectUnauthorized: false },
  }
}

function getSchemaSqlPaths() {
  const root = path.join(__dirname, '..', '..', 'supabase', 'migrations')
  return [
    path.join(root, '001_initial_schema.sql'),
    path.join(root, '002_rls.sql'),
  ].filter((p) => fs.existsSync(p))
}

module.exports = {
  extractProjectRef,
  getSupabaseConfig,
  getSupabasePublicMeta,
  writeSupabaseStore,
  migrateSupabaseSecretsIfNeeded,
  isSupabaseConfigured,
  buildPostgresConnection,
  getSchemaSqlPaths,
}
