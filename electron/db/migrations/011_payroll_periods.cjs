/**
 * Full payroll schema aligned with web frontend (payroll_periods + payroll_records).
 * @param {import('knex').Knex} knex
 */
exports.up = async (knex) => {
  if (!(await knex.schema.hasTable('payroll_periods'))) {
    await knex.schema.createTable('payroll_periods', (t) => {
      t.increments('id').primary()
      t.string('period_name').notNullable()
      t.integer('period_month').notNullable()
      t.integer('period_year').notNullable()
      t.date('start_date').notNullable()
      t.date('end_date').notNullable()
      t.date('payroll_date').notNullable()
      t.string('status').defaultTo('Draft')
      t.integer('created_by').unsigned().nullable()
      t.timestamps(true, true)
    })
  }

  if (!(await knex.schema.hasTable('payroll_records'))) {
    await knex.schema.createTable('payroll_records', (t) => {
      t.increments('id').primary()
      t.integer('payroll_period_id').unsigned().notNullable()
        .references('id').inTable('payroll_periods').onDelete('CASCADE')
      t.integer('employee_id').unsigned().notNullable()
        .references('id').inTable('employees').onDelete('CASCADE')
      t.integer('salary_structure_id').unsigned().nullable()
        .references('id').inTable('salary_structure').onDelete('SET NULL')
      t.integer('basic_salary').defaultTo(0)
      t.integer('allowances').defaultTo(0)
      t.integer('gross_salary').defaultTo(0)
      t.integer('provident_fund').defaultTo(0)
      t.integer('income_tax').defaultTo(0)
      t.integer('leave_deduction').defaultTo(0)
      t.integer('working_days').defaultTo(26)
      t.integer('present_days').defaultTo(0)
      t.integer('leave_days').defaultTo(0)
      t.integer('net_salary').defaultTo(0)
      t.integer('total_deductions').defaultTo(0)
      t.integer('arrears').defaultTo(0)
      t.integer('deduction_amount').defaultTo(0)
      t.integer('other_deductions').defaultTo(0)
      t.integer('eobi_employee').defaultTo(0)
      t.integer('eobi_employer').defaultTo(0)
      t.integer('sessi_employer').defaultTo(0)
      t.string('status').defaultTo('Draft')
      t.timestamps(true, true)
      t.unique(['payroll_period_id', 'employee_id'])
    })
  }

  if (!(await knex.schema.hasTable('payroll_statutory_settings'))) {
    await knex.schema.createTable('payroll_statutory_settings', (t) => {
      t.integer('id').primary().defaultTo(1)
      t.integer('eobi_wage_ceiling_pkr').defaultTo(37000)
      t.integer('sessi_minimum_wage_pkr').defaultTo(40000)
      t.integer('sessi_maximum_wage_pkr').defaultTo(45000)
      t.timestamps(true, true)
    })
    await knex('payroll_statutory_settings').insert({
      id: 1,
      eobi_wage_ceiling_pkr: 37000,
      sessi_minimum_wage_pkr: 40000,
      sessi_maximum_wage_pkr: 45000,
      created_at: new Date(),
      updated_at: new Date(),
    })
  }
}

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('payroll_records')
  await knex.schema.dropTableIfExists('payroll_periods')
  await knex.schema.dropTableIfExists('payroll_statutory_settings')
}
