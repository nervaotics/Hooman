/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('leave_requests', (t) => {
    t.increments('id').primary()
    t.integer('employee_id').unsigned().references('id').inTable('employees').onDelete('CASCADE')
    t.string('leave_type')
    t.date('start_date')
    t.date('end_date')
    t.integer('days_count')
    t.text('reason')
    t.string('status').defaultTo('pending')
    t.integer('approved_by').unsigned()
    t.text('rejection_reason')
    t.timestamps(true, true)
  })
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('leave_requests')
}
