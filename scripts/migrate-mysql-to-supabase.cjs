#!/usr/bin/env node
/**
 * One-time migration: MySQL (legacy Hooman) → Supabase Postgres.
 *
 * Usage:
 *   node scripts/migrate-mysql-to-supabase.cjs
 *
 * Environment:
 *   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASS, MYSQL_DB
 *   SUPABASE_PROJECT_REF  (e.g. abcdefghijklmnop)
 *   SUPABASE_DB_PASSWORD
 *
 * Or pass --mysql-host=... --supabase-ref=... etc.
 */
require('dotenv').config()

const knex = require('knex')

function arg(name, envKey, fallback = '') {
  const flag = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (flag) return flag.split('=').slice(1).join('=')
  return process.env[envKey] ?? fallback
}

const TABLES = [
  'departments',
  'areas',
  'employees',
  'users',
  'employee_postings',
  'employment_history',
  'salary_structure',
  'attendance_logs',
  'payroll_statutory_settings',
  'payroll_periods',
  'payroll_records',
  'coa_accounts',
  'journal_vouchers',
  'journal_entries',
  'job_postings',
  'applicants',
]

function normalizeRow(table, row) {
  const out = { ...row }
  if (table === 'users' && typeof out.permissions === 'string') {
    try {
      out.permissions = JSON.parse(out.permissions)
    } catch {
      out.permissions = null
    }
  }
  if (table === 'attendance_logs' && out.raw_data && typeof out.raw_data === 'string') {
    try {
      out.raw_data = JSON.parse(out.raw_data)
    } catch {
      out.raw_data = {}
    }
  }
  if (out.is_deleted !== undefined) out.is_deleted = Boolean(out.is_deleted)
  if (out.is_active !== undefined) out.is_active = Boolean(out.is_active)
  if (out.is_current !== undefined) out.is_current = Boolean(out.is_current)
  if (out.is_manual_override !== undefined) {
    out.is_manual_override = Boolean(out.is_manual_override)
  }
  return out
}

async function main() {
  const mysqlHost = arg('mysql-host', 'MYSQL_HOST', '127.0.0.1')
  const mysqlPort = Number(arg('mysql-port', 'MYSQL_PORT', '3306'))
  const mysqlUser = arg('mysql-user', 'MYSQL_USER', 'root')
  const mysqlPass = arg('mysql-pass', 'MYSQL_PASS', '')
  const mysqlDb = arg('mysql-db', 'MYSQL_DB', 'hooman_hrm')
  const projectRef = arg('supabase-ref', 'SUPABASE_PROJECT_REF', '')
  const pgPassword = arg('supabase-db-password', 'SUPABASE_DB_PASSWORD', '')

  if (!projectRef || !pgPassword) {
    console.error('Set SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD (or use --flags).')
    process.exit(1)
  }

  const mysql = knex({
    client: 'mysql2',
    connection: {
      host: mysqlHost,
      port: mysqlPort,
      user: mysqlUser,
      password: mysqlPass,
      database: mysqlDb,
      timezone: 'Z',
    },
  })

  const pg = knex({
    client: 'pg',
    connection: {
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      user: 'postgres',
      password: pgPassword,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    },
  })

  try {
    await mysql.raw('select 1')
    await pg.raw('select 1')
    console.log('[migrate] Connected to MySQL and Supabase')

    for (const table of TABLES) {
      const has = await mysql.schema.hasTable(table)
      if (!has) {
        console.log(`[migrate] skip ${table} (not in MySQL)`)
        continue
      }

      const rows = await mysql(table).select('*')
      if (!rows.length) {
        console.log(`[migrate] ${table}: 0 rows`)
        continue
      }

      const pgHas = await pg.schema.hasTable(table)
      if (!pgHas) {
        console.warn(`[migrate] ${table}: missing in Postgres — run supabase/migrations first`)
        continue
      }

      const batch = rows.map((r) => normalizeRow(table, r))
      const chunkSize = 100
      let inserted = 0

      for (let i = 0; i < batch.length; i += chunkSize) {
        const chunk = batch.slice(i, i + chunkSize)
        await pg(table).insert(chunk).onConflict('id').ignore()
        inserted += chunk.length
      }

      console.log(`[migrate] ${table}: ${inserted} rows`)
    }

    for (const table of TABLES) {
      await pg.raw(
        `SELECT setval(pg_get_serial_sequence(?, 'id'), COALESCE((SELECT MAX(id) FROM ??), 1), true)`,
        [table, table],
      ).catch(() => {})
    }

    console.log('[migrate] Done. Verify row counts in Supabase dashboard.')
  } finally {
    await mysql.destroy().catch(() => {})
    await pg.destroy().catch(() => {})
  }
}

main().catch((err) => {
  console.error('[migrate] Failed:', err.message)
  process.exit(1)
})
