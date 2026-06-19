const path = require('path')
const { app } = require('electron')
const Database = require('better-sqlite3')

let db = null

function getOutboxPath() {
  return path.join(app.getPath('userData'), 'attendance-outbox.db')
}

function getOutboxDb() {
  if (db) return db
  db = new Database(getOutboxPath())
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT,
      employee_device_id TEXT,
      employee_id INTEGER,
      punch_time TEXT NOT NULL,
      punch_type INTEGER,
      raw_data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_outbox_unsynced ON attendance_outbox(synced_at) WHERE synced_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_unique
      ON attendance_outbox(device_id, employee_device_id, punch_time);
  `)
  return db
}

function enqueuePunch(row) {
  const conn = getOutboxDb()
  const stmt = conn.prepare(`
    INSERT OR IGNORE INTO attendance_outbox
      (device_id, employee_device_id, employee_id, punch_time, punch_type, raw_data)
    VALUES (@device_id, @employee_device_id, @employee_id, @punch_time, @punch_type, @raw_data)
  `)
  const info = stmt.run({
    device_id: row.device_id ?? null,
    employee_device_id: row.employee_device_id ?? null,
    employee_id: row.employee_id ?? null,
    punch_time:
      row.punch_time instanceof Date
        ? row.punch_time.toISOString()
        : String(row.punch_time),
    punch_type: row.punch_type ?? 0,
    raw_data:
      typeof row.raw_data === 'string' ? row.raw_data : JSON.stringify(row.raw_data ?? {}),
  })
  return info.changes > 0
}

function listPending(limit = 500) {
  const conn = getOutboxDb()
  return conn
    .prepare(
      `SELECT * FROM attendance_outbox WHERE synced_at IS NULL ORDER BY id ASC LIMIT ?`,
    )
    .all(limit)
}

function markSynced(ids) {
  if (!ids?.length) return
  const conn = getOutboxDb()
  const placeholders = ids.map(() => '?').join(',')
  conn.prepare(
    `UPDATE attendance_outbox SET synced_at = datetime('now') WHERE id IN (${placeholders})`,
  ).run(...ids)
}

function pendingCount() {
  const conn = getOutboxDb()
  const row = conn
    .prepare(`SELECT COUNT(*) AS cnt FROM attendance_outbox WHERE synced_at IS NULL`)
    .get()
  return Number(row?.cnt ?? 0)
}

function closeOutbox() {
  if (db) {
    db.close()
    db = null
  }
}

module.exports = {
  enqueuePunch,
  listPending,
  markSynced,
  pendingCount,
  closeOutbox,
}
