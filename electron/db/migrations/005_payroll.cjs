/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('payroll_runs', (t) => {
    t.increments('id').primary()
    t.string('period_month')
    t.string('status').defaultTo('draft')
    t.integer('processed_by').unsigned()
    t.timestamps(true, true)
  })

  await knex.schema.createTable('payroll_slips', (t) => {
    t.increments('id').primary()
    t.integer('payroll_run_id').unsigned().references('id').inTable('payroll_runs').onDelete('CASCADE')
    t.integer('employee_id').unsigned().references('id').inTable('employees').onDelete('CASCADE')
    t.decimal('basic_salary', 12, 2)
    t.decimal('allowances', 12, 2).defaultTo(0)
    t.decimal('overtime_amount', 12, 2).defaultTo(0)
    t.decimal('deductions', 12, 2).defaultTo(0)
    t.decimal('tax', 12, 2).defaultTo(0)
    t.decimal('net_salary', 12, 2)
    t.integer('days_present')
    t.integer('days_absent')
    t.integer('leaves_taken')
    t.json('breakdown')
    t.timestamps(true, true)
  })
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('payroll_slips')
  await knex.schema.dropTableIfExists('payroll_runs')
}
