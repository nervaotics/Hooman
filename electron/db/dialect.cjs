/** @param {import('knex').Knex} knex */
function isPostgres(knex) {
  return knex?.client?.config?.client === 'pg'
}

/**
 * @param {import('knex').Knex} knex
 * @param {string} table
 * @param {Record<string, unknown>} row
 */
async function insertReturningId(knex, table, row) {
  const now = new Date()
  const payload = {
    ...row,
    created_at: row.created_at ?? now,
    updated_at: row.updated_at ?? now,
  }
  if (isPostgres(knex)) {
    const rows = await knex(table).insert(payload).returning('id')
    return rows[0]?.id
  }
  const [id] = await knex(table).insert(payload)
  return id
}

/**
 * @param {import('knex').Knex} knex
 */
async function upsertAttendanceLog(knex, row) {
  const {
    device_id: deviceId,
    employee_device_id: employeeDeviceId,
    employee_id: employeeId,
    punch_time: punchTime,
    punch_type: punchType,
    raw_data: rawData,
  } = row

  if (isPostgres(knex)) {
    const result = await knex.raw(
      `
      INSERT INTO attendance_logs
        (device_id, employee_device_id, employee_id, punch_time, punch_type, raw_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?::jsonb, NOW(), NOW())
      ON CONFLICT (device_id, employee_device_id, punch_time) DO NOTHING
      RETURNING id
      `,
      [
        deviceId,
        employeeDeviceId,
        employeeId,
        punchTime,
        punchType ?? 0,
        rawData ? JSON.stringify(rawData) : null,
      ],
    )
    return result.rows?.length > 0 ? 1 : 0
  }

  const q = `
    INSERT IGNORE INTO attendance_logs
    (device_id, employee_device_id, employee_id, punch_time, punch_type, raw_data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
  `
  const [result] = await knex.raw(q, [
    deviceId,
    employeeDeviceId,
    employeeId,
    punchTime,
    punchType ?? 0,
    typeof rawData === 'string' ? rawData : JSON.stringify(rawData ?? {}),
  ])
  return Number(result?.affectedRows ?? 0)
}

module.exports = { isPostgres, insertReturningId, upsertAttendanceLog }
