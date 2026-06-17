require('dotenv').config()

const path = require('path')

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
      directory: path.join(__dirname, 'migrations'),
    },
  })
}

let knexSingleton = null
let knexSignature = ''

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
}

/**
 * @param {import('electron-store')} store
 */
async function runMigrations(store) {
  const k = getOrCreateKnex(store)
  await k.migrate.latest()
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
  runMigrations,
  pingDatabase,
}
