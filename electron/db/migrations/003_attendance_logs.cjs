/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('attendance_logs', (t) => {
    t.increments('id').primary()
    t.string('device_id')
    t.string('employee_device_id')
    t.integer('employee_id').unsigned().references('id').inTable('employees').onDelete('SET NULL').nullable()
    t.datetime('punch_time').notNullable()
    t.integer('punch_type')
    t.boolean('is_manual_override').defaultTo(false)
    t.text('override_reason')
    t.json('raw_data')
    t.unique(['device_id', 'employee_device_id', 'punch_time'])
    t.timestamps(true, true)
  })
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('attendance_logs')
}
