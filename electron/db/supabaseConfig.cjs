const path = require('path')
const fs = require('fs')
const { encryptSecretsObject, decryptSecretsObject } = require('../lib/secureStorage.cjs')

const SECRETS_VERSION = 1

function extractProjectRef(url) {
  const raw = String(url || '').trim()
  if (!raw) return null

  let match = raw.match(/db\.([a-z0-9-]+)\.supabase\.co/i)
  if (match) return match[1].toLowerCase()

  match = raw.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i)
  if (match) return match[1].toLowerCase()

  match = raw.match(/^([a-z0-9-]+)\.supabase\.co/i)
  if (match) return match[1].toLowerCase()

  match = raw.match(/postgres\.([a-z0-9-]+)@/i)
  if (match) return match[1].toLowerCase()

  if (/^[a-z0-9-]{8,40}$/i.test(raw) && !raw.includes('.')) {
    return raw.toLowerCase()
  }

  return null
}

/**
 * Parse a Postgres URI from Supabase dashboard (direct or pooler).
 * @param {string} input
 */
function parsePostgresConnectionString(input) {
  const raw = String(input || '').trim()
  if (!/^postgres(ql)?:\/\//i.test(raw)) return null
  try {
    const normalized = raw.replace(/^postgres:\/\//i, 'postgresql://')
    const parsed = new URL(normalized)
    const database = parsed.pathname.replace(/^\//, '') || 'postgres'
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 5432,
      user: decodeURIComponent(parsed.username || 'postgres'),
      password: decodeURIComponent(parsed.password || ''),
      database,
      projectRef: extractProjectRef(parsed.hostname) || extractProjectRef(parsed.username),
    }
  } catch {
    return null
  }
}

/**
 * @param {object} cfg
 */
function resolvePostgresConnection(cfg) {
  if (!cfg?.projectRef || !cfg?.dbPassword) {
    throw new Error('Supabase database password and project URL are required')
  }

  const host = String(cfg.dbHost || `db.${cfg.projectRef}.supabase.co`).trim()
  const port = Number(cfg.dbPort) || 5432
  let user = cfg.dbUser ? String(cfg.dbUser).trim() : ''
  if (!user) {
    user = host.includes('pooler.supabase.com') ? `postgres.${cfg.projectRef}` : 'postgres'
  }

  return {
    host,
    port,
    user,
    password: cfg.dbPassword,
    database: cfg.database || 'postgres',
    ssl: { rejectUnauthorized: false },
  }
}

/**
 * @param {object} cfg
 */
async function testPostgresConnection(cfg) {
  const conn = resolvePostgresConnection(cfg)
  const knex = require('knex')({
    client: 'pg',
    connection: conn,
    pool: { min: 0, max: 1 },
  })
  try {
    await knex.raw('select 1 as ok')
    return { ok: true, host: conn.host, port: conn.port, user: conn.user }
  } catch (err) {
    const code = err?.code || ''
    const msg = String(err?.message || err || '')
    if (code === 'ENOTFOUND' || /getaddrinfo ENOTFOUND/i.test(msg)) {
      throw new Error(
        `Cannot resolve database host "${conn.host}". ` +
          'Check Project URL is exactly https://YOUR-REF.supabase.co (from Settings → API). ' +
          'If the URL is correct, some networks cannot reach db.*.supabase.co — open Settings → Database → ' +
          'Connection string → Session pooler, copy the Host into "Database host", and use port 5432.',
      )
    }
    if (/password authentication failed/i.test(msg)) {
      throw new Error(
        'Database password is incorrect. Use the password from Supabase → Settings → Database (not the anon key).',
      )
    }
    throw err
  } finally {
    await knex.destroy().catch(() => {})
  }
}

/**
 * Build config object from setup form payload (+ optional saved config).
 * @param {object} payload
 * @param {object | null} [prev]
 */
function mergeSupabasePayload(payload = {}, prev = null) {
  const parsedUri = parsePostgresConnectionString(payload.url || payload.connectionString)
  const url = String(
    parsedUri ? `https://${parsedUri.projectRef || prev?.projectRef || 'unknown'}.supabase.co` : payload.url || prev?.url || '',
  ).trim()
  const projectRef =
    extractProjectRef(url) ||
    extractProjectRef(payload.dbHost) ||
    parsedUri?.projectRef ||
    prev?.projectRef ||
    null

  const dbPassword =
    payload.dbPassword === undefined || String(payload.dbPassword).trim() === ''
      ? parsedUri?.password || prev?.dbPassword || ''
      : String(payload.dbPassword).trim()

  return {
    url,
    projectRef,
    dbHost: String(payload.dbHost || parsedUri?.host || prev?.dbHost || '').trim() || undefined,
    dbPort: payload.dbPort ?? parsedUri?.port ?? prev?.dbPort ?? undefined,
    dbUser: String(payload.dbUser || parsedUri?.user || prev?.dbUser || '').trim() || undefined,
    dbPassword,
    database: parsedUri?.database || prev?.database || 'postgres',
    anonKey:
      payload.anonKey === undefined || String(payload.anonKey).trim() === ''
        ? prev?.anonKey || ''
        : String(payload.anonKey).trim(),
    serviceRoleKey:
      payload.serviceRoleKey === undefined || String(payload.serviceRoleKey).trim() === ''
        ? prev?.serviceRoleKey || ''
        : String(payload.serviceRoleKey).trim(),
  }
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

function buildEncryptedRecord({ url, projectRef, database, secrets, dbHost, dbPort, dbUser }) {
  return {
    url,
    projectRef,
    database: database || 'postgres',
    ...(dbHost ? { dbHost } : {}),
    ...(dbPort ? { dbPort } : {}),
    ...(dbUser ? { dbUser } : {}),
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
  const prev = getSupabaseConfig(store)
  const merged = mergeSupabasePayload(payload, prev)

  if (!merged.url || !merged.dbPassword || !merged.projectRef) {
    throw new Error(
      'Supabase project URL and database password are required. URL must look like https://abcdefgh.supabase.co',
    )
  }

  store.set(
    'supabase_config',
    buildEncryptedRecord({
      url: merged.url.replace(/\/$/, ''),
      projectRef: merged.projectRef,
      dbHost: merged.dbHost,
      dbPort: merged.dbPort,
      dbUser: merged.dbUser,
      database: merged.database || 'postgres',
      secrets: {
        dbPassword: merged.dbPassword,
        anonKey: merged.anonKey,
        serviceRoleKey: merged.serviceRoleKey,
      },
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
    dbHost: saved.dbHost || undefined,
    dbPort: saved.dbPort || undefined,
    dbUser: saved.dbUser || undefined,
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
    dbHost: cfg.dbHost || '',
    dbPort: cfg.dbPort || 5432,
    dbUser: cfg.dbUser || '',
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
  return resolvePostgresConnection(cfg)
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
  parsePostgresConnectionString,
  resolvePostgresConnection,
  testPostgresConnection,
  mergeSupabasePayload,
  getSupabaseConfig,
  getSupabasePublicMeta,
  writeSupabaseStore,
  migrateSupabaseSecretsIfNeeded,
  isSupabaseConfigured,
  buildPostgresConnection,
  getSchemaSqlPaths,
}
