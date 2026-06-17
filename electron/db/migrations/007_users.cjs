/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary()
    t.integer('employee_id').unsigned().references('id').inTable('employees').onDelete('SET NULL').nullable()
    t.string('username').unique().notNullable()
    t.string('password_hash').notNullable()
    t.string('role').defaultTo('hr_staff')
    t.boolean('is_active').defaultTo(true)
    t.timestamp('last_login')
    t.timestamps(true, true)
  })
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('users')
}
