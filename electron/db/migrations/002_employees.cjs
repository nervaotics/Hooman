/**
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  await knex.schema.createTable('employees', (t) => {
    t.increments('id').primary()
    t.string('employee_code').unique().notNullable()
    t.string('first_name').notNullable()
    t.string('last_name').notNullable()
    t.string('cnic').unique()
    t.string('email').unique()
    t.string('phone')
    t.string('photo_url')
    t.integer('department_id').unsigned().references('id').inTable('departments').onDelete('SET NULL').nullable()
    t.integer('designation_id').unsigned()
    t.string('employment_type').defaultTo('full-time')
    t.string('status').defaultTo('active')
    t.date('date_of_joining')
    t.date('date_of_birth')
    t.string('gender')
    t.string('blood_group')
    t.text('address')
    t.string('emergency_contact_name')
    t.string('emergency_contact_phone')
    t.decimal('basic_salary', 12, 2)
    t.integer('reporting_manager_id').unsigned()
    t.timestamps(true, true)
  })
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('employees')
}
